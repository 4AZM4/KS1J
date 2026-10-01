// KS1J helpdesk (Supabase Edge Function, Deno).
//
// 1. A question asking for a religious ruling goes to the Marja' / the Jamaat's alim. No answer is given.
// 2. Otherwise, search the Jamaat-approved help texts (public.search_help, which RLS limits to approved texts).
// 3. Nothing relevant → "I don't know that yet."
// 4. With ANTHROPIC_API_KEY set: Claude answers using ONLY those texts and cites them as [1], [2]...
//    Without it: return the most relevant approved passages, so the helpdesk still works.
// Every question is logged without the member's identity, so the committee can see what to add.
// Signed-in members only, checked below, so the AI cost cannot be run up by anyone on the internet.
//
// Secrets (set in Supabase, never in the apps): ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase.

// Mirrors RULING_WORDS in packages/shared/src/helpdesk.ts. Change both together.
const RULING_WORDS = [
  'halal', 'haram', 'makrooh', 'makruh', 'mustahab', 'wajib', 'mubah', 'najis', 'tahir',
  'fatwa', 'ruling', 'permissible', 'is it allowed', 'is it permitted', 'is it sinful', 'sin to',
  'liable to khums', 'khums on', 'khums due on', 'do i owe khums', 'should i pay khums on',
  'valid namaz', 'valid salaat', 'valid prayer', 'invalidate', 'kaffara', 'qadha', 'qaza',
];
const UNKNOWN = "I don't know that yet. Please contact the Jamaat office.";
const RULING =
  "That needs a religious ruling, which this helpdesk cannot give. Please ask your Marja' or the Jamaat's alim.";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function isRulingQuestion(question: string) {
  const q = ` ${question.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ')} `;
  return RULING_WORDS.some((w) => q.includes(` ${w} `) || q.includes(` ${w}`));
}

type Row = { document_id: string; title: string; source_ref: string; heading: string | null; body: string };

async function rpc(name: string, args: unknown, auth: string | null) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_ANON_KEY')!;
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      // Forward a signed-in member's session token; publishable keys are not JWTs and go in apikey only.
      ...(auth && /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth) ? { Authorization: auth } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function askClaude(question: string, rows: Row[]): Promise<string> {
  const sources = rows
    .map((r, i) => `[${i + 1}] ${r.title}${r.heading ? ` — ${r.heading}` : ''} (${r.source_ref})\n${r.body}`)
    .join('\n\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5',
      max_tokens: 500,
      system:
        "You are the KS1J helpdesk for KSI Jamaat Mumbai members, many of them elderly. Answer ONLY from the numbered sources provided. " +
        'Cite every fact with its source number in square brackets, like [1]. Use short sentences and plain words. ' +
        "If the sources do not answer the question, reply with exactly: I don't know that yet. " +
        "Never give a religious ruling or opinion; if asked for one, say to ask their Marja' or the Jamaat's alim. " +
        'Never invent amounts, dates, names or policies that are not in the sources.',
      messages: [{ role: 'user', content: `Sources:\n\n${sources}\n\nQuestion: ${question}` }],
    }),
  });
  if (!res.ok) throw new Error(`Claude request failed: ${res.status}`);
  const data = await res.json();
  return (data.content ?? []).map((c: { type: string; text?: string }) => (c.type === 'text' ? c.text : '')).join('').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let question = '';
  try {
    question = String((await req.json()).question ?? '').trim();
  } catch {
    return json({ error: 'Send JSON: { "question": "..." }' }, 400);
  }
  if (question.length < 3 || question.length > 500) return json({ error: 'Ask a question of 3 to 500 characters.' }, 400);

  // Members only: the token must be a real, current session. Searches then run with their permissions.
  const auth = req.headers.get('Authorization');
  if (!auth || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return json({ error: 'Sign in to use the helpdesk.' }, 401);
  const who = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, Authorization: auth },
  });
  if (!who.ok) return json({ error: 'Sign in to use the helpdesk.' }, 401);

  try {
    if (isRulingQuestion(question)) {
      await rpc('log_helpdesk_question', { p_question: question, p_outcome: 'ruling', p_document_ids: [] }, auth);
      return json({ outcome: 'ruling', answer: RULING, sources: [] });
    }

    const rows: Row[] = (await rpc('search_help', { q: question, max_results: 4 }, auth)) ?? [];
    const docIds = [...new Set(rows.map((r) => r.document_id))];
    const sources = rows.map((r, i) => ({
      n: i + 1,
      title: r.title,
      sourceRef: r.source_ref,
      heading: r.heading,
      excerpt: r.body.length > 420 ? `${r.body.slice(0, 420)}…` : r.body,
    }));

    if (rows.length === 0) {
      await rpc('log_helpdesk_question', { p_question: question, p_outcome: 'unknown', p_document_ids: [] }, auth);
      return json({ outcome: 'unknown', answer: UNKNOWN, sources: [] });
    }

    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      await rpc('log_helpdesk_question', { p_question: question, p_outcome: 'passages', p_document_ids: docIds }, auth);
      return json({ outcome: 'passages', answer: null, sources });
    }

    const answer = await askClaude(question, rows);
    if (!answer || /^i don'?t know that yet/i.test(answer) || !/\[\d+\]/.test(answer)) {
      // No citation means the answer did not come from the sources: say so rather than guess.
      await rpc('log_helpdesk_question', { p_question: question, p_outcome: 'unknown', p_document_ids: docIds }, auth);
      return json({ outcome: 'unknown', answer: UNKNOWN, sources: [] });
    }
    const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    await rpc('log_helpdesk_question', { p_question: question, p_outcome: 'answered', p_document_ids: docIds }, auth);
    return json({ outcome: 'answered', answer, sources: sources.filter((s) => cited.has(s.n)) });
  } catch (e) {
    console.error(e);
    return json({ error: 'The helpdesk is not available right now. Please try again or contact the Jamaat office.' }, 500);
  }
});

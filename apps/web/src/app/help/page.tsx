"use client";

import Link from "next/link";
import { useState } from "react";
import { HELPDESK_EXAMPLES, HELPDESK_RULING, isRulingQuestion, type HelpdeskReply } from "@ks1j/shared";
import { useAuth } from "@/components/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, Card, inputClass } from "@/components/ui";
import { errorMessage, supabase } from "@/lib/supabase";

/** The same helpdesk as the app: answers only from Jamaat-approved texts, with the source shown. */
export default function HelpPage() {
  const { session, loading } = useAuth();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [reply, setReply] = useState<HelpdeskReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setBusy(true);
    setError(null);
    setReply(null);
    setAsked(text);
    try {
      // Rulings are redirected straight away (the server checks again).
      if (isRulingQuestion(text)) {
        setReply({ outcome: "ruling", answer: HELPDESK_RULING, sources: [] });
      } else {
        const { data, error } = await supabase().functions.invoke<HelpdeskReply>("helpdesk", { body: { question: text } });
        if (error) throw error;
        setReply(data);
      }
      setQuestion("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Jamaat helpdesk</h1>
        <p className="mt-2 text-lg text-muted">
          Answers come only from texts the Jamaat has approved, with the source shown. If the texts do not say, it tells
          you so. It never gives religious rulings.
        </p>

        {loading ? null : !session ? (
          <Card className="mt-6">
            <p className="text-lg">The helpdesk is for Jamaat members. Sign in to ask a question.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/login?next=%2Fhelp" className="min-h-12 rounded-xl bg-deep px-5 py-3 text-base font-bold text-white">Sign in</Link>
              <Link href="/signup" className="min-h-12 rounded-xl border border-border px-5 py-3 text-base font-bold">Create an account</Link>
            </div>
          </Card>
        ) : (
          <>
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(question);
              }}
            >
              <label htmlFor="q" className="block text-base font-semibold">Your question</label>
              <textarea id="q" rows={3} maxLength={500} className={`${inputClass} mt-2 text-lg`} value={question}
                placeholder="For example: when does my loan repayment start?" onChange={(e) => setQuestion(e.target.value)} />
              <button type="submit" disabled={busy || question.trim().length < 3}
                className="mt-3 min-h-12 rounded-xl bg-deep px-6 py-3 text-lg font-bold text-white disabled:opacity-50">
                {busy ? "Looking…" : "Ask"}
              </button>
            </form>

            {!reply && !busy ? (
              <div className="mt-6">
                <p className="text-base font-semibold">Or try</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HELPDESK_EXAMPLES.map((q) => (
                    <button key={q} onClick={() => void ask(q)}
                      className="min-h-12 rounded-xl border border-border bg-card px-4 py-2 text-left text-base hover:border-brand">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <div className="mt-6"><Alert>{error}</Alert></div> : null}

            {reply ? (
              <section className="mt-8" aria-live="polite">
                <p className="text-base text-muted">You asked: {asked}</p>
                {reply.outcome === "answered" ? (
                  <Card className="mt-3"><p className="whitespace-pre-line text-lg">{reply.answer}</p></Card>
                ) : reply.outcome === "passages" ? (
                  <p className="mt-3 text-lg">Here is what the Jamaat&apos;s approved texts say:</p>
                ) : (
                  <p className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-lg">{reply.answer}</p>
                )}
                {reply.sources.length > 0 ? (
                  <>
                    <h2 className="mt-6 text-xl font-bold">{reply.outcome === "answered" ? "Sources" : "From the texts"}</h2>
                    <ul className="mt-2 space-y-3">
                      {reply.sources.map((s) => (
                        <li key={s.n} className="rounded-xl border border-border p-4">
                          <p className="font-semibold">[{s.n}] {s.title}{s.heading ? `: ${s.heading}` : ""}</p>
                          {reply.outcome === "passages" ? <p className="mt-1 text-base">{s.excerpt}</p> : null}
                          <p className="mt-1 text-sm text-muted">{s.sourceRef}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <button onClick={() => setReply(null)}
                  className="mt-6 min-h-12 rounded-xl border border-border bg-card px-5 py-3 text-base font-semibold">
                  Ask another question
                </button>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Alert, Badge, Button, Card, inputClass } from "@/components/ui";

type Doc = Tables<"kb_documents"> & {
  kb_chunks: Pick<Tables<"kb_chunks">, "id" | "heading" | "body" | "position">[];
  adder: { full_name: string } | null;
  approver: { full_name: string } | null;
};
type Question = Tables<"helpdesk_questions">;

const OUTCOME: Record<string, { label: string; tone: "good" | "warn" | "neutral" }> = {
  answered: { label: "Answered", tone: "good" },
  passages: { label: "Showed texts", tone: "good" },
  unknown: { label: "Didn't know", tone: "warn" },
  ruling: { label: "Sent to alim", tone: "neutral" },
};

/** The helpdesk answers only from these texts. One trustee adds, a different trustee approves. */
export default function HelpdeskAdminPage() {
  const { session, hasRole } = useAuth();
  const isTrustee = hasRole("trustee");
  const me = session?.user.id;
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = supabase();
    const [d, q] = await Promise.all([
      db
        .from("kb_documents")
        .select(
          "*, kb_chunks(id, heading, body, position), adder:members!kb_documents_added_by_fkey(full_name), approver:members!kb_documents_approved_by_fkey(full_name)",
        )
        .order("created_at", { ascending: false }),
      db.from("helpdesk_questions").select("*").order("asked_at", { ascending: false }).limit(200),
    ]);
    if (d.error) setError(errorMessage(d.error));
    setDocs((d.data ?? []) as unknown as Doc[]);
    setQuestions(q.data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const done = (msg: string) => {
    setNotice(msg);
    setError(null);
    void load();
  };
  const fail = (e: unknown) => {
    setError(errorMessage(e));
    setNotice(null);
  };

  async function setStatus(d: Doc, status: "approved" | "retired") {
    const { error } = await supabase().from("kb_documents").update({ status }).eq("id", d.id);
    if (error) return fail(error);
    done(status === "approved" ? `"${d.title}" approved. The helpdesk now answers from it.` : `"${d.title}" retired.`);
  }

  const counts = questions.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.outcome]: (acc[q.outcome] ?? 0) + 1 }), {});
  const gaps = questions.filter((q) => q.outcome === "unknown");

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Helpdesk</h1>
        <p className="mt-1 text-muted">
          Members&apos; questions are answered only from approved texts below, with the source shown. Questions asking
          for a religious ruling are sent to the Marja&apos; or the Jamaat&apos;s alim. Only add texts the Jamaat owns or
          has permission to use.
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

      <section>
        <h2 className="text-lg font-semibold">Questions asked</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {Object.entries(OUTCOME).map(([k, o]) => (
            <Card key={k}>
              <p className="text-3xl font-bold">{counts[k] ?? 0}</p>
              <p className="mt-1 text-sm text-muted">{o.label}</p>
            </Card>
          ))}
        </div>
        {gaps.length > 0 ? (
          <div className="mt-4">
            <p className="font-semibold">Questions the helpdesk could not answer</p>
            <p className="text-sm text-muted">Consider adding an approved text that covers them. No names are stored with questions.</p>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {gaps.slice(0, 20).map((q) => (
                <li key={q.id} className="flex justify-between gap-4 py-2 text-sm">
                  <span>{q.question}</span>
                  <span className="shrink-0 text-muted">{formatDate(q.asked_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {isTrustee ? <AddDocument onDone={done} onError={fail} /> : null}

      <section>
        <h2 className="text-lg font-semibold">Texts</h2>
        <ul className="mt-3 space-y-3">
          {(docs ?? []).map((d) => (
            <li key={d.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{d.title}</p>
                    <p className="text-sm text-muted">{d.source_ref}</p>
                  </div>
                  <Badge tone={d.status === "approved" ? "good" : d.status === "draft" ? "warn" : "neutral"}>
                    {d.status === "approved" ? "Approved" : d.status === "draft" ? "Draft" : "Retired"}
                  </Badge>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-brand">
                    {d.kb_chunks.length} section{d.kb_chunks.length === 1 ? "" : "s"}
                  </summary>
                  <div className="mt-2 space-y-3">
                    {[...d.kb_chunks]
                      .sort((a, b) => a.position - b.position)
                      .map((c) => (
                        <div key={c.id} className="border-l-2 border-border pl-3 text-sm">
                          {c.heading ? <p className="font-semibold">{c.heading}</p> : null}
                          <p className="whitespace-pre-line">{c.body}</p>
                        </div>
                      ))}
                  </div>
                </details>
                <p className="mt-2 text-xs text-muted">
                  {d.adder ? `Added by ${d.adder.full_name}. ` : ""}
                  {d.approver ? `Approved by ${d.approver.full_name} on ${formatDate(d.approved_at)}.` : ""}
                </p>
                {isTrustee ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.status === "draft" ? (
                      <Button disabled={d.added_by === me} onClick={() => setStatus(d, "approved")}>
                        {d.added_by === me ? "Another trustee must approve" : "I checked it: approve"}
                      </Button>
                    ) : null}
                    {d.status !== "retired" ? (
                      <Button variant="secondary" onClick={() => setStatus(d, "retired")}>
                        Retire
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AddDocument({ onDone, onError }: { onDone: (m: string) => void; onError: (e: unknown) => void }) {
  const [title, setTitle] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [sections, setSections] = useState([{ heading: "", body: "" }]);
  const [busy, setBusy] = useState(false);
  const ready = title.trim().length >= 3 && sourceRef.trim().length >= 3 && sections.some((s) => s.body.trim());

  async function save() {
    setBusy(true);
    try {
      const db = supabase();
      const { data, error } = await db
        .from("kb_documents")
        .insert({ title: title.trim(), source_ref: sourceRef.trim() })
        .select("id")
        .single();
      if (error) throw error;
      const rows = sections
        .filter((s) => s.body.trim())
        .map((s, i) => ({ document_id: data.id, position: i + 1, heading: s.heading.trim() || null, body: s.body.trim() }));
      const { error: e2 } = await db.from("kb_chunks").insert(rows);
      if (e2) throw e2;
      setTitle("");
      setSourceRef("");
      setSections([{ heading: "", body: "" }]);
      onDone("Draft saved. A different trustee needs to approve it before the helpdesk uses it.");
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Add a text</h2>
      <p className="text-sm text-muted">Split it into short sections, one topic each. Sections cannot be changed after approval.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Title</span>
          <input className={inputClass} value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Where it comes from</span>
          <input
            className={inputClass}
            placeholder="e.g. Jamaat office circular, March 2026"
            value={sourceRef}
            maxLength={200}
            onChange={(e) => setSourceRef(e.target.value)}
          />
        </label>
      </div>
      {sections.map((s, i) => (
        <div key={i} className="mt-3 rounded-xl border border-border p-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Section {i + 1} heading</span>
            <input
              className={inputClass}
              value={s.heading}
              maxLength={200}
              onChange={(e) => setSections((all) => all.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))}
            />
          </label>
          <label className="mt-2 block text-sm">
            <span className="mb-1 block text-muted">Text</span>
            <textarea
              className={`${inputClass} min-h-28`}
              value={s.body}
              maxLength={6000}
              onChange={(e) => setSections((all) => all.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
            />
          </label>
        </div>
      ))}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setSections((all) => [...all, { heading: "", body: "" }])}>
          Add another section
        </Button>
        <Button disabled={busy || !ready} onClick={save}>
          Save draft
        </Button>
      </div>
    </Card>
  );
}

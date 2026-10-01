"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDate, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Alert, Badge, Button, Card } from "@/components/ui";

type CaseRef = { case_no: number; title: string; status: string; applicant: { full_name: string } | null } | null;
type Flag = Tables<"fraud_flags"> & {
  case: CaseRef;
  matched: CaseRef;
  reviewer: { full_name: string } | null;
};

/** Rules and AI only flag. A verifier looks at both cases and decides. */
export default function FlagsPage() {
  const { hasRole } = useAuth();
  const canReview = hasRole("verifier");
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const caseCols = "case_no, title, status, applicant:members!cases_applicant_id_fkey(full_name)";
    const { data, error } = await supabase()
      .from("fraud_flags")
      .select(
        `*, case:cases!fraud_flags_case_id_fkey(${caseCols}), matched:cases!fraud_flags_matched_case_id_fkey(${caseCols}), reviewer:members!fraud_flags_reviewed_by_fkey(full_name)`,
      )
      .order("created_at", { ascending: false });
    if (error) setError(errorMessage(error));
    setFlags((data ?? []) as unknown as Flag[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function decide(f: Flag, status: "cleared" | "confirmed") {
    const { error } = await supabase().from("fraud_flags").update({ status }).eq("id", f.id);
    if (error) return setError(errorMessage(error));
    setError(null);
    setNotice(status === "cleared" ? "Flag cleared: the case continues as normal." : "Flag confirmed. Reject or close the case from its page.");
    void load();
  }

  const shown = (flags ?? []).filter((f) => showAll || f.status === "open");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fraud flags</h1>
        <p className="mt-1 text-muted">
          Raised automatically when the same person or household already has an open case. A flag is a question, not a
          verdict: a verifier compares the cases and decides.
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        Show reviewed flags too
      </label>

      {flags !== null && shown.length === 0 ? <p className="text-muted">No open flags.</p> : null}
      <ul className="space-y-3">
        {shown.map((f) => (
          <li key={f.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{f.reason}</p>
                <Badge tone={f.status === "open" ? "warn" : f.status === "confirmed" ? "bad" : "good"}>
                  {f.status === "open" ? "Open" : f.status === "confirmed" ? "Confirmed" : "Cleared"}
                </Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <CaseBox label="New case" c={f.case} id={f.case_id} />
                {f.matched_case_id ? <CaseBox label="Matches" c={f.matched} id={f.matched_case_id} /> : null}
              </div>
              <p className="mt-3 text-sm text-muted">
                Raised {formatDate(f.created_at)}
                {f.reviewer ? `. Reviewed by ${f.reviewer.full_name} on ${formatDate(f.reviewed_at)}` : ""}
              </p>
              {canReview && f.status === "open" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => decide(f, "cleared")}>Not a problem: clear</Button>
                  <Button variant="danger" onClick={() => decide(f, "confirmed")}>
                    Confirm duplicate
                  </Button>
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CaseBox({ label, c, id }: { label: string; c: CaseRef; id: string }) {
  return (
    <div className="rounded-xl border border-border p-3 text-sm">
      <p className="text-muted">{label}</p>
      {c ? (
        <Link href={`/admin/cases/view?id=${id}`} className="font-semibold text-brand underline">
          #{c.case_no} {c.title}
        </Link>
      ) : (
        <p>—</p>
      )}
      {c?.applicant ? <p className="text-muted">{c.applicant.full_name}</p> : null}
    </div>
  );
}

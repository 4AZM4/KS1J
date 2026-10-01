"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CASE_TYPE_LABEL, CATEGORY_LABEL, STATUS_LABEL, rupees, type CaseStatus, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { Alert, Badge } from "@/components/ui";

type Row = Tables<"cases"> & { applicant: { full_name: string } | null };

const TABS: { key: string; label: string; statuses: CaseStatus[] }[] = [
  { key: "verify", label: "To verify", statuses: ["submitted"] },
  { key: "approve", label: "To approve", statuses: ["verified"] },
  { key: "publish", label: "To publish", statuses: ["approved"] },
  { key: "live", label: "Live", statuses: ["published", "funded"] },
  { key: "payout", label: "Paid out", statuses: ["disbursed"] },
  { key: "done", label: "Closed / not approved", statuses: ["closed", "rejected"] },
];

export default function CasesPage() {
  const [tab, setTab] = useState(TABS[0].key);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = supabase();
    db.from("cases")
      .select("*, applicant:members!cases_applicant_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => (error ? setError(errorMessage(error)) : setRows((data ?? []) as unknown as Row[])));
    db.from("fraud_flags")
      .select("case_id")
      .eq("status", "open")
      .then(({ data }) => setFlags(new Set((data ?? []).map((f) => f.case_id))));
  }, []);

  const current = TABS.find((t) => t.key === tab)!;
  const shown = (rows ?? []).filter((r) => current.statuses.includes(r.status));

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Cases</h1>
      <p className="mt-1 text-muted">Every case needs a verifier and a different trustee before donors see it.</p>

      <div role="tablist" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = (rows ?? []).filter((r) => t.statuses.includes(r.status)).length;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1.5 text-sm ${tab === t.key ? "border-brand bg-card font-semibold text-brand" : "border-border"}`}
            >
              {t.label} <span className="text-muted">({n})</span>
            </button>
          );
        })}
      </div>

      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
      {rows === null && !error ? <p className="mt-6 text-muted">Loading…</p> : null}
      {rows !== null && shown.length === 0 ? <p className="mt-6 text-muted">Nothing here right now.</p> : null}

      {shown.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Case</th>
                <th className="px-4 py-3 font-semibold">Applicant</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-brand underline" href={`/admin/cases/${r.id}`}>
                      #{r.case_no} {r.title}
                    </Link>
                    {flags.has(r.id) ? <span className="ml-2"><Badge tone="warn">Flagged</Badge></span> : null}
                  </td>
                  <td className="px-4 py-3">{r.applicant?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{CASE_TYPE_LABEL[r.type]}</td>
                  <td className="px-4 py-3">{CATEGORY_LABEL[r.category]}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "published" || r.status === "funded"
                      ? `${rupees(r.raised_amount)} of ${rupees(r.target_amount)}`
                      : rupees(r.requested_amount)}
                  </td>
                  <td className="px-4 py-3"><Badge>{STATUS_LABEL[r.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FUND_LABEL, rupees, type CaseStatus, type FundType } from "@ks1j/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Card } from "@/components/ui";

type Counts = {
  cases: Partial<Record<CaseStatus, number>> | null;
  members: number | null;
  flags: number | null;
  overdue: number | null;
  hardship: number | null;
  lawajamDue: number | null;
  funds: Partial<Record<FundType, number>> | null;
};

const QUEUES: { label: string; statuses: CaseStatus[]; href: string; who: string }[] = [
  { label: "To verify", statuses: ["submitted"], href: "/admin/cases", who: "Verifier" },
  { label: "To approve", statuses: ["verified"], href: "/admin/cases", who: "Trustee" },
  { label: "To publish", statuses: ["approved"], href: "/admin/cases", who: "Trustee" },
  { label: "Live for donors", statuses: ["published"], href: "/admin/cases", who: "" },
  { label: "Funded, to pay out", statuses: ["funded"], href: "/admin/cases", who: "Finance" },
];

const rules = [
  "No case reaches donors until a verifier and a different trustee have both approved it.",
  "Sehme Sadaat goes only to verified Sadaat cases. Sehme Imam goes only to institutions with a verified ijazah.",
  "Every fund has its own ledger. Nothing is edited; corrections are new reversing entries.",
  "AI only flags and suggests. A person always approves, rejects or pays.",
];

/** Totals only: no beneficiary names on this page. Each count is hidden if your role cannot see it. */
export default function AdminOverview() {
  const { member, roles, hasRole } = useAuth();
  const [c, setC] = useState<Counts>({
    cases: null,
    members: null,
    flags: null,
    overdue: null,
    hardship: null,
    lawajamDue: null,
    funds: null,
  });

  useEffect(() => {
    const db = supabase();
    void Promise.all([
      db.from("cases").select("status"),
      db.from("members").select("id", { count: "exact", head: true }).eq("membership_verified", false),
      db.from("fraud_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
      db.rpc("loan_followup_list"),
      db.from("loan_hardship_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("lawajam_dues").select("amount").eq("status", "pending"),
      db.from("ledger_entries").select("fund, amount"),
    ]).then(([cases, members, flags, follow, hardship, dues, ledger]) => {
      const byStatus: Partial<Record<CaseStatus, number>> = {};
      for (const r of cases.data ?? []) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      const funds: Partial<Record<FundType, number>> = {};
      for (const e of ledger.data ?? []) funds[e.fund] = (funds[e.fund] ?? 0) + e.amount;
      setC({
        cases: cases.error ? null : byStatus,
        members: members.error ? null : (members.count ?? 0),
        flags: flags.error ? null : (flags.count ?? 0),
        overdue: follow.error ? null : (follow.data ?? []).filter((r) => r.days_late >= 15).length,
        hardship: hardship.error ? null : (hardship.count ?? 0),
        lawajamDue: dues.error ? null : (dues.data ?? []).reduce((s, d) => s + d.amount, 0),
        funds: ledger.error || (ledger.data ?? []).length === 0 ? null : funds,
      });
    });
  }, []);

  const count = (statuses: CaseStatus[]) => statuses.reduce((s, st) => s + (c.cases?.[st] ?? 0), 0);

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Salaam{member ? `, ${member.full_name.replace(/\s*\(demo\)/, "")}` : ""}</h1>
        <p className="mt-1 text-muted">
          What is waiting for the committee today. {roles.length ? "You see what your role allows." : ""}
        </p>
      </div>

      {c.cases ? (
        <section>
          <h2 className="text-lg font-semibold">Cases</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            {QUEUES.map((q) => (
              <Link key={q.label} href={q.href} className="rounded-2xl border border-border bg-card p-4 shadow-soft hover:border-brand">
                <p className="text-3xl font-bold">{count(q.statuses)}</p>
                <p className="mt-1 font-semibold">{q.label}</p>
                {q.who ? <p className="text-sm text-muted">{q.who}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Needs attention</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {c.members !== null ? <Stat href="/admin/members" value={c.members} label="New members to verify" /> : null}
          {c.flags !== null && (hasRole("verifier") || hasRole("trustee")) ? <Stat href="/admin/flags" value={c.flags} label="Open fraud flags" /> : null}
          {c.overdue !== null ? <Stat href="/admin/loans" value={c.overdue} label="Loans 15+ days late" /> : null}
          {c.hardship !== null ? <Stat href="/admin/loans" value={c.hardship} label="Hardship requests" /> : null}
          {/* Only finance can read dues; for other roles an empty list would wrongly read as ₹0. */}
          {c.lawajamDue !== null && hasRole("finance") ? <Stat href="/admin/lawajam" value={rupees(c.lawajamDue)} label="Lawajam outstanding" /> : null}
        </div>
      </section>

      {c.funds ? (
        <section>
          <h2 className="text-lg font-semibold">Fund balances</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            {(Object.keys(FUND_LABEL) as FundType[]).map((f) => (
              <Card key={f}>
                <p className="text-sm text-muted">{FUND_LABEL[f]}</p>
                <p className="mt-1 text-xl font-bold">{rupees(c.funds?.[f] ?? 0)}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Rules this dashboard enforces</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ href, value, label }: { href: string; value: number | string; label: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-border bg-card p-4 shadow-soft hover:border-brand">
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 font-semibold">{label}</p>
    </Link>
  );
}

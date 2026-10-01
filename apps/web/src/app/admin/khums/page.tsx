"use client";

import { useEffect, useState } from "react";
import { FUND_LABEL, formatDate, rupees, type FundType, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { Alert, Card } from "@/components/ui";

type Entry = Tables<"ledger_entries"> & { institution: { name: string } | null };

const FUNDS: FundType[] = ["sehme_imam", "sehme_sadaat", "general", "lawajam", "loan_repayment"];

/** Read-only view of the append-only ledger. Each fund is kept separate. */
export default function KhumsLedgersPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .from("ledger_entries")
      .select("*, institution:institutions(name)")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => (error ? setError(errorMessage(error)) : setEntries((data ?? []) as unknown as Entry[])));
  }, []);

  const totals = FUNDS.map((fund) => {
    const rows = (entries ?? []).filter((e) => e.fund === fund);
    const inflow = rows.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const outflow = rows.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0);
    return { fund, inflow, outflow, balance: inflow - outflow };
  });

  const byInstitution = new Map<string, number>();
  for (const e of entries ?? []) {
    if (e.fund === "sehme_imam" && e.institution) {
      byInstitution.set(e.institution.name, (byInstitution.get(e.institution.name) ?? 0) + e.amount);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Khums &amp; ledgers</h1>
        <p className="mt-1 text-muted">Every rupee by fund. Funds never mix, and entries are never edited; corrections are new rows.</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map((t) => (
          <Card key={t.fund}>
            <p className="text-sm text-muted">{FUND_LABEL[t.fund]}</p>
            <p className="mt-1 text-2xl font-bold">{rupees(t.balance)}</p>
            <p className="mt-1 text-xs text-muted">
              In {rupees(t.inflow)} · Out {rupees(t.outflow)}
            </p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold">Sehme Imam by institution</h2>
        <p className="mb-3 text-sm text-muted">Collected for each verified institution, to be remitted by finance.</p>
        {byInstitution.size === 0 ? <p className="text-muted">No Sehme Imam received yet.</p> : null}
        <ul className="space-y-1">
          {[...byInstitution.entries()].map(([name, amount]) => (
            <li key={name} className="flex justify-between border-t border-border py-2 text-sm">
              <span className="font-medium">{name}</span>
              <span>{rupees(amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent ledger entries</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Fund</th>
                <th className="py-2 pr-3">What</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).slice(0, 50).map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-2 pr-3">{formatDate(e.created_at)}</td>
                  <td className="py-2 pr-3">{FUND_LABEL[e.fund]}</td>
                  <td className="py-2 pr-3">
                    {e.memo}
                    {e.institution ? <span className="text-muted"> · {e.institution.name}</span> : null}
                  </td>
                  <td className={`py-2 text-right font-medium ${e.amount < 0 ? "text-red-700 dark:text-red-400" : ""}`}>
                    {e.amount < 0 ? `−${rupees(-e.amount)}` : rupees(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

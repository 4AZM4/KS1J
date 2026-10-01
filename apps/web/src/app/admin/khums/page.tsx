"use client";

import { useCallback, useEffect, useState } from "react";
import { FUND_LABEL, formatDate, rupees, type FundType, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { downloadCsv, today } from "@/lib/csv";
import { Alert, Button, Card, inputClass } from "@/components/ui";

type Entry = Tables<"ledger_entries"> & { institution: { name: string } | null };
type Remittance = Tables<"institution_remittances"> & { institution: { name: string } | null };

const FUNDS: FundType[] = ["sehme_imam", "sehme_sadaat", "general", "lawajam", "loan_repayment"];

/** Read-only view of the append-only ledger. Each fund is kept separate. */
export default function KhumsLedgersPage() {
  const { hasRole } = useAuth();
  const isFinance = hasRole("finance");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = supabase();
    const [l, r] = await Promise.all([
      db.from("ledger_entries").select("*, institution:institutions(name)").order("created_at", { ascending: false }).limit(5000),
      db.from("institution_remittances").select("*, institution:institutions(name)").order("created_at", { ascending: false }),
    ]);
    if (l.error) setError(errorMessage(l.error));
    setEntries((l.data ?? []) as unknown as Entry[]);
    setRemittances((r.data ?? []) as unknown as Remittance[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totals = FUNDS.map((fund) => {
    const rows = (entries ?? []).filter((e) => e.fund === fund);
    const inflow = rows.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const outflow = rows.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0);
    return { fund, inflow, outflow, balance: inflow - outflow };
  });

  // Sehme Imam per institution: received (donations) and handed over (remittances).
  const institutions = new Map<string, { id: string; name: string; received: number; remitted: number }>();
  for (const e of entries ?? []) {
    if (e.fund !== "sehme_imam" || !e.institution_id || !e.institution) continue;
    const row = institutions.get(e.institution_id) ?? { id: e.institution_id, name: e.institution.name, received: 0, remitted: 0 };
    if (e.amount > 0) row.received += e.amount;
    else row.remitted -= e.amount;
    institutions.set(e.institution_id, row);
  }

  function exportLedger() {
    downloadCsv(
      `ks1j-ledger-${today()}.csv`,
      ["Date", "Fund", "Amount (Rs)", "Description", "Institution", "Entry no."],
      (entries ?? []).map((e) => [e.created_at.slice(0, 10), FUND_LABEL[e.fund], e.amount, e.memo, e.institution?.name ?? "", e.id]),
    );
  }

  function exportRemittances() {
    downloadCsv(
      `ks1j-sehme-imam-remittances-${today()}.csv`,
      ["Date", "Institution", "Amount (Rs)", "Bank reference"],
      remittances.map((r) => [r.remitted_on, r.institution?.name ?? "", r.amount, r.reference]),
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Khums &amp; ledgers</h1>
          <p className="mt-1 text-muted">Every rupee by fund. Funds never mix, and entries are never edited; corrections are new rows.</p>
        </div>
        <Button variant="secondary" disabled={!entries?.length} onClick={exportLedger}>
          Download ledger for Excel
        </Button>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

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
        <p className="mb-3 text-sm text-muted">
          Collected for each verified institution and handed over by finance. The system refuses a handover larger than
          what is held.
        </p>
        {institutions.size === 0 ? <p className="text-muted">No Sehme Imam received yet.</p> : null}
        <div className="space-y-3">
          {[...institutions.values()].map((i) => (
            <InstitutionRow
              key={i.id}
              {...i}
              canRemit={isFinance}
              onDone={(msg) => {
                setNotice(msg);
                setError(null);
                void load();
              }}
              onError={(e) => setError(errorMessage(e))}
            />
          ))}
        </div>
      </section>

      {remittances.length > 0 ? (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Handovers to institutions</h2>
            <Button variant="secondary" onClick={exportRemittances}>
              Download for Excel
            </Button>
          </div>
          <table className="mt-3 w-full text-left text-sm">
            <tbody>
              {remittances.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 pr-3">{formatDate(r.remitted_on)}</td>
                  <td className="py-2 pr-3 font-medium">{r.institution?.name}</td>
                  <td className="py-2 pr-3 text-muted">{r.reference}</td>
                  <td className="py-2 text-right font-medium">{rupees(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

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
                    {e.institution && !e.memo.includes(e.institution.name) ? <span className="text-muted"> · {e.institution.name}</span> : null}
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

function InstitutionRow({
  id,
  name,
  received,
  remitted,
  canRemit,
  onDone,
  onError,
}: {
  id: string;
  name: string;
  received: number;
  remitted: number;
  canRemit: boolean;
  onDone: (msg: string) => void;
  onError: (e: unknown) => void;
}) {
  const held = received - remitted;
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Number(amount || 0);
  const ready = n > 0 && n <= held && reference.trim().length >= 3;

  async function remit() {
    setBusy(true);
    const { error } = await supabase()
      .from("institution_remittances")
      .insert({ institution_id: id, amount: n, reference: reference.trim() });
    setBusy(false);
    if (error) return onError(error);
    setAmount("");
    setReference("");
    onDone(`${rupees(n)} Sehme Imam handed over to ${name}.`);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-muted">
          Received {rupees(received)} · Handed over {rupees(remitted)} · <span className="font-semibold text-ink">Held {rupees(held)}</span>
        </p>
      </div>
      {canRemit && held > 0 ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Amount (₹)</span>
            <input className={`${inputClass} w-36`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Bank transfer or cheque number</span>
            <input className={`${inputClass} w-64`} value={reference} maxLength={120} onChange={(e) => setReference(e.target.value)} />
          </label>
          <Button variant="secondary" onClick={() => setAmount(String(held))}>
            All {rupees(held)}
          </Button>
          <Button disabled={busy || !ready} onClick={remit}>
            Record handover
          </Button>
          {n > held ? <p className="w-full text-sm text-red-700 dark:text-red-400">Only {rupees(held)} is held for {name}.</p> : null}
        </div>
      ) : null}
    </Card>
  );
}

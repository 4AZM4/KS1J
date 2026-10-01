"use client";

import { useCallback, useEffect, useState } from "react";
import { rupees, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { downloadCsv } from "@/lib/csv";
import { Alert, Badge, Button, Card, inputClass } from "@/components/ui";

type Due = Tables<"lawajam_dues"> & {
  household: { area: string; address: string | null; members: { full_name: string; phone: string | null }[] } | null;
};

/** Lawajam by period, area and household. Finance raises dues; members pay in the app. */
export default function LawajamAdminPage() {
  const { hasRole } = useAuth();
  const isFinance = hasRole("finance");
  const [dues, setDues] = useState<Due[] | null>(null);
  const [period, setPeriod] = useState<string>("");
  const [newPeriod, setNewPeriod] = useState("");
  const [newAmount, setNewAmount] = useState("1200");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase()
      .from("lawajam_dues")
      .select("*, household:households(area, address, members(full_name, phone))")
      .order("period", { ascending: false });
    if (error) setError(errorMessage(error));
    const rows = (data ?? []) as unknown as Due[];
    setDues(rows);
    setPeriod((p) => p || rows[0]?.period || "");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const periods = [...new Set((dues ?? []).map((d) => d.period))];
  const shown = (dues ?? []).filter((d) => d.period === period);
  const areas = [...new Set(shown.map((d) => d.household?.area ?? "Unknown"))].sort();
  const outstanding = shown.filter((d) => d.status === "pending");

  async function raise() {
    const { data, error } = await supabase().rpc("create_lawajam_period", {
      p_period: newPeriod.trim(),
      p_amount: Number(newAmount || 0),
    });
    if (error) return setError(errorMessage(error));
    setNotice(`Raised ${data} due${data === 1 ? "" : "s"} for ${newPeriod}.`);
    setError(null);
    setPeriod(newPeriod.trim());
    void load();
  }

  function exportPeriod() {
    downloadCsv(
      `ks1j-lawajam-${period}.csv`,
      ["Area", "Household members", "Phone", "Address", "Period", "Amount (Rs)", "Status"],
      shown.map((d) => [
        d.household?.area ?? "",
        d.household?.members.map((m) => m.full_name).join(", ") ?? "",
        d.household?.members.find((m) => m.phone)?.phone ?? "",
        d.household?.address ?? "",
        d.period,
        d.amount,
        d.status === "paid" ? "Paid" : "Due",
      ]),
    );
  }

  async function copyReminderList() {
    const lines = outstanding.map((d) => {
      const head = d.household?.members[0];
      return `${head?.full_name ?? "Household"} (${d.household?.area}) ${head?.phone ?? ""} · ${rupees(d.amount)} due for ${d.period}`;
    });
    await navigator.clipboard.writeText(lines.join("\n"));
    setNotice(`Copied ${lines.length} households with dues outstanding.`);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Lawajam</h1>
        <p className="mt-1 text-muted">Yearly membership dues per household. Kept in its own ledger, never mixed with Khums or cases.</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

      {isFinance ? (
        <Card>
          <h2 className="font-semibold">Raise dues for a year</h2>
          <p className="text-sm text-muted">Creates a due for every household that does not have one for that year.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted">Year (e.g. 2027-28)</span>
              <input className={`${inputClass} w-36`} value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Amount per household (₹)</span>
              <input
                className={`${inputClass} w-36`}
                inputMode="numeric"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <Button disabled={!/^\d{4}-\d{2}$/.test(newPeriod.trim()) || !Number(newAmount)} onClick={raise}>
              Raise dues
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-3 py-1.5 text-sm ${p === period ? "border-brand bg-card font-semibold text-brand" : "border-border"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Collected</p>
          <p className="mt-1 text-2xl font-bold">
            {rupees(shown.filter((d) => d.status === "paid").reduce((s, d) => s + d.amount, 0))}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Outstanding</p>
          <p className="mt-1 text-2xl font-bold">{rupees(outstanding.reduce((s, d) => s + d.amount, 0))}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Households paid</p>
          <p className="mt-1 text-2xl font-bold">
            {shown.length - outstanding.length} / {shown.length}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={shown.length === 0} onClick={exportPeriod}>
          Download {period} for Excel
        </Button>
        <Button variant="secondary" disabled={outstanding.length === 0} onClick={copyReminderList}>
          Copy reminder list ({outstanding.length})
        </Button>
      </div>

      {areas.map((area) => {
        const rows = shown.filter((d) => (d.household?.area ?? "Unknown") === area);
        return (
          <section key={area}>
            <h2 className="text-lg font-semibold">
              {area} <span className="text-sm font-normal text-muted">({rows.filter((r) => r.status === "paid").length}/{rows.length} paid)</span>
            </h2>
            <table className="mt-2 w-full text-left text-sm">
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{d.household?.members.map((m) => m.full_name).join(", ") || "—"}</td>
                    <td className="py-2 pr-3 text-muted">{d.household?.address}</td>
                    <td className="py-2 pr-3">{rupees(d.amount)}</td>
                    <td className="py-2 text-right">
                      <Badge tone={d.status === "paid" ? "good" : "warn"}>{d.status === "paid" ? "Paid" : "Due"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

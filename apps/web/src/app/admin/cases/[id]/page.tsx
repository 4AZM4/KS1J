"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CASE_STEPS,
  CASE_TYPE_LABEL,
  CATEGORY_LABEL,
  FUND_LABEL,
  STATUS_LABEL,
  rupees,
  type CaseStatus,
  type Tables,
  type TablesUpdate,
} from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Alert, Badge, Button, Card, inputClass } from "@/components/ui";

type CaseRow = Tables<"cases"> & {
  applicant: { full_name: string; phone: string | null } | null;
  verifier: { full_name: string } | null;
  approver: { full_name: string } | null;
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, hasRole } = useAuth();
  const me = session?.user.id;

  const [c, setC] = useState<CaseRow | null>(null);
  const [events, setEvents] = useState<Tables<"case_events">[]>([]);
  const [flags, setFlags] = useState<Tables<"fraud_flags">[]>([]);
  const [paidByFund, setPaidByFund] = useState<Record<string, number>>({});
  const [paidOut, setPaidOut] = useState<Tables<"disbursements">[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [lineage, setLineage] = useState(false);
  const [target, setTarget] = useState("");
  const [summary, setSummary] = useState("");
  const [payee, setPayee] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payFund, setPayFund] = useState<"general" | "sehme_sadaat">("general");

  const load = useCallback(async () => {
    const db = supabase();
    const { data, error } = await db
      .from("cases")
      .select(
        "*, applicant:members!cases_applicant_id_fkey(full_name, phone), verifier:members!cases_verified_by_fkey(full_name), approver:members!cases_approved_by_fkey(full_name)",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return setError(errorMessage(error));
    if (!data) return setError("Case not found, or you do not have access to it.");
    const row = data as unknown as CaseRow;
    setC(row);
    setLineage(row.lineage_verified);
    setTarget(String(row.target_amount ?? row.requested_amount));
    setSummary(row.public_summary ?? "");

    const [ev, fl, dn, ds] = await Promise.all([
      db.from("case_events").select("*").eq("case_id", id).order("created_at"),
      db.from("fraud_flags").select("*").eq("case_id", id).order("created_at"),
      db.from("donations").select("fund, amount").eq("case_id", id).eq("status", "paid"),
      db.from("disbursements").select("*").eq("case_id", id).order("created_at"),
    ]);
    setEvents(ev.data ?? []);
    setFlags(fl.data ?? []);
    const byFund: Record<string, number> = {};
    for (const d of dn.data ?? []) byFund[d.fund] = (byFund[d.fund] ?? 0) + d.amount;
    setPaidByFund(byFund);
    setPaidOut(ds.data ?? []);
  }, [id]);

  useEffect(() => {
    // load() only sets state after its first await, so this does not render synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function act(message: string, fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await fn();
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setNotice(message);
    await load();
  }

  const setStatus = (status: CaseStatus, extra: TablesUpdate<"cases"> = {}, message = `Case ${STATUS_LABEL[status].toLowerCase()}.`) =>
    act(message, () => supabase().from("cases").update({ status, ...extra }).eq("id", id));

  if (error && !c) return <Alert>{error}</Alert>;
  if (!c) return <p className="text-muted">Loading…</p>;

  const isSadaat = c.category === "sadaat";
  const iVerified = !!me && c.verified_by === me;
  const stepIndex = CASE_STEPS.indexOf(c.status);
  const totalPaidOut = paidOut.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="max-w-4xl">
      <Link href="/admin/cases" className="text-sm text-muted underline">← All cases</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">#{c.case_no} {c.title}</h1>
        <Badge>{STATUS_LABEL[c.status]}</Badge>
        <Badge tone={isSadaat ? "good" : "neutral"}>{CATEGORY_LABEL[c.category]}</Badge>
      </div>

      {/* Timeline */}
      {c.status !== "rejected" ? (
        <ol className="mt-5 flex flex-wrap gap-2 text-xs">
          {CASE_STEPS.map((s, i) => (
            <li key={s} className={`rounded-full border px-2 py-1 ${i <= stepIndex ? "border-brand text-brand" : "border-border text-muted"}`}>
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
      ) : null}

      {notice ? <div className="mt-4"><Alert tone="good">{notice}</Alert></div> : null}
      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Applicant</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-muted">Name</dt><dd>{c.applicant?.full_name}</dd></div>
            <div><dt className="text-muted">Phone</dt><dd>{c.applicant?.phone ?? "—"}</dd></div>
            <div><dt className="text-muted">Type</dt><dd>{CASE_TYPE_LABEL[c.type]}</dd></div>
            <div><dt className="text-muted">Requested</dt><dd>{rupees(c.requested_amount)}</dd></div>
            {isSadaat ? (
              <div><dt className="text-muted">Sadaat lineage</dt><dd>{c.lineage_verified ? "Verified" : "Not yet verified"}</dd></div>
            ) : null}
          </dl>
        </Card>
        <Card>
          <h2 className="font-semibold">Sign-offs</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-muted">Verified by</dt><dd>{c.verifier?.full_name ?? "—"}</dd></div>
            <div><dt className="text-muted">Approved by</dt><dd>{c.approver?.full_name ?? "—"}</dd></div>
            <div><dt className="text-muted">Raised</dt><dd>{rupees(c.raised_amount)}{c.target_amount ? ` of ${rupees(c.target_amount)}` : ""}</dd></div>
            {Object.keys(paidByFund).length > 0 ? (
              <div>
                <dt className="text-muted">Received by fund</dt>
                <dd>{Object.entries(paidByFund).map(([f, a]) => `${FUND_LABEL[f as keyof typeof FUND_LABEL]} ${rupees(a)}`).join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>

      {flags.length > 0 ? (
        <Card className="mt-4">
          <h2 className="font-semibold">Fraud flags</h2>
          <p className="mt-1 text-sm text-muted">Flags are hints. A verifier decides.</p>
          <ul className="mt-3 space-y-2">
            {flags.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {f.reason}
                  {f.matched_case_id ? (
                    <> (<Link className="underline" href={`/admin/cases/${f.matched_case_id}`}>matching case</Link>)</>
                  ) : null}{" "}
                  <Badge tone={f.status === "open" ? "warn" : "neutral"}>{f.status}</Badge>
                </span>
                {f.status === "open" && hasRole("verifier") ? (
                  <span className="flex gap-2">
                    <Button variant="secondary" disabled={busy}
                      onClick={() => act("Flag cleared.", () => supabase().from("fraud_flags").update({ status: "cleared", reviewed_by: me, reviewed_at: new Date().toISOString() }).eq("id", f.id))}>
                      Clear
                    </Button>
                    <Button variant="danger" disabled={busy}
                      onClick={() => act("Flag confirmed.", () => supabase().from("fraud_flags").update({ status: "confirmed", reviewed_by: me, reviewed_at: new Date().toISOString() }).eq("id", f.id))}>
                      Confirm
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Actions for the viewer's role at this step */}
      <Card className="mt-4">
        <h2 className="font-semibold">Next step</h2>

        {c.status === "submitted" ? (
          hasRole("verifier") ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted">Check the documents and the need. A different trustee approves next.</p>
              {isSadaat ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={lineage} onChange={(e) => setLineage(e.target.checked)} />
                  I have verified Sadaat (Syed) lineage
                </label>
              ) : null}
              <div className="flex gap-2">
                <Button disabled={busy || (isSadaat && !lineage)} onClick={() => setStatus("verified", { lineage_verified: lineage })}>Verify</Button>
                <Button variant="danger" disabled={busy} onClick={() => setStatus("rejected")}>Reject</Button>
              </div>
            </div>
          ) : <p className="mt-2 text-sm text-muted">Waiting for a verifier.</p>
        ) : null}

        {c.status === "verified" ? (
          hasRole("trustee") && !iVerified ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-semibold" htmlFor="target">Target amount (₹)</label>
              <input id="target" className={inputClass} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} />
              <label className="block text-sm font-semibold" htmlFor="summary">What donors will see (no names, phones or addresses)</label>
              <textarea id="summary" className={inputClass} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
              <div className="flex gap-2">
                <Button disabled={busy || !target || !summary.trim()}
                  onClick={() => setStatus("approved", { target_amount: Number(target), public_summary: summary.trim() })}>Approve</Button>
                <Button variant="danger" disabled={busy} onClick={() => setStatus("rejected")}>Reject</Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {iVerified ? "You verified this case, so a different trustee must approve it." : "Waiting for a trustee to approve."}
            </p>
          )
        ) : null}

        {c.status === "approved" ? (
          hasRole("trustee") ? (
            <div className="mt-3">
              <p className="text-sm text-muted">Publishing puts the case in the {CATEGORY_LABEL[c.category]} list for donors.</p>
              <Button className="mt-3" disabled={busy} onClick={() => setStatus("published", {}, "Case published to donors.")}>Publish</Button>
            </div>
          ) : <p className="mt-2 text-sm text-muted">Waiting for a trustee to publish.</p>
        ) : null}

        {c.status === "published" ? (
          <p className="mt-2 text-sm text-muted">Live for donors. It moves to fully funded automatically when the target is reached.</p>
        ) : null}

        {c.status === "funded" ? (
          hasRole("finance") ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted">Pay the hospital, school or beneficiary directly, then record it here. Recorded so far: {rupees(totalPaidOut)}.</p>
              <label className="block text-sm font-semibold" htmlFor="payee">Paid to</label>
              <input id="payee" className={inputClass} placeholder="e.g. Demo Hospital" value={payee} onChange={(e) => setPayee(e.target.value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold" htmlFor="pamt">Amount (₹)</label>
                  <input id="pamt" className={inputClass} inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold" htmlFor="pfund">From fund</label>
                  <select id="pfund" className={inputClass} value={payFund} onChange={(e) => setPayFund(e.target.value as "general" | "sehme_sadaat")}>
                    <option value="general">General donation</option>
                    {isSadaat ? <option value="sehme_sadaat">Sehme Sadaat</option> : null}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy || !payee.trim() || !payAmount}
                  onClick={() => act("Payment recorded.", () =>
                    supabase().from("disbursements").insert({ case_id: id, fund: payFund, amount: Number(payAmount), payee: payee.trim(), recorded_by: me! }))}>
                  Record payment
                </Button>
                <Button variant="secondary" disabled={busy || totalPaidOut === 0} onClick={() => setStatus("disbursed", {}, "Case marked as paid out.")}>
                  Mark paid out
                </Button>
              </div>
            </div>
          ) : <p className="mt-2 text-sm text-muted">Waiting for finance to pay out.</p>
        ) : null}

        {c.status === "disbursed" ? (
          hasRole("finance") ? (
            <div className="mt-3">
              <p className="text-sm text-muted">Closing tells donors the need was met.</p>
              <Button className="mt-3" disabled={busy} onClick={() => setStatus("closed", {}, "Case closed. Donors will be told the need was met.")}>Close case</Button>
            </div>
          ) : <p className="mt-2 text-sm text-muted">Paid out. Finance closes the case.</p>
        ) : null}

        {c.status === "closed" || c.status === "rejected" ? <p className="mt-2 text-sm text-muted">No further steps.</p> : null}
      </Card>

      {paidOut.length > 0 ? (
        <Card className="mt-4">
          <h2 className="font-semibold">Payments made</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {paidOut.map((d) => (
              <li key={d.id}>{rupees(d.amount)} to {d.payee} from {FUND_LABEL[d.fund]} · {new Date(d.created_at).toLocaleDateString("en-IN")}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-4">
        <h2 className="font-semibold">History</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Submitted · {new Date(c.created_at).toLocaleString("en-IN")}</li>
          {events.map((e) => (
            <li key={e.id}>{STATUS_LABEL[e.to_status]} · {new Date(e.created_at).toLocaleString("en-IN")}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

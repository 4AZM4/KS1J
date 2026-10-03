"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AUTOPAY_LABEL,
  FOLLOW_UP_LABEL,
  LOAN_STATUS_LABEL,
  checkEmiProposal,
  formatDate,
  minimumEmi,
  monthsToRepay,
  rupees,
  type Database,
  type FollowUpStage,
  type Tables,
} from "@ks1j/shared";
import { errorMessage, supabase, files } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { downloadCsv, today } from "@/lib/csv";
import { Alert, Badge, Button, Card, inputClass } from "@/components/ui";

type Loan = Tables<"education_loans"> & { borrower: { full_name: string } | null; case: { case_no: number } | null };
type CaseRow = Tables<"cases"> & { applicant: { full_name: string; household_id: string | null } | null };
type Hardship = Tables<"loan_hardship_requests"> & { requester: { full_name: string } | null };
type FollowUp = Database["public"]["Functions"]["loan_followup_list"]["Returns"][number];

const STAGE_TONE: Record<FollowUpStage, "neutral" | "good" | "warn" | "bad"> = {
  none: "good",
  upcoming_reminder: "neutral",
  missed_reminder: "warn",
  notify_guarantor: "warn",
  officer_follow_up: "bad",
  committee_review: "bad",
  paused_for_review: "neutral",
};

export default function LoansPage() {
  const { hasRole } = useAuth();
  const isTrustee = hasRole("trustee");
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [toSetUp, setToSetUp] = useState<CaseRow[]>([]);
  const [hardship, setHardship] = useState<Hardship[]>([]);
  const [followUp, setFollowUp] = useState<FollowUp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = supabase();
    const [l, c, h, f] = await Promise.all([
      db
        .from("education_loans")
        .select("*, borrower:members!education_loans_borrower_id_fkey(full_name), case:cases(case_no)")
        .order("created_at", { ascending: false }),
      db
        .from("cases")
        .select("*, applicant:members!cases_applicant_id_fkey(full_name, household_id)")
        .eq("type", "education_loan")
        .in("status", ["approved", "published", "funded"]),
      db
        .from("loan_hardship_requests")
        .select("*, requester:members!loan_hardship_requests_requested_by_fkey(full_name)")
        .eq("status", "pending")
        .order("created_at"),
      db.rpc("loan_followup_list"),
    ]);
    const err = l.error ?? c.error ?? h.error ?? f.error;
    if (err) setError(errorMessage(err));
    const loanRows = (l.data ?? []) as unknown as Loan[];
    setLoans(loanRows);
    const withLoan = new Set(loanRows.map((x) => x.case_id));
    setToSetUp(((c.data ?? []) as unknown as CaseRow[]).filter((x) => !withLoan.has(x.id)));
    setHardship((h.data ?? []) as unknown as Hardship[]);
    setFollowUp(f.data ?? []);
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

  const awaiting = (loans ?? []).filter((l) => !l.plan_agreed_at);
  const active = (loans ?? []).filter((l) => l.plan_agreed_at && l.status !== "closed");
  const noAutopay = active.filter((l) => l.autopay_status !== "active");
  const lent = (loans ?? []).reduce((s, l) => s + l.principal, 0);
  const outstanding = (loans ?? []).reduce((s, l) => s + l.outstanding, 0);

  async function refreshStatuses() {
    const { data, error } = await supabase().rpc("refresh_loan_statuses");
    if (error) return fail(error);
    done(`Statuses refreshed (${data} loan${data === 1 ? "" : "s"} moved on). This also runs every night.`);
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Education loans</h1>
          <p className="mt-1 text-muted">Qard-e-Hasana: no interest, no late fees. No payout until the plan is agreed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={followUp.length === 0}
            onClick={() =>
              downloadCsv(
                `ks1j-loan-follow-up-${today()}.csv`,
                ["Student", "Payer", "Next due", "Days late", "EMI (Rs)", "Left to repay (Rs)", "AutoPay", "Stage", "Guarantor", "Guarantor phone"],
                followUp.map((r) => [
                  r.borrower,
                  r.payer,
                  r.next_due_date,
                  r.days_late,
                  r.agreed_emi,
                  r.outstanding,
                  AUTOPAY_LABEL[r.autopay_status] ?? r.autopay_status,
                  FOLLOW_UP_LABEL[r.stage as FollowUpStage] ?? r.stage,
                  r.guarantor,
                  r.guarantor_phone,
                ]),
              )
            }
          >
            Download follow-up list for Excel
          </Button>
          <Button variant="secondary" onClick={refreshStatuses}>
            Refresh statuses
          </Button>
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Lent in total" value={rupees(lent)} />
        <Stat label="Still to be repaid" value={rupees(outstanding)} />
        <Stat label="Plans to agree" value={String(awaiting.length)} />
        <Stat label="AutoPay not on" value={String(noAutopay.length)} />
      </div>

      <Section title="Follow-up list" note="Automatic. Reminders and guarantor messages go out without anyone chasing. Act from 15 days late.">
        {followUp.length === 0 ? <p className="text-muted">No loans in repayment yet.</p> : null}
        {followUp.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Payer</th>
                  <th className="py-2 pr-3">Next due</th>
                  <th className="py-2 pr-3">EMI</th>
                  <th className="py-2 pr-3">Left</th>
                  <th className="py-2 pr-3">AutoPay</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2">Guarantor</th>
                </tr>
              </thead>
              <tbody>
                {followUp.map((r) => {
                  const stage = r.stage as FollowUpStage;
                  return (
                    <tr key={r.loan_id} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium">{r.borrower}</td>
                      <td className="py-2 pr-3">{r.payer}</td>
                      <td className="py-2 pr-3">
                        {formatDate(r.next_due_date)}
                        {r.days_late > 0 ? <span className="block text-xs text-red-700 dark:text-red-400">{r.days_late} days late</span> : null}
                      </td>
                      <td className="py-2 pr-3">{rupees(r.agreed_emi)}</td>
                      <td className="py-2 pr-3">{rupees(r.outstanding)}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={r.autopay_status === "active" ? "good" : "warn"}>{AUTOPAY_LABEL[r.autopay_status] ?? r.autopay_status}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={STAGE_TONE[stage] ?? "neutral"}>{FOLLOW_UP_LABEL[stage] ?? r.stage}</Badge>
                      </td>
                      <td className="py-2">
                        {r.guarantor}
                        <span className="block text-xs text-muted">{r.guarantor_phone}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      <Section title="Hardship requests" note="Reminders stop while a request is pending. Check the income proof before deciding.">
        {hardship.length === 0 ? <p className="text-muted">No requests waiting.</p> : null}
        {hardship.map((h) => (
          <HardshipCard key={h.id} h={h} canDecide={isTrustee} onDone={done} onError={fail} />
        ))}
      </Section>

      <Section title="Repayment plans to agree" note="The family proposes an EMI. Accept it, or suggest another amount; the plan is agreed when both match.">
        {awaiting.length === 0 ? <p className="text-muted">Nothing waiting.</p> : null}
        {awaiting.map((l) => (
          <PlanCard key={l.id} loan={l} canDecide={isTrustee} onDone={done} onError={fail} />
        ))}
      </Section>

      <Section title="Approved loans to set up" note="Approved education-loan cases that need repayment details before the family can agree a plan.">
        {toSetUp.length === 0 ? <p className="text-muted">Nothing waiting.</p> : null}
        {toSetUp.map((c) => (
          <SetUpCard key={c.id} c={c} canSetUp={isTrustee || hasRole("finance")} onDone={done} onError={fail} />
        ))}
      </Section>

      <Section title="All loans">
        {(loans ?? []).map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-sm">
            <span>
              <span className="font-medium">{l.borrower?.full_name}</span>{" "}
              {l.case ? (
                <Link href={`/admin/cases/view?id=${l.case_id}`} className="text-brand underline">
                  #{l.case.case_no}
                </Link>
              ) : null}
            </span>
            <span className="text-muted">
              {rupees(l.outstanding)} of {rupees(l.principal)} left · EMI {l.agreed_emi ? rupees(l.agreed_emi) : "not agreed"}
            </span>
            <Badge>{LOAN_STATUS_LABEL[l.status]}</Badge>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {note ? <p className="mb-3 text-sm text-muted">{note}</p> : null}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

type Handlers = { onDone: (msg: string) => void; onError: (e: unknown) => void };

function PlanCard({ loan, canDecide, onDone, onError }: { loan: Loan; canDecide: boolean } & Handlers) {
  const [counter, setCounter] = useState("");
  const [busy, setBusy] = useState(false);
  const floor = minimumEmi(loan.principal, loan.max_tenure_months);
  const proposal = loan.family_accepted_emi;
  const check = checkEmiProposal(loan.principal, Number(counter || 0), loan.max_tenure_months);

  async function accept(emi: number) {
    setBusy(true);
    const { data, error } = await supabase().rpc("accept_loan_emi", { p_loan: loan.id, p_emi: emi });
    setBusy(false);
    if (error) return onError(error);
    onDone(data?.plan_agreed_at ? `Plan agreed at ${rupees(emi)} a month. Finance can now pay out.` : `Suggested ${rupees(emi)} a month to the family.`);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {loan.borrower?.full_name} · {rupees(loan.principal)}
        </p>
        <p className="text-sm text-muted">
          Course ends {formatDate(loan.course_end_date)} · first EMI {formatDate(loan.grace_ends_on)}
        </p>
      </div>
      <p className="mt-2 text-sm">
        Family proposed: <strong>{proposal ? `${rupees(proposal)} a month (${monthsToRepay(loan.principal, proposal)} months)` : "not yet"}</strong>
        {loan.committee_accepted_emi ? (
          <>
            {" "}
            · Committee suggested: <strong>{rupees(loan.committee_accepted_emi)}</strong>
          </>
        ) : null}
      </p>
      <p className="text-xs text-muted">Minimum {rupees(floor)} a month (repaid within {loan.max_tenure_months} months).</p>
      {canDecide ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {proposal ? (
            <Button disabled={busy} onClick={() => accept(proposal)}>
              Accept {rupees(proposal)}
            </Button>
          ) : null}
          <label className="text-sm">
            <span className="block text-muted">Suggest another EMI (₹)</span>
            <input className={`${inputClass} w-40`} inputMode="numeric" value={counter} onChange={(e) => setCounter(e.target.value.replace(/\D/g, ""))} />
          </label>
          <Button variant="secondary" disabled={busy || !check.ok} onClick={() => check.ok && accept(check.emi)}>
            Suggest
          </Button>
          {counter && !check.ok ? <p className="w-full text-sm text-red-700 dark:text-red-400">{check.reason}</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">A trustee agrees repayment plans.</p>
      )}
    </Card>
  );
}

function HardshipCard({ h, canDecide, onDone, onError }: { h: Hardship; canDecide: boolean } & Handlers) {
  const [busy, setBusy] = useState(false);

  async function openProof() {
    try {
      window.open(await files().viewUrl(h.proof_path), "_blank", "noopener");
    } catch (e) {
      onError(e);
    }
  }

  async function decide(status: "approved" | "rejected") {
    setBusy(true);
    const { error } = await supabase().from("loan_hardship_requests").update({ status }).eq("id", h.id);
    setBusy(false);
    if (error) return onError(error);
    onDone(status === "approved" ? "Approved. The family has been given the new terms." : "Declined. The normal schedule continues.");
  }

  return (
    <Card>
      <p className="font-semibold">
        {h.requester?.full_name}:{" "}
        {h.kind === "pause" ? `pause for ${h.pause_months} month${h.pause_months === 1 ? "" : "s"}` : `lower EMI to ${rupees(h.new_emi)}`}
      </p>
      <p className="mt-1 text-sm">{h.reason}</p>
      <p className="mt-1 text-xs text-muted">Sent {formatDate(h.created_at)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={openProof}>
          View income proof
        </Button>
        {canDecide ? (
          <>
            <Button disabled={busy} onClick={() => decide("approved")}>
              Approve
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => decide("rejected")}>
              Decline
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  );
}

function SetUpCard({ c, canSetUp, onDone, onError }: { c: CaseRow; canSetUp: boolean } & Handlers) {
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [principal, setPrincipal] = useState(String(c.target_amount ?? c.requested_amount));
  const [courseEnd, setCourseEnd] = useState("");
  const [payer, setPayer] = useState(c.applicant_id);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hh = c.applicant?.household_id;
    if (!hh) return;
    supabase()
      .from("members")
      .select("id, full_name")
      .eq("household_id", hh)
      .then(({ data }) => setMembers(data ?? []));
  }, [c.applicant?.household_id]);

  const amount = Number(principal || 0);
  const ready = amount > 0 && courseEnd && guarantorName.trim() && guarantorPhone.trim().length >= 10;

  async function create() {
    setBusy(true);
    const { error } = await supabase().from("education_loans").insert({
      case_id: c.id,
      borrower_id: c.applicant_id,
      payer_member_id: payer,
      principal: amount,
      outstanding: amount,
      course_end_date: courseEnd,
      guarantor_name: guarantorName.trim(),
      guarantor_phone: guarantorPhone.replace(/\D/g, ""),
    });
    setBusy(false);
    if (error) return onError(error);
    onDone("Loan set up. The family can now propose an EMI in the app.");
  }

  return (
    <Card>
      <p className="font-semibold">
        #{c.case_no} {c.title} · {c.applicant?.full_name}
      </p>
      {c.details ? <p className="mt-1 text-sm text-muted">{c.details}</p> : null}
      {canSetUp ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Labeled label="Loan amount (₹)">
            <input className={inputClass} inputMode="numeric" value={principal} onChange={(e) => setPrincipal(e.target.value.replace(/\D/g, ""))} />
          </Labeled>
          <Labeled label="Course ends on">
            <input className={inputClass} type="date" value={courseEnd} onChange={(e) => setCourseEnd(e.target.value)} />
          </Labeled>
          <Labeled label="Who pays the EMI">
            <select className={inputClass} value={payer} onChange={(e) => setPayer(e.target.value)}>
              <option value={c.applicant_id}>{c.applicant?.full_name} (student)</option>
              {members
                .filter((m) => m.id !== c.applicant_id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
            </select>
          </Labeled>
          <Labeled label="Guarantor name">
            <input className={inputClass} value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
          </Labeled>
          <Labeled label="Guarantor phone">
            <input className={inputClass} inputMode="tel" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
          </Labeled>
          <div className="flex items-end">
            <Button disabled={busy || !ready} onClick={create}>
              Set up loan
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">A trustee or finance sets up the loan.</p>
      )}
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

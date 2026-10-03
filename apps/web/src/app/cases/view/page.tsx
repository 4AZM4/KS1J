"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  CASE_PRIVACY_NOTE,
  CASE_SUMMARY_FALLBACK,
  CASE_TYPE_LABEL,
  CATEGORY_LABEL,
  FUND_LABEL,
  KHUMS_GUIDANCE,
  isDonationAllowed,
  rupees,
  type FundType,
} from "@ks1j/shared";
import { useAuth } from "@/components/auth";
import { CaseProgress, type PublicCase } from "@/components/cases";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, Card, inputClass } from "@/components/ui";
import { DEMO_MODE, errorMessage, supabase } from "@/lib/supabase";

const QUICK = [500, 1000, 5000];

export default function CaseViewPage() {
  return (
    <div className="flex-1 bg-paper text-ink">
      <SiteHeader />
      <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-10 text-lg text-muted">Loading…</p>}>
        <CaseView />
      </Suspense>
    </div>
  );
}

function CaseView() {
  const id = useSearchParams().get("id") ?? "";
  const { session } = useAuth();
  const [c, setC] = useState<PublicCase | null | undefined>(undefined);
  const [chosenFund, setFund] = useState<FundType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const load = useCallback(() => {
    supabase()
      .rpc("list_public_cases", {})
      .then(({ data, error }) => {
        setLoadError(error ? errorMessage(error) : null);
        setC(error ? null : (data ?? []).find((x) => x.id === id) ?? null);
      });
  }, [id]);
  useEffect(load, [load]);

  if (c === undefined) return <p className="mx-auto max-w-3xl px-4 py-10 text-lg text-muted">Loading…</p>;
  if (c === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {loadError ? <Alert>{loadError}</Alert> : null}
        <p className="mt-2 text-lg">{loadError ? "Please check your connection and try again." : "This case is not open for donations."}</p>
        <Link href="/cases" className="mt-4 inline-block font-semibold text-brand underline">See open cases</Link>
      </main>
    );
  }

  // Only offer the funds the database will accept for this case (hard rule 2).
  const funds = (["sehme_sadaat", "general"] as FundType[]).filter((f) =>
    isDonationAllowed(f, { kind: "case", category: c.category }),
  );
  const amountNumber = Number(amount || 0);
  const remaining = Math.max(0, c.target_amount - c.raised_amount);
  const closed = c.status === "funded";
  // With only one fund on offer (Non-Sadaat cases), it is chosen already.
  const fund: FundType | null = chosenFund ?? (funds.length === 1 ? funds[0] : null);
  const tooMuch = amountNumber > remaining;
  const quick = [...QUICK.filter((q) => q <= remaining), remaining].filter((v, i, a) => v > 0 && a.indexOf(v) === i);

  async function give() {
    if (!session || !fund || amountNumber <= 0 || tooMuch || !c) return;
    setBusy(true);
    setError(null);
    setThanks(null);
    setReceiptId(null);
    try {
      const db = supabase();
      const { data, error } = await db
        .from("donations")
        .insert({ donor_id: session.user.id, fund, case_id: c.id, amount: amountNumber })
        .select("id")
        .single();
      if (error) throw error;
      if (DEMO_MODE) {
        // Stand-in for the payment gateway: confirms through the same database triggers.
        const { error: payError } = await db.rpc("demo_confirm_payment", { p_kind: "donation", p_id: data.id });
        if (payError) throw payError;
        setThanks(`Thank you. ${rupees(amountNumber)} as ${FUND_LABEL[fund]} is recorded in the Jamaat ledger.`);
        setReceiptId(data.id);
      } else {
        setThanks("Your donation is waiting for payment confirmation from the bank.");
      }
      setAmount("");
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/cases" className="text-base font-semibold text-brand underline">← All cases</Link>
      <p className="mt-6 text-base font-semibold text-muted">
        Case #{c.case_no} · {CATEGORY_LABEL[c.category]} · {CASE_TYPE_LABEL[c.type]}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{c.title}</h1>

      <Card className="mt-6">
        <p className="text-lg">{c.public_summary || CASE_SUMMARY_FALLBACK}</p>
        <CaseProgress raised={c.raised_amount} target={c.target_amount} funded={closed} />
        <p className="mt-4 text-base text-muted">
          Verified and approved by two different Jamaat admins.
          The Jamaat pays the hospital, school or family directly and keeps proof.
        </p>
        <p className="mt-3 text-base text-muted">{CASE_PRIVACY_NOTE}</p>
      </Card>

      {thanks ? (
        <div className="mt-6">
          <Alert tone="good">{thanks}</Alert>
          {receiptId ? (
            <Link href={`/receipt?id=${receiptId}`} className="mt-3 inline-block rounded-xl border border-border bg-card px-5 py-3 text-base font-bold text-brand hover:bg-paper">
              View and print your receipt
            </Link>
          ) : null}
        </div>
      ) : null}
      {error ? <div className="mt-6"><Alert>{error}</Alert></div> : null}

      {closed ? (
        <p className="mt-6 text-lg">This case is fully funded. Thank you to everyone who gave.</p>
      ) : !session ? (
        <Card className="mt-6">
          <p className="text-lg">Sign in to give to this case. Anyone can read about it.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/login?next=${encodeURIComponent(`/cases/view?id=${c.id}`)}`}
              className="min-h-12 rounded-xl bg-deep px-5 py-3 text-base font-bold text-white">Sign in to give</Link>
            <Link href="/signup" className="min-h-12 rounded-xl border border-border px-5 py-3 text-base font-bold">Create an account</Link>
          </div>
        </Card>
      ) : (
        <section className="mt-8" aria-labelledby="give">
          <h2 id="give" className="text-2xl font-bold">Give</h2>
          <fieldset className="mt-4">
            <legend className="text-base font-semibold">Give as</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {funds.map((f) => (
                <button key={f} type="button" role="radio" aria-checked={fund === f} onClick={() => setFund(f)}
                  className={`min-h-12 rounded-xl border px-4 py-2 text-left text-base ${fund === f ? "border-2 border-brand font-bold" : "border-border bg-card"}`}>
                  {FUND_LABEL[f]}
                  <span className="block text-sm text-muted">{f === "sehme_sadaat" ? "Part of your Khums" : "Sadaqah or other giving"}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {fund === "sehme_sadaat" ? <p className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-base">{KHUMS_GUIDANCE}</p> : null}
          <fieldset className="mt-5">
            <legend className="text-base font-semibold">Amount</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {quick.map((q) => (
                <button key={q} type="button" role="radio" aria-checked={amountNumber === q} onClick={() => setAmount(String(q))}
                  className={`min-h-12 rounded-xl border px-4 py-2 text-base ${amountNumber === q ? "border-2 border-brand font-bold" : "border-border bg-card"}`}>
                  {q === remaining ? `${rupees(q)} (all that's left)` : rupees(q)}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="amount" className="mt-5 block text-base font-semibold">Or enter an amount (₹)</label>
          <input id="amount" inputMode="numeric" className={`${inputClass} mt-2 max-w-xs`} value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          {tooMuch ? <p className="mt-3 text-base text-muted">This case only needs {rupees(remaining)} more.</p> : null}
          <button type="button" onClick={give} disabled={!fund || amountNumber <= 0 || tooMuch || busy}
            className="mt-5 block min-h-12 rounded-xl bg-deep px-6 py-3 text-lg font-bold text-white disabled:opacity-50">
            {busy ? "Giving…" : amountNumber > 0 && fund ? `Give ${rupees(amountNumber)}` : "Give"}
          </button>
          {DEMO_MODE ? <p className="mt-3 text-sm text-muted">Demo mode: payment is confirmed instantly without a payment gateway.</p> : null}
        </section>
      )}
    </main>
  );
}

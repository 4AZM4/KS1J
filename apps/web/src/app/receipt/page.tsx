"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FUND_LABEL, KHUMS_GUIDANCE, formatDate, rupees } from "@ks1j/shared";
import { useAuth } from "@/components/auth";
import { KS1JMark } from "@/components/landing/Mark";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert } from "@/components/ui";
import { errorMessage, supabase } from "@/lib/supabase";

type Row = {
  id: string;
  fund: keyof typeof FUND_LABEL;
  amount: number;
  paid_at: string | null;
  gateway_ref: string | null;
  institution: { name: string } | null;
};

/** A printable receipt for a donation the signed-in member made. RLS only returns their own donations. */
export default function ReceiptPage() {
  return (
    <div className="flex-1 bg-paper text-ink">
      <div className="print:hidden"><SiteHeader /></div>
      <Suspense fallback={<p className="mx-auto max-w-xl px-4 py-10 text-lg text-muted">Loading…</p>}>
        <Receipt />
      </Suspense>
    </div>
  );
}

function Receipt() {
  const id = useSearchParams().get("id") ?? "";
  const { loading, session, member } = useAuth();
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !id) return;
    supabase()
      .from("donations")
      .select("id, fund, amount, paid_at, gateway_ref, institution:institutions(name)")
      .eq("id", id)
      .eq("status", "paid")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(errorMessage(error));
        setRow((data as Row | null) ?? null);
      });
  }, [session, id]);

  if (loading) return <p className="mx-auto max-w-xl px-4 py-10 text-lg text-muted">Loading…</p>;
  if (!session)
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-lg">Sign in to see your receipt.</p>
        <Link href={`/login?next=${encodeURIComponent(`/receipt?id=${id}`)}`} className="mt-4 inline-block rounded-xl bg-deep px-5 py-3 text-lg font-bold text-white">
          Sign in
        </Link>
      </main>
    );
  if (error) return <main className="mx-auto max-w-xl px-4 py-10"><Alert>{error}</Alert></main>;
  if (row === undefined) return <p className="mx-auto max-w-xl px-4 py-10 text-lg text-muted">Loading…</p>;
  if (row === null)
    return <main className="mx-auto max-w-xl px-4 py-10"><p className="text-lg">This receipt was not found, or it is not yours.</p></main>;

  const khums = row.fund === "sehme_imam" || row.fund === "sehme_sadaat";
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl border-2 border-gold bg-card shadow-sm">
        <div className="flex items-center gap-4 bg-deep px-6 py-5 text-white">
          <KS1JMark className="h-14 w-14" />
          <div>
            <p className="text-xl font-bold">KSI Jamaat Mumbai</p>
            <p className="text-base text-white/80">Payment receipt (demo)</p>
          </div>
        </div>
        <dl className="space-y-3 px-6 py-6 text-lg">
          <p className="text-4xl font-bold">{rupees(row.amount)}</p>
          <div className="flex justify-between gap-4"><dt className="text-muted">For</dt><dd className="font-semibold">{FUND_LABEL[row.fund]}</dd></div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">To</dt>
            <dd className="text-right">{row.institution?.name ?? "A verified Jamaat case"}</dd>
          </div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Paid by</dt><dd className="font-semibold">{member?.full_name ?? "You"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Date</dt><dd>{formatDate(row.paid_at)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Receipt number</dt><dd className="break-all text-right text-base">{row.gateway_ref ?? row.id}</dd></div>
          {khums ? <p className="rounded-xl bg-paper px-4 py-3 text-base">{KHUMS_GUIDANCE}</p> : null}
          <p className="text-base text-muted">Recorded in the Jamaat ledger.</p>
        </dl>
      </div>
      <button onClick={() => window.print()} className="mt-6 rounded-xl bg-deep px-6 py-3 text-lg font-bold text-white print:hidden">
        Save or print (PDF)
      </button>
    </main>
  );
}

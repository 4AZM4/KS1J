"use client";

import { useEffect, useState } from "react";
import { rupees } from "@ks1j/shared";
import { supabase } from "@/lib/supabase";

type Totals = { raised: number; families_helped: number; open_needs: number; students_with_loans: number; loans_repaid: number };

/**
 * Live totals from public_impact(): aggregates only, so no family can be identified.
 * Tiles with nothing to show yet are left out rather than showing a zero.
 */
export function Impact() {
  const [t, setT] = useState<Totals | null>(null);

  useEffect(() => {
    supabase()
      .rpc("public_impact")
      .then(({ data }) => setT((data as Totals[] | null)?.[0] ?? null));
  }, []);

  if (!t) return null;
  const tiles = [
    { value: rupees(t.raised), label: "given to verified cases", show: t.raised > 0 },
    { value: String(t.families_helped), label: t.families_helped === 1 ? "family helped in full" : "families helped in full", show: t.families_helped > 0 },
    { value: String(t.open_needs), label: t.open_needs === 1 ? "need open right now" : "needs open right now", show: t.open_needs > 0 },
    { value: String(t.students_with_loans), label: "students with interest-free loans", show: t.students_with_loans > 0 },
    { value: rupees(t.loans_repaid), label: "repaid for the next student", show: t.loans_repaid > 0 },
  ].filter((x) => x.show);
  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="impact" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h2 id="impact" className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-brand">Together so far</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((x, i) => (
          // On phones the first total (usually the rupees raised) gets the full width, and numbers shrink
          // with the screen, so a long amount like ₹1,32,800 never spills out of its tile.
          <li
            key={x.label}
            className={`min-w-0 rounded-2xl border border-border bg-card px-4 py-4 sm:px-5 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <p className="text-[clamp(1.5rem,7vw,1.875rem)] font-bold leading-tight text-ink tabular-nums [overflow-wrap:anywhere]">{x.value}</p>
            <p className="mt-1 text-base text-muted">{x.label}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">Live from the Jamaat ledger. Totals only: no family can be identified from them.</p>
    </section>
  );
}

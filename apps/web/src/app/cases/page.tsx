"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CASE_PRIVACY_NOTE,
  CASE_SUMMARY_FALLBACK,
  CASE_TYPE_LABEL,
  CATEGORY_LABEL,
  type CaseCategory,
} from "@ks1j/shared";
import { CaseProgress, type PublicCase } from "@/components/cases";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert } from "@/components/ui";
import { errorMessage, supabase } from "@/lib/supabase";

const TABS: { value: CaseCategory | null; label: string }[] = [
  { value: null, label: "All cases" },
  { value: "sadaat", label: CATEGORY_LABEL.sadaat },
  { value: "non_sadaat", label: CATEGORY_LABEL.non_sadaat },
];

/** Open cases anyone can read, with no way to tell who the family is. */
export default function CasesPage() {
  const [category, setCategory] = useState<CaseCategory | null>(null);
  const [cases, setCases] = useState<PublicCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .rpc("list_public_cases", category ? { p_category: category } : {})
      .then(({ data, error }) => {
        setError(error ? errorMessage(error) : null);
        if (!error) setCases(data ?? []);
      });
  }, [category]);

  return (
    <div className="flex-1 bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Support a family</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">
          Every case here was checked by a Jamaat verifier and approved by a different trustee. The money goes to the
          Jamaat, which pays the hospital, school or shop directly.
        </p>
        <p className="mt-3 max-w-2xl rounded-xl border border-border bg-card px-4 py-3 text-base">{CASE_PRIVACY_NOTE}</p>

        <div role="tablist" aria-label="Which cases" className="mt-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={category === t.value}
              onClick={() => {
                setCases(null);
                setCategory(t.value);
              }}
              className={`min-h-12 rounded-full border px-5 text-base font-semibold ${
                category === t.value ? "border-deep bg-deep text-white" : "border-border bg-card hover:bg-background"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error ? <div className="mt-6"><Alert>{error}</Alert></div> : null}
        {cases === null && !error ? <p className="mt-6 text-lg text-muted">Loading…</p> : null}
        {cases?.length === 0 ? <p className="mt-6 text-lg text-muted">No open cases right now.</p> : null}

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {cases?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cases/view?id=${c.id}`}
                className="block h-full rounded-2xl border border-border bg-card p-5 hover:border-brand"
              >
                <p className="text-sm font-semibold text-muted">
                  Case #{c.case_no} · {CATEGORY_LABEL[c.category]} · {CASE_TYPE_LABEL[c.type]}
                </p>
                <h2 className="mt-1 text-xl font-bold">{c.title}</h2>
                <p className="mt-2 text-base">{c.public_summary || CASE_SUMMARY_FALLBACK}</p>
                <CaseProgress raised={c.raised_amount} target={c.target_amount} funded={c.status === "funded"} />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth";

const LINKS = [
  { href: "/cases", label: "Cases" },
  { href: "/help", label: "Helpdesk" },
];

/** Header for the member pages of the website: cases, giving and the helpdesk. */
export function SiteHeader() {
  const { session, isStaff, signOut } = useAuth();
  const path = usePathname();
  // Keep the query too (a case page is /cases/view?id=…), so signing in comes back to the same case.
  const [search, setSearch] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(window.location.search);
  }, [path]);
  return (
    <header className="border-b border-border bg-paper">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-ink">
          KS1J
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-base">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path?.startsWith(l.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 font-semibold hover:bg-card ${path?.startsWith(l.href) ? "underline underline-offset-4" : ""}`}
            >
              {l.label}
            </Link>
          ))}
          {isStaff ? (
            <Link href="/admin" className="rounded-lg px-3 py-2 font-semibold hover:bg-card">
              Dashboard
            </Link>
          ) : null}
          {session ? (
            <button onClick={() => void signOut()} className="rounded-lg px-3 py-2 font-semibold hover:bg-card">
              Sign out
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(path ? path + search : "/cases")}`}
              className="rounded-lg bg-deep px-3 py-2 font-bold text-white hover:brightness-110"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

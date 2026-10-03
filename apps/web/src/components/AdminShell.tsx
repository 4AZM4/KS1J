"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { IconName } from "@ks1j/shared";
import { Icon } from "@/components/Icon";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ROLE_LABEL } from "@ks1j/shared";
import { useAuth } from "@/components/auth";
import { Button, Card } from "@/components/ui";
import { KS1JLockup } from "@/components/landing/Mark";

import type { AdminRole } from "@ks1j/shared";

// Each role sees the pages it works in, so the menu stays short. Super admins see everything.
// This only tidies the menu: what each person can read or change is still decided by Supabase RLS.
const ALL: AdminRole[] = ["volunteer", "verifier", "trustee", "finance"];
const adminNav: { href: string; label: string; icon: IconName; roles: AdminRole[] }[] = [
  { href: "/admin", label: "Overview", icon: "layout-dashboard", roles: ALL },
  { href: "/admin/cases", label: "Cases", icon: "users", roles: ALL },
  { href: "/admin/members", label: "Members to verify", icon: "user", roles: ["volunteer", "verifier"] },
  { href: "/admin/loans", label: "Education loans", icon: "cash", roles: ["trustee", "finance"] },
  { href: "/admin/khums", label: "Khums & ledgers", icon: "coin-rupee", roles: ["trustee", "finance"] },
  { href: "/admin/institutions", label: "Sehme Imam institutions", icon: "building-bank", roles: ["trustee", "finance"] },
  { href: "/admin/lawajam", label: "Lawajam", icon: "receipt", roles: ["finance"] },
  { href: "/admin/flags", label: "Fraud flags", icon: "flag", roles: ["verifier", "trustee"] },
  { href: "/admin/announcements", label: "Announcements", icon: "speakerphone", roles: ["trustee"] },
  { href: "/admin/helpdesk", label: "Helpdesk", icon: "message-question", roles: ["trustee"] },
  { href: "/admin/community", label: "Community", icon: "users-group", roles: ["verifier", "trustee"] },
];

// Access is enforced by Supabase RLS on every query. This gate only keeps non-staff
// from seeing an empty dashboard.
export function AdminShell({ children }: { children: ReactNode }) {
  const { loading, session, member, roles, isStaff, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return <p className="p-8 text-muted">Loading…</p>;
  }

  if (!isStaff) {
    return (
      <main className="mx-auto max-w-md p-8">
        <Card>
          <h1 className="text-xl font-bold">Salaam{member ? `, ${member.full_name}` : ""}</h1>
          <p className="mt-2 text-muted">
            {member?.membership_verified
              ? "Your membership is verified."
              : "Your account is created. A Jamaat verifier will confirm your membership and link you to your household."}{" "}
            Use the KS1J member app to apply for help, give and pay dues. This dashboard is for committee members.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_MEMBER_APP_URL ?? "https://4azm4.github.io/KS1J/app/"}
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-background"
          >
            Open the member app
          </a>
          <Button className="mt-4" variant="secondary" onClick={() => void signOut()}>Sign out</Button>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      <nav aria-label="Admin" className="border-b border-border bg-card p-4 sm:w-64 sm:border-b-0 sm:border-r sm:px-5 sm:py-6">
        <Link href="/" aria-label="KS1J home" className="flex items-center gap-2"><KS1JLockup size="sm" /><span className="sr-only">Committee dashboard</span></Link>
        <div className="mt-5 rounded-xl bg-background px-3 py-2.5">
          <p className="text-sm font-semibold">{member?.full_name}</p>
          <p className="text-xs text-muted">{roles.map((r) => ROLE_LABEL[r]).join(", ")}</p>
        </div>
        <ul className="mt-4 flex gap-1 overflow-x-auto sm:flex-col">
          {adminNav
            .filter((item) => roles.includes("super_admin") || item.roles.some((r) => roles.includes(r)))
            .map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-brand-soft font-semibold text-brand" : "hover:bg-background"}`}
                >
                  <Icon name={item.icon} size={20} className={active ? "text-brand" : "text-muted"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button className="text-sm text-muted underline" onClick={() => void signOut()}>Sign out</button>
          <ThemeToggle />
        </div>
      </nav>
      <main className="admin-page flex-1 p-4 sm:px-10 sm:py-9">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">Committee dashboard</p>
        {children}
      </main>
    </div>
  );
}

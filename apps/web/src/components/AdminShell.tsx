"use client";

import Link from "next/link";
import type { IconName } from "@ks1j/shared";
import { Icon } from "@/components/Icon";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ROLE_LABEL } from "@ks1j/shared";
import { useAuth } from "@/components/auth";
import { Button, Card } from "@/components/ui";

const adminNav: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Overview", icon: "layout-dashboard" },
  { href: "/admin/cases", label: "Cases", icon: "users" },
  { href: "/admin/members", label: "Members to verify", icon: "user" },
  { href: "/admin/loans", label: "Education loans", icon: "cash" },
  { href: "/admin/khums", label: "Khums & ledgers", icon: "coin-rupee" },
  { href: "/admin/institutions", label: "Sehme Imam institutions", icon: "building-bank" },
  { href: "/admin/lawajam", label: "Lawajam", icon: "receipt" },
  { href: "/admin/flags", label: "Fraud flags", icon: "flag" },
  { href: "/admin/announcements", label: "Announcements", icon: "speakerphone" },
  { href: "/admin/helpdesk", label: "Helpdesk", icon: "message-question" },
] as const;

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
      <nav aria-label="Admin" className="border-b border-border bg-card p-4 sm:w-64 sm:border-b-0 sm:border-r">
        <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-brand">KS1J Admin</Link>
        <p className="mt-3 text-sm font-semibold">{member?.full_name}</p>
        <p className="text-xs text-muted">{roles.map((r) => ROLE_LABEL[r]).join(", ")}</p>
        <ul className="mt-4 flex gap-1 overflow-x-auto sm:flex-col">
          {adminNav.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-background font-semibold text-brand" : "hover:bg-background"}`}
                >
                  <Icon name={item.icon} size={20} className={active ? "text-brand" : "text-muted"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <button className="mt-4 text-sm text-muted underline" onClick={() => void signOut()}>Sign out</button>
      </nav>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}

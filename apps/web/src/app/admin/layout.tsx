import Link from "next/link";

// Admin navigation. Every page here is for Jamaat roles only; access is enforced by
// Supabase RLS, not by hiding links. Specs: docs/modules/admin.md
const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/cases", label: "Cases" },
  { href: "/admin/loans", label: "Education loans" },
  { href: "/admin/khums", label: "Khums & ledgers" },
  { href: "/admin/institutions", label: "Sehme Imam institutions" },
  { href: "/admin/lawajam", label: "Lawajam" },
  { href: "/admin/flags", label: "Fraud flags" },
  { href: "/admin/announcements", label: "Announcements" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col sm:flex-row">
      <nav aria-label="Admin" className="border-b border-border bg-card p-4 sm:w-60 sm:border-b-0 sm:border-r">
        <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-brand">
          KS1J Admin
        </Link>
        <ul className="mt-4 flex gap-2 overflow-x-auto sm:flex-col sm:gap-1">
          {adminNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-background">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}

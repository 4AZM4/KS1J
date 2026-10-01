import { notFound } from "next/navigation";

// Placeholder for each admin section until its module is built.
// Each section's spec lives in docs/modules/.
const sections: Record<string, { title: string; spec: string; summary: string }> = {
  khums: { title: "Khums & ledgers", spec: "khums.md", summary: "Sehme Imam and Sehme Sadaat collections, kept in separate ledgers." },
  institutions: { title: "Sehme Imam institutions", spec: "khums.md", summary: "Institutions with a verified ijazah, the only valid Sehme Imam recipients." },
  lawajam: { title: "Lawajam", spec: "lawajam.md", summary: "Dues paid and outstanding by household and area." },
  flags: { title: "Fraud flags", spec: "ai-and-security.md", summary: "Duplicate phones, bank accounts, documents or households across open cases." },
  announcements: { title: "Announcements", spec: "admin.md", summary: "Publish announcements to the app and website." },
};

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function AdminSection({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  const s = sections[section];
  if (!s) notFound();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{s.title}</h1>
      <p className="mt-2 text-muted">{s.summary}</p>
      <p className="mt-6 text-sm text-muted">
        Not built yet. Spec: <code>docs/modules/{s.spec}</code>
      </p>
    </div>
  );
}

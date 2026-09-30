import Link from "next/link";

const sections = [
  {
    title: "Services",
    body: "Apply for welfare assistance, scholarships and interest-free education loans, and track every step.",
  },
  {
    title: "Give",
    body: "Calculate and pay Khums, support verified Sadaat and Non-Sadaat cases, and pay Lawajam.",
  },
  {
    title: "Learn",
    body: "Ask the Jamaat helpdesk and get answers from verified documents, with the source shown.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">KS1J</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Everything from the Jamaat in one place</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        One login for members. Every case is verified by two Jamaat admins, and every rupee is recorded.
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-2 text-base text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Announcements</h2>
        {/* TODO(module: admin/announcements): list rows from the announcements table. */}
        <p className="mt-2 text-muted">Jamaat announcements will appear here.</p>
      </section>

      <p className="mt-12 text-sm text-muted">
        Committee members: <Link href="/admin" className="font-semibold text-brand underline">admin dashboard</Link>
      </p>
    </main>
  );
}

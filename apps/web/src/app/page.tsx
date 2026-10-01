import Link from "next/link";
import { KHUMS_GUIDANCE } from "@ks1j/shared";
import { Announcements } from "@/components/landing/Announcements";
import { StarLattice } from "@/components/landing/StarLattice";

// The member app (Expo, built for the web). Defaults to the public preview.
const MEMBER_APP_URL = process.env.NEXT_PUBLIC_MEMBER_APP_URL ?? "https://4azm4.github.io/KS1J/app/";
const LEAP_URL = "https://ksijleap.com/";

const tabs = [
  {
    name: "Services",
    lead: "Ask for help and see where your request is.",
    items: [
      "Medical, education and ration assistance",
      "Scholarships, with fees paid straight to the school or college",
      "Interest-free education loans, repaid after your course and a grace period",
      "Every step of your application, as it happens",
    ],
  },
  {
    name: "Give",
    lead: "Pay what you owe and support families who need it.",
    items: [
      "Khums calculator, with Sehme Imam and Sehme Sadaat worked out for you",
      "Verified Sadaat and Non-Sadaat cases, with the amount still needed",
      "Lawajam for your household, with receipts",
    ],
  },
  {
    name: "Learn",
    lead: "Answers from the Jamaat's own sources.",
    items: [
      "Helpdesk that shows the source of every answer, or says it does not know",
      "Jobs and careers through LEAP",
      "History of the Jamaat and eMadressa, coming soon",
    ],
  },
];

const steps = [
  { title: "You apply", body: "From the app or with a volunteer. Only the committee sees your details." },
  { title: "A verifier checks", body: "Documents, need, and Sadaat lineage where it applies." },
  { title: "A different trustee approves", body: "The person who verified can never approve the same case." },
  { title: "Donors see the need", body: "Without your name, phone or address. Only what is needed and how much is left." },
  { title: "The Jamaat pays directly", body: "To the hospital, school or family, with proof recorded." },
];

const funds = [
  { fund: "Sehme Sadaat", to: "Verified Sadaat (Syed) families only" },
  { fund: "Sehme Imam", to: "Only institutions holding an ijazah from a Marja', never individuals" },
  { fund: "General donations", to: "Any verified case" },
  { fund: "Loan repayments", to: "Back into the fund for the next student" },
  { fund: "Lawajam", to: "The Jamaat's own running costs, kept apart from everything else" },
];

export default function Home() {
  return (
    <div className="flex-1 bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-ink">
          KS1J
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-base sm:gap-2">
          <a href="#what" className="hidden rounded-lg px-3 py-2 hover:bg-card sm:inline-block">
            What you can do
          </a>
          <a href="#money" className="hidden rounded-lg px-3 py-2 hover:bg-card sm:inline-block">
            Where money goes
          </a>
          <Link href="/login" className="rounded-lg px-3 py-2 font-bold hover:bg-card">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-lg bg-deep px-3 py-2 font-bold text-white hover:brightness-110">
            Create account
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero: the live member app, inside the Jamaat's star lattice */}
        <section className="px-4 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-deep text-white">
            <StarLattice className="pointer-events-none absolute inset-0 text-gold opacity-25" />
            <div className="relative grid items-center gap-10 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.15fr_auto] lg:gap-16">
              <div>
                <h1 className="max-w-[16ch] text-[2.6rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
                  Everything from the Jamaat, in one app.
                </h1>
                <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/85 sm:text-xl">
                  Ask for help, pay Khums and Lawajam, support families in need and get answers you can trust. Every
                  case is checked by two committee members, and every rupee is recorded.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={MEMBER_APP_URL}
                    className="rounded-xl bg-gold px-6 py-4 text-lg font-bold text-[#1d1a10] hover:brightness-105"
                  >
                    Open the member app
                  </a>
                  <Link href="/signup" className="rounded-xl border border-white/40 px-6 py-4 text-lg font-bold hover:bg-white/10">
                    Create an account
                  </Link>
                </div>
                <p className="mt-6 text-base text-white/70">Android and iPhone apps for members. This website for everyone.</p>
              </div>

              {/* A real, working copy of the app. Hidden on small screens, where the button is enough. */}
              <figure className="mx-auto hidden w-[300px] lg:block">
                <div className="rounded-[2.6rem] border-[10px] border-[#0a1f18] bg-[#0a1f18] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
                  <iframe
                    title="KS1J member app, live demo"
                    src={MEMBER_APP_URL}
                    className="block h-[600px] w-full rounded-[2rem] bg-white"
                    loading="lazy"
                  />
                </div>
                <figcaption className="mt-4 text-center text-sm text-white/75">
                  Try it: sign in with a demo member.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="what" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-[24ch] text-3xl font-bold tracking-tight sm:text-4xl">Four tabs. Nothing hidden in menus.</h2>
          <p className="mt-3 max-w-[60ch] text-lg text-muted">
            Large text, plain words and big buttons, so every member of the family can use it. Home shows Jamaat news;
            the other three tabs are below.
          </p>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {tabs.map((t) => (
              <div key={t.name} className="grid gap-4 py-8 md:grid-cols-[14rem_1fr] md:gap-10">
                <div>
                  <h3 className="text-2xl font-bold">{t.name}</h3>
                  <p className="mt-1 text-base text-muted">{t.lead}</p>
                </div>
                <ul className="grid gap-x-10 gap-y-3 text-lg sm:grid-cols-2">
                  {t.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true" className="mt-[0.55em] h-2 w-2 shrink-0 rotate-45 bg-gold" />
                      <span>
                        {item === "Jobs and careers through LEAP" ? (
                          <>
                            Jobs and careers through{" "}
                            <a href={LEAP_URL} className="font-bold text-brand underline underline-offset-4">
                              LEAP
                            </a>
                          </>
                        ) : (
                          item
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-[26ch] text-3xl font-bold tracking-tight sm:text-4xl">
              How a request for help is handled
            </h2>
            <p className="mt-3 max-w-[60ch] text-lg text-muted">
              No single person can approve help. The rule is enforced by the system itself, not just written down.
            </p>
            <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
              {steps.map((s, i) => (
                <li key={s.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-deep text-lg font-bold text-white">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 ? <span aria-hidden="true" className="hidden h-px flex-1 bg-border md:block" /> : null}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-base leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="money" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Where your money goes</h2>
              <p className="mt-3 max-w-[48ch] text-lg text-muted">
                Each kind of giving has its own account. The system refuses a payment to the wrong place, so Sehme
                Sadaat can never reach a Non-Sadaat case and Sehme Imam can never reach an individual.
              </p>
              <p className="mt-6 max-w-[48ch] text-base text-muted">
                Payments are confirmed by the bank before they count, and records are never edited. A correction is a
                new entry everyone can trace.
              </p>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              {funds.map((f) => (
                <div key={f.fund} className="grid gap-1 py-5 sm:grid-cols-[12rem_1fr] sm:items-baseline sm:gap-6">
                  <dt className="text-lg font-bold text-lapis">{f.fund}</dt>
                  <dd className="text-lg">{f.to}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From the Jamaat</h2>
          <div className="mt-8">
            <Announcements />
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden bg-deep text-white">
        <StarLattice id="khatam-footer" className="pointer-events-none absolute inset-0 text-gold opacity-15" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-2xl font-bold">KS1J</p>
            <p className="mt-2 max-w-[52ch] text-base text-white/80">
              For KSI Jamaat Mumbai members. On Khums: {KHUMS_GUIDANCE}
            </p>
          </div>
          <ul className="grid gap-2 text-base md:justify-self-end">
            <li>
              <a href={MEMBER_APP_URL} className="underline underline-offset-4 hover:text-gold">
                Member app
              </a>
            </li>
            <li>
              <a href={LEAP_URL} className="underline underline-offset-4 hover:text-gold">
                LEAP jobs and careers
              </a>
            </li>
            <li>
              <Link href="/login" className="underline underline-offset-4 hover:text-gold">
                Committee sign in
              </Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

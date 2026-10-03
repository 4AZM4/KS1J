import { calculateKhums, rupees, type IconName } from "@ks1j/shared";
import { Icon } from "@/components/Icon";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/* ── Before: how help moves today ─────────────────────────────────────────────────────────────── */

const scraps = [
  { kind: "form", text: "Application form", sub: "Status: ?", rot: "-rotate-6" },
  { kind: "chat", text: "Has anyone looked at my form yet?", sub: "10:42", rot: "rotate-3" },
  { kind: "note", text: "Who approved this one?", rot: "-rotate-2" },
  { kind: "ledger", text: "Sehme Imam? Sehme Sadaat? General?", sub: "Which fund was this?", rot: "rotate-6" },
  { kind: "chat", text: "Can you send the receipt photo again?", sub: "18:05", rot: "-rotate-3" },
] as const;

const scrapStyle = {
  form: "bg-[#fffdf6] text-[#3b3527]",
  chat: "bg-[#dcf3d0] text-[#1f3a2a] rounded-br-sm",
  note: "bg-[#fbe7a1] text-[#4a3b0f]",
  ledger: "bg-[#fffdf6] text-[#3b3527]",
};

/** Paper forms, office visits and forwarded messages, drawn as the scraps they are. Illustrative, not real messages. */
export function BeforeScraps() {
  return (
    <div aria-label="Today: paper forms, notes and messages" role="img" className="flex flex-wrap items-start justify-center gap-4 py-4 sm:gap-6">
      {scraps.map((s) => (
        <div
          key={s.text}
          aria-hidden="true"
          className={`${scrapStyle[s.kind]} ${s.rot} w-[15rem] rounded-2xl p-5 shadow-[0_18px_40px_-18px_rgba(2,24,17,0.55)]`}
        >
          {s.kind === "form" || s.kind === "ledger" ? (
            <p className="text-sm font-bold tracking-wide text-[#7a6a45]">{s.kind === "form" ? "Application form" : "Ledger book"}</p>
          ) : null}
          {s.kind === "form" ? (
            <div className="mt-3 space-y-2">
              <div className="h-2 w-44 rounded bg-[#d7d2c4]" />
              <div className="h-2 w-36 rounded bg-[#d7d2c4]" />
              <div className="h-2 w-40 rounded bg-[#d7d2c4]" />
            </div>
          ) : (
            <p className={`text-lg leading-snug ${s.kind === "note" ? "font-bold" : ""} ${s.kind === "ledger" ? "mt-2" : ""}`}>{s.text}</p>
          )}
          {"sub" in s && s.sub ? (
            <p className={`mt-2 ${s.kind === "chat" ? "text-right text-sm text-[#5d7a68]" : "text-base font-bold text-[#a3412f]"}`}>{s.sub}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ── The app itself: three real screens, fanned ───────────────────────────────────────────────── */

const shots = [
  { src: "home.webp", alt: "Home: reminders and Jamaat announcements", rot: "-rotate-6 translate-y-6" },
  { src: "give.webp", alt: "Give: the Khums estimate split into Sehme Imam and Sehme Sadaat", rot: "z-10" },
  { src: "helpdesk.webp", alt: "Helpdesk: an answer from an approved Jamaat text, with its source", rot: "rotate-6 translate-y-6" },
];

export function PhoneFan() {
  return (
    <div className="flex items-start justify-center">
      {shots.map((s, i) => (
        <figure
          key={s.src}
          className={`${s.rot} ${i > 0 ? "-ml-8" : ""} w-[8rem] shrink-0 overflow-hidden rounded-[1.6rem] border-[6px] border-[#0a1f18] bg-[#0a1f18] shadow-[0_24px_50px_-20px_rgba(2,24,17,0.6)] sm:w-[12rem]`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, plain image */}
          <img src={`${BASE}/shots/${s.src}`} alt={s.alt} width={585} height={1266} loading="lazy" className="block h-auto w-full rounded-[1.1rem]" />
        </figure>
      ))}
    </div>
  );
}

/* ── How a request is handled: five arches ────────────────────────────────────────────────────── */

export function ArchSteps({ steps }: { steps: { title: string; body: string; icon: IconName }[] }) {
  return (
    <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={s.title}
            className={`relative flex flex-col items-center rounded-t-[999px] rounded-b-2xl border-2 px-5 pb-6 pt-12 text-center ${
              last ? "border-gold bg-gold text-[#1d1a10]" : "border-gold/70 bg-paper"
            }`}
          >
            <span className={`grid h-14 w-14 place-items-center rounded-full bg-deep ${last ? "text-gold" : "text-[#e8cc7a]"}`}>
              <Icon name={s.icon} size={30} />
            </span>
            <span className={`mt-3 text-sm font-bold ${last ? "text-[#3b2f0e]" : "text-muted"}`}>Step {i + 1}</span>
            <h3 className="mt-1 text-lg font-bold leading-snug">{s.title}</h3>
            <p className={`mt-2 text-base leading-relaxed ${last ? "text-[#3b2f0e]" : "text-muted"}`}>{s.body}</p>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Privacy: what staff wrote, and what donors see ───────────────────────────────────────────── */

function Hidden({ label }: { label: string }) {
  return (
    <span className="mx-0.5 inline-block rounded-md bg-[#14231d] px-2 py-0.5 align-middle text-sm font-bold tracking-wide text-gold">
      {label}
    </span>
  );
}

function Personal({ children }: { children: string }) {
  return <mark className="rounded-md bg-[#f6d98b] px-1.5 text-[#1d1a10]">{children}</mark>;
}

export function Redaction() {
  return (
    <div className="grid gap-4">
      <figure className="rounded-2xl border border-border bg-background p-6">
        <figcaption className="text-base font-bold text-muted">What the committee wrote</figcaption>
        <p className="mt-3 text-xl leading-relaxed">
          <Personal>Zainab</Personal> and her husband need ration for six months. Call <Personal>+91 12345 67890</Personal>.
        </p>
      </figure>
      <p aria-hidden="true" className="pl-6 text-2xl text-gold">↓</p>
      <figure className="rounded-2xl bg-deep p-6 text-white shadow-[0_24px_50px_-24px_rgba(2,24,17,0.7)]">
        <figcaption className="text-base font-bold text-gold">What donors see</figcaption>
        <p className="mt-3 text-xl leading-relaxed">
          <Hidden label="name hidden" /> and her husband need ration for six months. Call <Hidden label="number hidden" />.
        </p>
      </figure>
    </div>
  );
}

/* ── Khums: the arithmetic as a picture ───────────────────────────────────────────────────────── */

export function KhumsPicture() {
  const surplus = 100000;
  const k = calculateKhums({ savings: surplus, unusedGoods: 0, businessSurplus: 0, exempt: 0 });
  return (
    <div className="grid gap-3" role="img" aria-label={`Example: a surplus of ${rupees(surplus)} means ${rupees(k.khumsDue)} Khums, ${rupees(k.sehmeImam)} Sehme Imam and ${rupees(k.sehmeSadaat)} Sehme Sadaat`}>
      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="text-base text-muted">Example: savings left at your Khums year-end</p>
        <p className="mt-1 text-3xl font-bold">{rupees(surplus)}</p>
      </div>
      <p className="pl-5 text-lg font-bold text-brand">↓ One fifth is Khums: {rupees(k.khumsDue)}, in two equal shares</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#27508f] p-5 text-white">
          <p className="text-base opacity-90">Sehme Imam</p>
          <p className="mt-1 text-3xl font-bold">{rupees(k.sehmeImam)}</p>
          <p className="mt-2 text-base opacity-90">To institutions with a Marja&apos;s ijazah</p>
        </div>
        <div className="rounded-2xl bg-gold p-5 text-[#1d1a10]">
          <p className="text-base">Sehme Sadaat</p>
          <p className="mt-1 text-3xl font-bold">{rupees(k.sehmeSadaat)}</p>
          <p className="mt-2 text-base">To verified Sadaat families</p>
        </div>
      </div>
    </div>
  );
}

/**
 * KS1J logo: a gold eight-pointed star (the khatam of Jamaat tiles and woodwork) on a deep green tile,
 * with a "1" in the middle: one place for the whole Jamaat. An original mark for this app; it is not the KSIJ logo.
 * Source files: docs/brand/.
 */
const STAR =
  "256.0,78.0 308.0,130.4 381.9,130.1 381.6,204.0 434.0,256.0 381.6,308.0 381.9,381.9 308.0,381.6 256.0,434.0 204.0,381.6 130.1,381.9 130.4,308.0 78.0,256.0 130.4,204.0 130.1,130.1 204.0,130.4";
const STAR_LINE =
  "256.0,106.0 300.0,149.8 362.1,149.9 362.2,212.0 406.0,256.0 362.2,300.0 362.1,362.1 300.0,362.2 256.0,406.0 212.0,362.2 149.9,362.1 149.8,300.0 106.0,256.0 149.8,212.0 149.9,149.9 212.0,149.8";
const ONE = "M264 150 H286 V334 H312 V356 H206 V334 H240 V196 L218 210 L206 190 Z";

export function KS1JMark({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="512" height="512" rx="116" fill="#0B4D3A" />
      <polygon points={STAR} fill="#C9A24A" />
      <polygon points={STAR_LINE} fill="none" stroke="#0B4D3A" strokeWidth="6" />
      <path d={ONE} fill="#0B4D3A" />
    </svg>
  );
}

/** The KS1J letters, drawn so the logo looks the same everywhere. The "1" is gold. */
export function KS1JWordmark({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  const main = tone === "light" ? "#FFFFFF" : "#0B4D3A";
  return (
    <svg viewBox="-12 -12 378 136" className={className} role="img" aria-label="KS1J">
      <g fill="none" stroke={main} strokeWidth="22">
        <path d="M11 0V112M74 0L13 66M38 50L80 112" />
        <path d="M166 22C158 9 145 2 129 2C110 2 97 13 97 29C97 62 170 50 170 83C170 100 155 110 135 110C117 110 103 102 95 88" />
        <path d="M342 0V76C342 98 329 110 309 110C292 110 281 101 276 88" />
        <path d="M210 22L232 6V112" stroke="#C9A24A" />
      </g>
    </svg>
  );
}

/** Mark and letters together, for the header and footer. */
export function KS1JLockup({ tone = "ink", size = "md" }: { tone?: "ink" | "light"; size?: "md" | "sm" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <KS1JMark className={size === "sm" ? "h-7 w-7" : "h-9 w-9"} />
      <KS1JWordmark tone={tone} className={size === "sm" ? "h-5 w-auto" : "h-6 w-auto"} />
    </span>
  );
}

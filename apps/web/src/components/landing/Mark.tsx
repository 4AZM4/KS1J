/**
 * KS1J mark: an eight-pointed star (two overlapping squares, the khatam) with a single dot at its
 * centre, for "one place". An original mark for this app; it is not the KSIJ logo.
 */
export function KS1JMark({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <rect x="11" y="11" width="26" height="26" />
        <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" />
      </g>
      <circle cx="24" cy="24" r="4.5" fill="currentColor" />
    </svg>
  );
}

/** Wordmark used in the header and footer. */
export function KS1JLockup({ tone = "ink" }: { tone?: "ink" | "light" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${tone === "light" ? "text-white" : "text-ink"}`}>
      <KS1JMark className={`h-8 w-8 ${tone === "light" ? "text-gold" : "text-brand"}`} />
      <span className="text-xl font-bold tracking-tight">KS1J</span>
    </span>
  );
}

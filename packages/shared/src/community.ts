/** Community (Learn → Community): labels shared by the app and the committee dashboard. */
export const OPPORTUNITY_KINDS = ['job', 'referral', 'business', 'mentorship'] as const;
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

export const OPPORTUNITY_KIND_LABEL: Record<OpportunityKind, string> = {
  job: 'Job',
  referral: 'Referral wanted',
  business: 'Business / collaboration',
  mentorship: 'Mentorship opening',
};

export const GROUP_KIND_LABEL = { profession: 'Profession', interest: 'Interest' } as const;

/** "AK" from "Ayaan Khunt"; "F" from "Fatema (demo)". Used for the round initials badge. */
export function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** "5 min ago", "3 h ago", "2 days ago", then a date. Plain words for elders. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  if (d < 7) return d === 1 ? 'yesterday' : `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Comma-separated text from a form → a clean list (trimmed, no blanks or duplicates, at most `max`). */
export function splitList(text: string, max: number): string[] {
  const out: string[] = [];
  for (const part of text.split(',')) {
    const v = part.trim().replace(/\s+/g, ' ');
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, max);
}

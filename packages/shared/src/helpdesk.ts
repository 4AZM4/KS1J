// Helpdesk wording and the check for questions that ask for a religious ruling.
// The helpdesk never gives rulings (CLAUDE.md rule 7); those go to the Marja' or the Jamaat's alim.
// supabase/functions/helpdesk/index.ts mirrors RULING_WORDS. Change both together.

export const HELPDESK_UNKNOWN = "I don't know that yet. Please contact the Jamaat office.";
export const HELPDESK_RULING =
  "That needs a religious ruling, which this helpdesk cannot give. Please ask your Marja' or the Jamaat's alim.";

export const RULING_WORDS = [
  'halal', 'haram', 'makrooh', 'makruh', 'mustahab', 'wajib', 'mubah', 'najis', 'tahir',
  'fatwa', 'ruling', 'permissible', 'is it allowed', 'is it permitted', 'is it sinful', 'sin to',
  'liable to khums', 'khums on', 'khums due on', 'do i owe khums', 'should i pay khums on',
  'valid namaz', 'valid salaat', 'valid prayer', 'invalidate', 'kaffara', 'qadha', 'qaza',
];

export function isRulingQuestion(question: string): boolean {
  const q = ` ${question.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ')} `;
  return RULING_WORDS.some((w) => q.includes(` ${w} `) || q.includes(` ${w}`));
}

export type HelpdeskOutcome = 'answered' | 'passages' | 'unknown' | 'ruling';

export interface HelpdeskSource {
  n: number;
  title: string;
  sourceRef: string;
  heading: string | null;
  excerpt: string;
}

export interface HelpdeskReply {
  outcome: HelpdeskOutcome;
  answer: string | null;
  sources: HelpdeskSource[];
}

/** Starter questions shown in the app and on the website. */
export const HELPDESK_EXAMPLES = [
  'What happens if I cannot pay my loan EMI?',
  'Who can see my application details?',
  'Where can Sehme Imam go?',
];

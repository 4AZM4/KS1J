// Reminders shown on the member's Home screen: loan EMIs, Khums year-end and Lawajam dues.
// Pure function, so the same rules can later drive push notifications from the server.
// Wording follows CLAUDE.md: plain words, no interest, no late fees, no pressure.

export interface ReminderInput {
  today: string; // YYYY-MM-DD
  loans: {
    planAgreed: boolean;
    status: string; // loan_status
    nextDueDate: string | null;
    agreedEmi: number | null;
    autopayActive: boolean;
    hardshipPending: boolean;
    iAmPayer: boolean;
  }[];
  khumsYearEnd: { month: number; day: number } | null;
  lawajamDue: { period: string; amount: number }[];
}

export interface Reminder {
  key: string;
  tone: 'urgent' | 'soon' | 'info';
  title: string;
  body: string;
  href: '/loan' | '/khums' | '/lawajam';
}

const DAY = 86_400_000;
const toUtc = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY);

const rs = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = (d: string) => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
};
const inDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

/** The next Khums year-end on or after `today` (YYYY-MM-DD). Clamps 31 to the month's last day. */
export function nextYearEnd(today: string, month: number, day: number): string {
  const y = Number(today.slice(0, 4));
  const make = (yr: number) => {
    const last = new Date(Date.UTC(yr, month, 0)).getUTCDate();
    return `${yr}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
  };
  return toUtc(make(y)) >= toUtc(today) ? make(y) : make(y + 1);
}

export function buildReminders(input: ReminderInput): Reminder[] {
  const out: Reminder[] = [];

  input.loans.forEach((l, i) => {
    if (l.status === 'closed' || l.status === 'converted_to_grant') return;
    if (!l.planAgreed) {
      out.push({
        key: `loan-plan-${i}`,
        tone: 'soon',
        title: 'Agree your repayment plan',
        body: 'Choose a monthly amount your family can keep paying. The loan is paid out once a trustee agrees it.',
        href: '/loan',
      });
      return;
    }
    if (l.hardshipPending) {
      out.push({
        key: `loan-hardship-${i}`,
        tone: 'info',
        title: 'Your request is with a trustee',
        body: 'Reminders are paused until they decide on your pause or lower EMI.',
        href: '/loan',
      });
      return;
    }
    if (!l.nextDueDate || l.status === 'studying' || l.status === 'grace') {
      if (l.nextDueDate) {
        const d = daysBetween(input.today, l.nextDueDate);
        if (d <= 30) {
          out.push({
            key: `loan-start-${i}`,
            tone: 'soon',
            title: `Repayments start ${inDays(Math.max(d, 0))}`,
            body: `First EMI of ${rs(l.agreedEmi)} on ${pretty(l.nextDueDate)}. ${l.autopayActive ? 'AutoPay is on.' : 'Set up AutoPay so you never miss one.'}`,
            href: '/loan',
          });
        }
      }
      return;
    }
    const d = daysBetween(input.today, l.nextDueDate);
    if (d < 0) {
      out.push({
        key: `loan-late-${i}`,
        tone: 'urgent',
        title: `EMI of ${rs(l.agreedEmi)} was due ${-d === 1 ? 'yesterday' : `${-d} days ago`}`,
        body: 'Pay when you can. If money is tight, ask for a pause or a lower EMI: there is never interest or a late fee.',
        href: '/loan',
      });
    } else if (d <= 7) {
      out.push({
        key: `loan-due-${i}`,
        tone: 'soon',
        title: `EMI of ${rs(l.agreedEmi)} due ${inDays(d)}`,
        body: l.autopayActive
          ? `AutoPay will collect it on ${pretty(l.nextDueDate)}.`
          : `Due on ${pretty(l.nextDueDate)}. ${l.iAmPayer ? 'You pay this loan.' : ''} Set up AutoPay so you never miss one.`.replace('  ', ' '),
        href: '/loan',
      });
    }
  });

  if (input.khumsYearEnd) {
    const end = nextYearEnd(input.today, input.khumsYearEnd.month, input.khumsYearEnd.day);
    const d = daysBetween(input.today, end);
    if (d <= 30) {
      out.push({
        key: 'khums-year-end',
        tone: d <= 7 ? 'soon' : 'info',
        title: `Your Khums year ends ${inDays(d)}`,
        body: `On ${pretty(end)}. Work out what is due on your savings. Confirm with your Marja' or the Jamaat's alim.`,
        href: '/khums',
      });
    }
  }

  for (const due of input.lawajamDue) {
    out.push({
      key: `lawajam-${due.period}`,
      tone: 'info',
      title: `Lawajam ${due.period}: ${rs(due.amount)} due`,
      body: 'Your household’s yearly dues to the Jamaat. Pay in a minute and get a receipt.',
      href: '/lawajam',
    });
  }

  const rank = { urgent: 0, soon: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReminders, nextYearEnd, type ReminderInput } from './reminders.ts';

const base: ReminderInput = { today: '2026-10-01', loans: [], khumsYearEnd: null, lawajamDue: [] };
const loan = { planAgreed: true, status: 'repaying', nextDueDate: '2026-10-05', agreedEmi: 2000, autopayActive: false, hardshipPending: false, iAmPayer: true };

test('an EMI due within a week is a reminder; further out is not', () => {
  assert.equal(buildReminders({ ...base, loans: [loan] })[0].title, 'EMI of ₹2,000 due in 4 days');
  assert.equal(buildReminders({ ...base, loans: [{ ...loan, nextDueDate: '2026-10-20' }] }).length, 0);
});

test('a late EMI is urgent, never mentions a fee, and points to hardship help', () => {
  const [r] = buildReminders({ ...base, loans: [{ ...loan, nextDueDate: '2026-09-21' }] });
  assert.equal(r.tone, 'urgent');
  assert.equal(r.title, 'EMI of ₹2,000 was due 10 days ago');
  assert.match(r.body, /never interest or a late fee/);
  assert.doesNotMatch(r.title + r.body, /penalt/i);
});

test('a pending hardship request replaces the EMI reminder', () => {
  const rs = buildReminders({ ...base, loans: [{ ...loan, nextDueDate: '2026-09-01', hardshipPending: true }] });
  assert.equal(rs.length, 1);
  assert.equal(rs[0].title, 'Your request is with a trustee');
});

test('an unagreed plan asks the family to agree it', () => {
  assert.equal(buildReminders({ ...base, loans: [{ ...loan, planAgreed: false }] })[0].title, 'Agree your repayment plan');
});

test('Khums year-end shows within 30 days and carries the Marja guidance', () => {
  const [r] = buildReminders({ ...base, khumsYearEnd: { month: 10, day: 20 } });
  assert.equal(r.title, 'Your Khums year ends in 19 days');
  assert.match(r.body, /Confirm with your Marja' or the Jamaat's alim/);
  assert.equal(buildReminders({ ...base, khumsYearEnd: { month: 3, day: 20 } }).length, 0);
  assert.equal(nextYearEnd('2026-10-01', 3, 20), '2027-03-20');
  assert.equal(nextYearEnd('2027-02-01', 2, 31), '2027-02-28');
});

test('urgent reminders come first', () => {
  const rs = buildReminders({
    ...base,
    lawajamDue: [{ period: '2026-27', amount: 1200 }],
    loans: [{ ...loan, nextDueDate: '2026-09-25' }],
  });
  assert.deepEqual(rs.map((r) => r.tone), ['urgent', 'info']);
});

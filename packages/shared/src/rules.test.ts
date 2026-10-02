import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDonationAllowed, canTransition } from './domain.ts';
import { calculateKhums } from './khums.ts';
import { checkEmiProposal, followUpStage, minimumEmi, monthsToRepay } from './loans.ts';

test('Sehme Sadaat only reaches Sadaat cases', () => {
  assert.equal(isDonationAllowed('sehme_sadaat', { kind: 'case', category: 'sadaat' }), true);
  assert.equal(isDonationAllowed('sehme_sadaat', { kind: 'case', category: 'non_sadaat' }), false);
  assert.equal(isDonationAllowed('sehme_sadaat', { kind: 'institution', hasVerifiedIjazah: true }), false);
});

test('Sehme Imam only reaches institutions with a verified ijazah', () => {
  assert.equal(isDonationAllowed('sehme_imam', { kind: 'institution', hasVerifiedIjazah: true }), true);
  assert.equal(isDonationAllowed('sehme_imam', { kind: 'institution', hasVerifiedIjazah: false }), false);
  assert.equal(isDonationAllowed('sehme_imam', { kind: 'case', category: 'sadaat' }), false);
  assert.equal(isDonationAllowed('sehme_imam', { kind: 'case', category: 'non_sadaat' }), false);
});

test('General donations reach any case', () => {
  assert.equal(isDonationAllowed('general', { kind: 'case', category: 'sadaat' }), true);
  assert.equal(isDonationAllowed('general', { kind: 'case', category: 'non_sadaat' }), true);
});

test('Cases cannot skip verification or approval', () => {
  assert.equal(canTransition('submitted', 'approved'), false);
  assert.equal(canTransition('submitted', 'published'), false);
  assert.equal(canTransition('verified', 'approved'), true);
});

test('Khums is 20% of surplus, split into two shares that add up', () => {
  const r = calculateKhums({ savings: 100001, unusedGoods: 0, businessSurplus: 0, exempt: 0 });
  assert.equal(r.khumsDue, 20000);
  assert.equal(r.sehmeImam + r.sehmeSadaat, r.khumsDue);
  const odd = calculateKhums({ savings: 5, unusedGoods: 0, businessSurplus: 0, exempt: 0 });
  assert.equal(odd.sehmeImam + odd.sehmeSadaat, odd.khumsDue);
  assert.throws(() => calculateKhums({ savings: -1, unusedGoods: 0, businessSurplus: 0, exempt: 0 }));
});

test('EMI can be budget-friendly but must finish within the maximum tenure', () => {
  assert.equal(minimumEmi(80000, 48), 1667);
  const low = checkEmiProposal(80000, 1000, 48);
  assert.equal(low.ok, false);
  const ok = checkEmiProposal(80000, 2000, 48);
  assert.deepEqual(ok, { ok: true, emi: 2000, months: 40 });
  assert.equal(checkEmiProposal(80000, 1667, 48).ok, true);
  assert.equal(monthsToRepay(64000, 2000), 32);
});

test('Follow-up escalates automatically and stops for a pending hardship request', () => {
  assert.equal(followUpStage(-10, false), 'none');
  assert.equal(followUpStage(-3, false), 'upcoming_reminder');
  assert.equal(followUpStage(1, false), 'missed_reminder');
  assert.equal(followUpStage(7, false), 'notify_guarantor');
  assert.equal(followUpStage(15, false), 'officer_follow_up');
  assert.equal(followUpStage(30, false), 'committee_review');
  assert.equal(followUpStage(45, true), 'paused_for_review');
});

test('dates show the day in India, not UTC', async () => {
  const { formatDate, todayInIndia } = await import('./labels.ts');
  assert.equal(formatDate('2026-10-01T20:00:00+00:00'), '2 Oct 2026');
  assert.equal(formatDate('2026-10-01T10:00:00.123456+00:00'), '1 Oct 2026');
  assert.equal(formatDate('2026-10-15'), '15 Oct 2026');
  assert.equal(todayInIndia(new Date('2026-10-01T19:00:00Z')), '2026-10-02');
});

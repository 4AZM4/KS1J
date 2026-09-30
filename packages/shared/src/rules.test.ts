import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDonationAllowed, canTransition } from './domain.ts';
import { calculateKhums } from './khums.ts';
import { monthlyInstalment } from './loans.ts';

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

test('Loan instalment is zero below the income threshold and never exceeds the balance', () => {
  const terms = { outstanding: 5000, incomeThreshold: 30000, shareOfExcessIncome: 0.2, minimumInstalment: 1000 };
  assert.equal(monthlyInstalment(25000, terms), 0);
  assert.equal(monthlyInstalment(40000, terms), 2000);
  assert.equal(monthlyInstalment(31000, terms), 1000);
  assert.equal(monthlyInstalment(200000, terms), 5000);
});

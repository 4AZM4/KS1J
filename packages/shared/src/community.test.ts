import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initials, splitList, timeAgo } from './community.ts';

test('initials skip the (demo) tag', () => {
  assert.equal(initials('Ayaan Ali Khunt'), 'AK');
  assert.equal(initials('Fatema (demo)'), 'F');
  assert.equal(initials('  '), '?');
});

test('splitList trims, de-duplicates and caps', () => {
  assert.deepEqual(splitList(' Tax, audit ,, Tax, Excel', 2), ['Tax', 'audit']);
});

test('timeAgo uses plain words', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  assert.equal(timeAgo('2026-10-03T11:59:30Z', now), 'just now');
  assert.equal(timeAgo('2026-10-03T09:00:00Z', now), '3 h ago');
  assert.equal(timeAgo('2026-10-02T09:00:00Z', now), 'yesterday');
});

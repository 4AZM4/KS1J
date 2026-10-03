import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileStoreSettings } from './files.ts';

const cfg = JSON.stringify({ apiKey: 'k', projectId: 'p', storageBucket: 'p.firebasestorage.app' });

test('file storage stays on Supabase unless Firebase is switched on and configured', () => {
  assert.equal(fileStoreSettings(undefined, cfg).provider, 'supabase');
  assert.equal(fileStoreSettings('firebase', undefined).provider, 'supabase');
  assert.equal(fileStoreSettings('firebase', '{not json').provider, 'supabase');
  assert.equal(fileStoreSettings('firebase', JSON.stringify({ apiKey: 'k' })).provider, 'supabase');
  assert.equal(fileStoreSettings('firebase', cfg).provider, 'firebase');
});

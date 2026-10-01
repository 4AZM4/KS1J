import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, STRINGS, asLang, translate } from './i18n.ts';

test('every string has all four languages', () => {
  for (const [key, entry] of Object.entries(STRINGS)) {
    for (const { code } of LANGUAGES) {
      assert.ok((entry as Record<string, string>)[code]?.trim(), `${key} is missing ${code}`);
    }
  }
});

test('values are filled in, and unknown languages fall back to English', () => {
  assert.equal(translate('gu', 'home.salaamName', { name: 'Fatema' }), 'સલામ, Fatema');
  assert.equal(asLang('fr'), 'en');
  assert.equal(asLang('ur'), 'ur');
});

test('the Khums guidance names the Marja and the alim in every language', () => {
  assert.match(translate('en', 'khums.guidance'), /Marja'.*alim/);
  assert.match(translate('ur', 'khums.guidance'), /مرجع/);
});

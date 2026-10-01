import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRulingQuestion } from './helpdesk.ts';

test('questions asking for a ruling are recognised', () => {
  for (const q of [
    'Is it halal to invest in mutual funds?',
    'Do I owe khums on my gold jewellery?',
    'Is it allowed to pray with nail polish',
    'What is the ruling on interest from a bank?',
    'Is khums due on a gift from my father?',
  ]) assert.equal(isRulingQuestion(q), true, q);
});

test('questions about Jamaat services are not treated as rulings', () => {
  for (const q of [
    'How do I pay back my education loan?',
    'How do I pay Khums in the app?',
    'Who can see my application details?',
    'When does my repayment start?',
  ]) assert.equal(isRulingQuestion(q), false, q);
});

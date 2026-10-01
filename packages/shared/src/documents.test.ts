import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDocumentName, findInstitution, findReceiptAmount } from './documents.ts';

const receipt = `Demo High School, Mumbai
FEE RECEIPT                    Receipt No: 20481
Date: 12/06/2026
Student name: Fatema Hussain     Class: IX
Tuition fee (2026-27)          Rs. 30,000.00
Exam fee                       Rs. 6,000
Total fees paid                ₹ 36,000/-
Phone: 022 2345 6789`;

test('finds the total on a school receipt, not the receipt number or phone', () => {
  assert.equal(findReceiptAmount(receipt), 36000);
});

test('falls back to the largest rupee amount when there is no total line', () => {
  assert.equal(findReceiptAmount('Consultation ₹500\nSurgery charges Rs 1,45,000\nRoom INR 5000'), 145000);
});

test('returns null when no amount is clear', () => {
  assert.equal(findReceiptAmount('Mark sheet\nMathematics 88\nScience 91'), null);
});

test('ignores a year on the total line', () => {
  assert.equal(findReceiptAmount('Total for 2026: ₹ 12,500'), 12500);
});

test('finds the student name and the school', () => {
  assert.equal(findDocumentName(receipt), 'Fatema Hussain');
  assert.equal(findInstitution(receipt), 'Demo High School, Mumbai');
  assert.equal(findDocumentName('Patient name - Abbas Ali\nWard 4'), 'Abbas Ali');
  assert.equal(findDocumentName('No name here'), null);
  assert.equal(findDocumentName('Student name: Fatema Hussain Class: IX'), 'Fatema Hussain');
});

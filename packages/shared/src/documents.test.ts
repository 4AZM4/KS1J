import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDocumentName, findInstitution, findReceiptAmount, uploadProblem } from './documents.ts';

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

test('a parent, school or bank name is not taken as the student name', () => {
  assert.equal(findDocumentName("Father's Name: Ali Khan\nName: Fatema Hussain"), 'Fatema Hussain');
  assert.equal(findDocumentName('School Name: Demo School\nStudent Name: Zahra Ali'), 'Zahra Ali');
  assert.equal(findDocumentName('Institute name: Demo College'), null);
});

test('uploadProblem explains files the bucket would refuse', () => {
  assert.equal(uploadProblem(1000, 'application/pdf'), null);
  assert.equal(uploadProblem(1000, 'image/jpeg'), null);
  assert.equal(uploadProblem(1000, '', 'scan.PDF'), null);
  assert.match(uploadProblem(1000, 'text/html') ?? '', /PDF or a photo/);
  assert.match(uploadProblem(11 * 1024 * 1024, 'application/pdf') ?? '', /10 MB/);
  assert.match(uploadProblem(0, 'application/pdf') ?? '', /empty/);
});

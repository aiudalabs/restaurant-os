// Pure tests for computeTotals (run: cd functions && npm run build && node --test test/unit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, UnknownProduct, round2 } from '../../lib/orders/totals.js';

const products = new Map([
  ['pizza', { price: 10 }],
  ['soda', { price: 1.5 }],
  ['odd', { price: 1.005 }],
]);

test('plain lines, 7 % tax', () => {
  const t = computeTotals([{ productId: 'pizza', quantity: 2 }, { productId: 'soda', quantity: 1 }], products, 0.07);
  assert.equal(t.subtotal, 21.5);
  assert.equal(t.taxAmount, 1.51);
  assert.equal(t.total, 23.01);
  assert.equal(t.itemCount, 3);
  assert.deepEqual(t.lines[0], { productId: 'pizza', unitPrice: 10, totalPrice: 20, discountAmount: 0, taxAmount: 1.4 });
});

test('modifiers add to the unit price', () => {
  const t = computeTotals([{ productId: 'pizza', quantity: 1, modifiers: [{ extraPrice: 2 }, { extraPrice: 0.5 }] }], products, 0);
  assert.equal(t.lines[0].unitPrice, 12.5);
  assert.equal(t.total, 12.5);
});

test('half-up rounding to cents', () => {
  assert.equal(round2(1.005), 1.01);
  const t = computeTotals([{ productId: 'odd', quantity: 2 }], products, 0.07);
  assert.equal(t.lines[0].unitPrice, 1.01);
  assert.equal(t.subtotal, 2.02);
  assert.equal(t.taxAmount, 0.14);
  assert.equal(t.total, 2.16);
});

test('tax is computed per line with the product rate (exempt products pay none)', () => {
  const p = new Map([['pz', { price: 10, taxRate: 0.07 }], ['agua', { price: 1, taxRate: 0 }], ['soda', { price: 1.5 }]]);
  const t = computeTotals([{ productId: 'pz', quantity: 2 }, { productId: 'agua', quantity: 1 }, { productId: 'soda', quantity: 1 }], p, 0.07);
  assert.deepEqual(t.lines.map((l) => l.taxAmount), [1.4, 0, 0.11]);
  assert.equal(t.subtotal, 22.5);
  assert.equal(t.taxAmount, 1.51);
  assert.equal(t.total, 24.01);
});

test('unknown product throws', () => {
  assert.throws(() => computeTotals([{ productId: 'nope', quantity: 1 }], products, 0), UnknownProduct);
});

test('client quantity is sanitised', () => {
  const t = computeTotals([{ productId: 'soda', quantity: -3 }], products, 0);
  assert.equal(t.itemCount, 1);
  assert.equal(t.total, 1.5);
});

// Discounts (issue #81). Per line: discount = round2(line × %), ITBMS on the discounted base.
// Same vectors as apps/fastapi_bff/tests/test_nuc.py — both sides must agree to the cent.
test('discount 25 %: tax is computed on the discounted base, per line', () => {
  const p = new Map([['pz', { price: 10, taxRate: 0.07 }], ['agua', { price: 1, taxRate: 0 }], ['odd', { price: 3.33, taxRate: 0.07 }]]);
  const t = computeTotals(
    [{ productId: 'pz', quantity: 2 }, { productId: 'agua', quantity: 1 }, { productId: 'odd', quantity: 3 }],
    p, 0.07, 25,
  );
  assert.deepEqual(t.lines.map((l) => l.discountAmount), [5, 0.25, 2.5]); // 20→5 | 1→0.25 | 9.99→2.4975→2.5
  assert.deepEqual(t.lines.map((l) => l.taxAmount), [1.05, 0, 0.52]); // 15×.07 | exempt | 7.49×.07=.5243
  assert.equal(t.subtotal, 30.99);
  assert.equal(t.discountAmount, 7.75);
  assert.equal(t.taxAmount, 1.57);
  assert.equal(t.total, 24.81); // 30.99 − 7.75 + 1.57
});

test('no discount: discountAmount is 0 and totals are unchanged', () => {
  const t = computeTotals([{ productId: 'pizza', quantity: 2 }], products, 0.07);
  assert.equal(t.discountAmount, 0);
  assert.equal(t.lines[0].discountAmount, 0);
  assert.equal(t.total, 21.4);
});

test('discount percent is clamped to 0..100', () => {
  assert.equal(computeTotals([{ productId: 'pizza', quantity: 1 }], products, 0, 150).total, 0);
  assert.equal(computeTotals([{ productId: 'pizza', quantity: 1 }], products, 0, -5).total, 10);
});

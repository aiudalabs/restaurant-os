import { describe, expect, it } from 'vitest';
import { cartItemCount, cartSubtotal, orderAmounts, round2 } from './totals';
import type { CartLine } from '../types';

const line = (unitPrice: number, quantity: number): CartLine => ({
  key: `${unitPrice}x${quantity}`,
  productId: 'p',
  productName: 'P',
  categoryId: 'c',
  unitPrice,
  quantity,
  note: '',
});

describe('round2', () => {
  it('rounds to cents', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.236)).toBe(1.24);
    expect(round2(2)).toBe(2);
  });
  it('rounds exact half-cent values up', () => {
    expect(round2(0.125)).toBe(0.13);
    expect(round2(2.5)).toBe(2.5);
  });
});

describe('cartSubtotal / cartItemCount', () => {
  it('is zero for an empty cart', () => {
    expect(cartSubtotal([])).toBe(0);
    expect(cartItemCount([])).toBe(0);
  });
  it('sums price x quantity over lines', () => {
    const lines = [line(4.5, 2), line(10, 1), line(0.75, 4)];
    expect(cartSubtotal(lines)).toBeCloseTo(22, 10);
    expect(cartItemCount(lines)).toBe(7);
  });
});

describe('orderAmounts (what createOrder stores)', () => {
  it('applies 7% ITBMS on top of the subtotal', () => {
    expect(orderAmounts([line(10, 1)], 0.07)).toEqual({ subtotal: 10, taxAmount: 0.7, total: 10.7 });
  });
  it('has no tax when taxPercent is 0', () => {
    expect(orderAmounts([line(3.25, 3)], 0)).toEqual({ subtotal: 9.75, taxAmount: 0, total: 9.75 });
  });
  it('rounds tax and total to cents', () => {
    // 3 x 3.33 = 9.99 ; tax 0.6993 -> 0.70 ; total 10.69
    expect(orderAmounts([line(3.33, 3)], 0.07)).toEqual({ subtotal: 9.99, taxAmount: 0.7, total: 10.69 });
  });
  it('does not leak float noise in the stored subtotal', () => {
    // 3 x 0.1 is 0.30000000000000004 raw
    const a = orderAmounts([line(0.1, 3)], 0);
    expect(a.subtotal).toBe(0.3);
    expect(a.total).toBe(0.3);
  });
  it('is all zeros for an empty cart', () => {
    expect(orderAmounts([], 0.07)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
  });
  it('total equals subtotal + tax in cents across many prices', () => {
    for (let cents = 1; cents <= 500; cents += 7) {
      const a = orderAmounts([line(cents / 100, 3)], 0.07);
      expect(Math.round(a.total * 100)).toBe(Math.round(a.subtotal * 100) + Math.round(a.taxAmount * 100));
    }
  });
});

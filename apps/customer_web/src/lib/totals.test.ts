import { describe, expect, it } from 'vitest';
import { cartSubtotal, orderAmounts } from './totals';
import { money } from './format';
import type { CartLine } from '../types';

const line = (unitPrice: number, quantity: number): CartLine => ({
  productId: 'p',
  productName: 'P',
  categoryId: 'c',
  unitPrice,
  quantity,
});

describe('cartSubtotal', () => {
  it('is 0 for an empty cart', () => {
    expect(cartSubtotal([])).toBe(0);
  });
  it('sums price x quantity', () => {
    expect(cartSubtotal([line(4.5, 2), line(10, 1), line(0.75, 4)])).toBeCloseTo(22, 10);
  });
});

describe('orderAmounts', () => {
  it('adds 7% ITBMS', () => {
    const a = orderAmounts([line(10, 1)], 0.07);
    expect(a.subtotal).toBe(10);
    expect(a.taxAmount).toBeCloseTo(0.7, 10);
    expect(a.total).toBeCloseTo(10.7, 10);
  });
  it('adds nothing when the branch has no tax', () => {
    expect(orderAmounts([line(5, 3)], 0)).toEqual({ subtotal: 15, taxAmount: 0, total: 15 });
  });
  it('total is always subtotal + tax', () => {
    const a = orderAmounts([line(3.33, 3), line(1.1, 2)], 0.07);
    expect(a.total).toBe(a.subtotal + a.taxAmount);
  });
  it('shows the right cents once formatted, even when the raw value has float noise', () => {
    const a = orderAmounts([line(3.33, 3)], 0.07); // 9.99 + 0.6993 = 10.6893
    expect(money(a.taxAmount)).toBe('$0.70');
    expect(money(a.total)).toBe('$10.69');
  });
  it('is all zeros for an empty cart', () => {
    expect(orderAmounts([], 0.07)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
  });
});

describe('money', () => {
  it('formats with two decimals', () => {
    expect(money(0)).toBe('$0.00');
    expect(money(10.7)).toBe('$10.70');
    expect(money(0.3000000000000004)).toBe('$0.30');
  });
});

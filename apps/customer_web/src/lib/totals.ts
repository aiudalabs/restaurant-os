import type { CartLine } from '../types';

export const cartSubtotal = (lines: CartLine[]): number =>
  lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

/** Order amounts as stored today (NOT rounded to cents). taxPercent is a fraction (0.07). */
export function orderAmounts(lines: CartLine[], taxPercent: number) {
  const subtotal = cartSubtotal(lines);
  const taxAmount = subtotal * taxPercent;
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

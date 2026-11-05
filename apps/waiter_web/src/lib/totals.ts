import type { CartLine } from '../types';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const cartSubtotal = (lines: CartLine[]): number =>
  lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

export const cartItemCount = (lines: CartLine[]): number =>
  lines.reduce((sum, l) => sum + l.quantity, 0);

/** Amounts stored on the order: tax and total rounded to cents. taxPercent is a fraction (0.07). */
export function orderAmounts(lines: CartLine[], taxPercent: number) {
  const subtotal = cartSubtotal(lines);
  const taxAmount = round2(subtotal * taxPercent);
  const total = round2(subtotal + taxAmount);
  return { subtotal: round2(subtotal), taxAmount, total };
}

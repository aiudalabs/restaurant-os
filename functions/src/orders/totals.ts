/**
 * Server-side order totals. Clients send prices for display, but the amounts
 * that get charged and invoiced are recomputed here from the products
 * collection, so a tampered cart cannot buy food for 0.01.
 */

export interface TotalsItem {
  productId: string;
  quantity: number;
  modifiers?: { extraPrice?: number }[];
}

export interface ProductPrice {
  price: number;
}

export interface TotalsLine {
  productId: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Totals {
  subtotal: number;
  taxAmount: number;
  total: number;
  itemCount: number;
  lines: TotalsLine[];
}

export class UnknownProduct extends Error {
  constructor(public readonly productId: string) {
    super(`Unknown product ${productId}`);
  }
}

/** Half-up rounding to cents (Math.round is half-up for positive numbers). */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeTotals(
  items: TotalsItem[],
  products: Map<string, ProductPrice>,
  taxPercent: number,
): Totals {
  const lines: TotalsLine[] = [];
  let subtotal = 0;
  let itemCount = 0;
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) throw new UnknownProduct(item.productId);
    const extras = (item.modifiers ?? []).reduce((s, m) => s + (typeof m.extraPrice === "number" ? m.extraPrice : 0), 0);
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unitPrice = round2(product.price + extras);
    const totalPrice = round2(unitPrice * quantity);
    lines.push({ productId: item.productId, unitPrice, totalPrice });
    subtotal = round2(subtotal + totalPrice);
    itemCount += quantity;
  }
  const taxAmount = round2(subtotal * (Number(taxPercent) || 0));
  return { subtotal, taxAmount, total: round2(subtotal + taxAmount), itemCount, lines };
}

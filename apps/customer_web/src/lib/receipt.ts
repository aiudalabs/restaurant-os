import { money } from './format';
import type { OrderDoc, OrderItemDoc } from '../types';
import type { ReceiptBranch } from './api';

// Business receipt ("Recibo de consumo") for the customer: the restaurant's own
// proof of what was consumed. NOT a fiscal document and independent of Digifact.
// Same layout as waiter_web (apps/waiter_web/src/lib/receipt.ts); there is no
// shared package yet, so keep the two in step. Amounts are the server's, never recalculated.

const METHOD_LABEL: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', yappy: 'Yappy', transfer: 'Transferencia' };

export interface ReceiptLine {
  quantity: number;
  name: string;
  note: string;
  unitPrice: string;
  total: string;
}

export interface ReceiptData {
  brandName: string;
  logoUrl: string;
  address: string;
  phone: string;
  reference: string;
  dateText: string;
  servedBy: string;
  paymentText: string;
  lines: ReceiptLine[];
  subtotal: string;
  discount: { label: string; amount: string } | null;
  tax: { label: string; amount: string };
  tip: string | null;
  total: string;
  qrUrl: string;
}

/** Where the QR leads: the restaurant's customer app (this app), same link format the table QRs use. */
export function customerAppLink(baseUrl: string, orgId: string, branchId: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) return '';
  return `${base}/?org=${encodeURIComponent(orgId)}&branch=${encodeURIComponent(branchId)}`;
}

function percentText(fraction: number): string {
  return `${Math.round(fraction * 10_000) / 100}%`;
}

export function buildReceipt(order: OrderDoc, items: OrderItemDoc[], branch: ReceiptBranch, appUrl: string): ReceiptData {
  return {
    brandName: branch.brandName || branch.name,
    logoUrl: branch.logoUrl,
    address: branch.address,
    phone: branch.phone,
    reference: order.pickupCode || order.customerName,
    dateText: new Date(order.createdAtMs).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' }),
    servedBy: '',
    paymentText: order.paymentMethod ? (METHOD_LABEL[order.paymentMethod] ?? '') : '',
    lines: items
      .filter((it) => it.status !== 'cancelled')
      .map((it) => ({
        quantity: it.quantity,
        name: it.productName,
        note: it.specialInstructions,
        unitPrice: money(it.unitPrice),
        total: money(it.totalPrice),
      })),
    subtotal: money(order.subtotal),
    discount:
      order.discountAmount > 0
        ? { label: order.discount?.name ? `Descuento ${order.discount.name}` : 'Descuento', amount: `-${money(order.discountAmount)}` }
        : null,
    tax: { label: `ITBMS ${percentText(order.taxPercent)}`, amount: money(order.taxAmount) },
    tip: order.tipAmount > 0 ? money(order.tipAmount) : null,
    total: money(order.total),
    qrUrl: customerAppLink(appUrl, branch.orgId, branch.branchId),
  };
}

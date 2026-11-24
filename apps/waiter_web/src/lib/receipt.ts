import { money } from './format';
import type { Branch, Order, OrderItem, PaymentMethod } from '../types';

// Business receipt ("Recibo de consumo"): the restaurant's own proof of what was
// consumed. It is NOT a fiscal document and does not depend on Digifact, so it
// can be printed with or without electronic invoicing. Every amount shown comes
// from the order as the server computed it; nothing is recalculated here.

const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Efectivo', card: 'Tarjeta', yappy: 'Yappy', transfer: 'Transferencia' };

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
  /** Business RUC line ("RUC 155… DV 32"); '' when not configured. */
  ruc: string;
  /** Customer data when a company was named at checkout; null otherwise. */
  customer: { name: string; ruc: string } | null;
  /** Pickup code when the order has one, otherwise who it is for. */
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
  /** Link the QR opens (the restaurant's customer app); '' = no QR. */
  qrUrl: string;
}

/** Where the QR leads: the restaurant's customer app, same link format the table QRs use. */
export function customerAppLink(baseUrl: string, orgId: string, branchId: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) return '';
  return `${base}/?org=${encodeURIComponent(orgId)}&branch=${encodeURIComponent(branchId)}`;
}

/** "RUC 155-123-456 DV 32"; '' without a RUC. */
export function rucText(ruc: string, dv: string): string {
  const r = ruc.trim();
  if (!r) return '';
  const d = dv.trim();
  return d ? `RUC ${r} DV ${d}` : `RUC ${r}`;
}

/** "ITBMS 7%": 0.07 → 7, 0.075 → 7.5. */
function percentText(fraction: number): string {
  return `${Math.round(fraction * 10_000) / 100}%`;
}

export function buildReceipt(order: Order, items: OrderItem[], branch: Branch, servedBy: string, customerUrl = ''): ReceiptData {
  return {
    brandName: branch.brandName || branch.name,
    logoUrl: branch.logoUrl,
    address: branch.address,
    phone: branch.phone,
    ruc: rucText(branch.ruc, branch.dv),
    customer: order.receiver ? { name: order.receiver.name, ruc: rucText(order.receiver.taxId, order.receiver.dv).replace(/^RUC /, '') } : null,
    reference: order.pickupCode || order.customerName,
    dateText: new Date(order.createdAtMs).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' }),
    servedBy,
    paymentText: order.paymentMethod ? METHOD_LABEL[order.paymentMethod] : '',
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
    qrUrl: customerAppLink(customerUrl, branch.orgId, branch.id),
  };
}

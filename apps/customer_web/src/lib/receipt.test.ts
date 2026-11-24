import { describe, expect, it } from 'vitest';
import { buildReceipt, customerAppLink, rucText } from './receipt';
import type { ReceiptBranch } from './api';
import type { OrderDoc, OrderItemDoc } from '../types';

const branch: ReceiptBranch = {
  orgId: 'o1', branchId: 'b1', name: 'Sucursal Centro', address: 'Calle 50', phone: '6000-0000', ruc: '155-123-456', dv: '32', brandName: 'Pick & Eat', logoUrl: '',
};
const order: OrderDoc = {
  id: 'ord1', status: 'ready', pickupCode: 'P-4F2A', customerName: 'Ana', tableNumber: '', total: 18.14, subtotal: 16.95,
  discountAmount: 0, taxAmount: 1.19, taxPercent: 0.07, tipAmount: 0, createdAtMs: Date.UTC(2026, 10, 6, 7, 22),
  paymentStatus: 'paid', receiver: null, discount: null, itemCount: 2, branchId: 'b1', paymentMethod: 'yappy', payTo: '', fiscal: null,
};
const item = (over: Partial<OrderItemDoc>): OrderItemDoc => ({
  id: 'i', productName: 'Pizza', quantity: 1, unitPrice: 5, totalPrice: 5, specialInstructions: '', status: 'done', ...over,
});

describe('buildReceipt (customer)', () => {
  it('shows the server amounts as they are', () => {
    const r = buildReceipt(order, [item({ quantity: 2, unitPrice: 5.15, totalPrice: 10.3 })], branch, '');
    expect(r.subtotal).toBe('$16.95');
    expect(r.tax).toEqual({ label: 'ITBMS 7%', amount: '$1.19' });
    expect(r.total).toBe('$18.14');
    expect(r.lines[0]).toMatchObject({ quantity: 2, unitPrice: '$5.15', total: '$10.30' });
  });

  it('leaves cancelled items out', () => {
    const r = buildReceipt(order, [item({ id: 'a' }), item({ id: 'b', productName: 'Cerveza', status: 'cancelled' })], branch, '');
    expect(r.lines.map((l) => l.name)).toEqual(['Pizza']);
  });

  it('adds discount and tip lines only when present', () => {
    expect(buildReceipt(order, [], branch, '').discount).toBeNull();
    expect(buildReceipt(order, [], branch, '').tip).toBeNull();
    const r = buildReceipt({ ...order, discountAmount: 1.7, discount: { name: 'Jubilado', amount: 1.7 }, tipAmount: 2 }, [], branch, '');
    expect(r.discount).toEqual({ label: 'Descuento Jubilado', amount: '-$1.70' });
    expect(r.tip).toBe('$2.00');
  });

  it('uses the pickup code as reference and the payment method label', () => {
    const r = buildReceipt(order, [], branch, '');
    expect(r.reference).toBe('P-4F2A');
    expect(r.paymentText).toBe('Yappy');
  });

  it('carries the app link for the QR only when configured', () => {
    expect(buildReceipt(order, [], branch, 'https://pedir.example.app').qrUrl).toBe('https://pedir.example.app/?org=o1&branch=b1');
    expect(buildReceipt(order, [], branch, '').qrUrl).toBe('');
  });
});

describe('customerAppLink', () => {
  it('refuses anything that is not https and encodes ids', () => {
    expect(customerAppLink('https://pedir.example.app//', 'o 1', 'b/1')).toBe('https://pedir.example.app/?org=o%201&branch=b%2F1');
    expect(customerAppLink('http://pedir.example.app', 'o1', 'b1')).toBe('');
    expect(customerAppLink('javascript:alert(1)', 'o1', 'b1')).toBe('');
  });
});

describe('RUC on the receipt (customer)', () => {
  it('prints the business RUC with its DV, or nothing', () => {
    expect(buildReceipt(order, [], branch, '').ruc).toBe('RUC 155-123-456 DV 32');
    expect(buildReceipt(order, [], { ...branch, ruc: '', dv: '' }, '').ruc).toBe('');
    expect(rucText('8-NT-2-1234', '')).toBe('RUC 8-NT-2-1234');
  });
  it('prints the customer company only when one was named', () => {
    expect(buildReceipt(order, [], branch, '').customer).toBeNull();
    const withCompany = { ...order, receiver: { name: 'Acme S.A.', taxId: '155-999-1', dv: '07' } };
    expect(buildReceipt(withCompany, [], branch, '').customer).toEqual({ name: 'Acme S.A.', ruc: '155-999-1 DV 07' });
  });
});


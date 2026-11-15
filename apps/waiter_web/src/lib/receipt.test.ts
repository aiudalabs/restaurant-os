import { describe, expect, it } from 'vitest';
import { buildReceipt } from './receipt';
import type { Branch, Order, OrderItem } from '../types';

const branch: Branch = {
  id: 'b1', orgId: 'o1', name: 'Sucursal Centro', menuId: 'm1', taxPercent: 0.07, showProductImages: false,
  address: 'Calle 50', phone: '6000-0000', brandName: 'Pick & Eat', logoUrl: 'https://x/logo.png',
};
const order: Order = {
  id: 'ord1', customerName: 'Mesa 4', pickupCode: '', status: 'ready', total: 18.14, subtotal: 16.95, discountAmount: 0,
  taxAmount: 1.19, taxPercent: 0.07, tipAmount: 0, itemCount: 2, createdAtMs: Date.UTC(2026, 10, 6, 7, 22),
  paymentStatus: 'paid', paymentMethod: 'cash', fiscal: null, discount: null, hasMember: false,
};
const item = (over: Partial<OrderItem>): OrderItem => ({
  id: 'i', stationId: '', productName: 'Pizza', quantity: 1, unitPrice: 5, totalPrice: 5, specialInstructions: '', status: 'done', ...over,
});

describe('buildReceipt', () => {
  it('shows the server amounts as they are', () => {
    const r = buildReceipt(order, [item({ quantity: 2, unitPrice: 5.15, totalPrice: 10.3 })], branch, 'Ana');
    expect(r.subtotal).toBe('$16.95');
    expect(r.tax).toEqual({ label: 'ITBMS 7%', amount: '$1.19' });
    expect(r.total).toBe('$18.14');
    expect(r.lines[0]).toMatchObject({ quantity: 2, unitPrice: '$5.15', total: '$10.30' });
  });

  it('leaves cancelled items out', () => {
    const r = buildReceipt(order, [item({ id: 'a' }), item({ id: 'b', productName: 'Cerveza', status: 'cancelled' })], branch, 'Ana');
    expect(r.lines.map((l) => l.name)).toEqual(['Pizza']);
  });

  it('adds a discount line only when there is one', () => {
    expect(buildReceipt(order, [], branch, 'Ana').discount).toBeNull();
    const withDiscount = { ...order, discountAmount: 1.7, discount: { name: 'Jubilado', percent: 10, amount: 1.7 } };
    expect(buildReceipt(withDiscount, [], branch, 'Ana').discount).toEqual({ label: 'Descuento Jubilado', amount: '-$1.70' });
  });

  it('adds a tip line only when there is one', () => {
    expect(buildReceipt(order, [], branch, 'Ana').tip).toBeNull();
    expect(buildReceipt({ ...order, tipAmount: 2 }, [], branch, 'Ana').tip).toBe('$2.00');
  });

  it('uses the pickup code as reference when the order has one, else who it is for', () => {
    expect(buildReceipt(order, [], branch, 'Ana').reference).toBe('Mesa 4');
    expect(buildReceipt({ ...order, pickupCode: 'P-4F2A' }, [], branch, 'Ana').reference).toBe('P-4F2A');
  });

  it('falls back to the branch name when the brand has no display name', () => {
    expect(buildReceipt(order, [], { ...branch, brandName: '' }, 'Ana').brandName).toBe('Sucursal Centro');
  });

  it('shows the payment method and a fractional tax rate', () => {
    expect(buildReceipt(order, [], branch, 'Ana').paymentText).toBe('Efectivo');
    expect(buildReceipt({ ...order, taxPercent: 0.075 }, [], branch, 'Ana').tax.label).toBe('ITBMS 7.5%');
  });
});

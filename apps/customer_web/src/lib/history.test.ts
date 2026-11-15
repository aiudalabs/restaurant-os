import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, sortHistory, statusInfo } from './history';
import type { OrderDoc } from '../types';

const order = (id: string, createdAtMs: number): OrderDoc => ({
  id, status: 'closed', pickupCode: id, customerName: 'Ana', tableNumber: '', total: 10, subtotal: 9.35, discountAmount: 0,
  taxAmount: 0.65, taxPercent: 0.07, tipAmount: 0, createdAtMs, paymentStatus: 'paid', discount: null, itemCount: 1,
  branchId: 'b1', paymentMethod: null, payTo: '', fiscal: null,
});

describe('sortHistory', () => {
  it('puts the newest order first', () => {
    expect(sortHistory([order('a', 1), order('c', 3), order('b', 2)]).map((o) => o.id)).toEqual(['c', 'b', 'a']);
  });
  it('does not change the list it receives', () => {
    const input = [order('a', 1), order('b', 2)];
    sortHistory(input);
    expect(input.map((o) => o.id)).toEqual(['a', 'b']);
  });
  it('keeps only the most recent ones', () => {
    const many = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => order(`o${i}`, i));
    const out = sortHistory(many);
    expect(out).toHaveLength(HISTORY_LIMIT);
    expect(out[0].id).toBe(`o${HISTORY_LIMIT + 4}`);
  });
  it('handles an empty list', () => {
    expect(sortHistory([])).toEqual([]);
  });
});

describe('statusInfo', () => {
  it('labels the states the customer sees', () => {
    expect(statusInfo('in_preparation')).toEqual({ label: 'En cocina', tone: 'active' });
    expect(statusInfo('closed')).toEqual({ label: 'Entregado', tone: 'done' });
    expect(statusInfo('cancelled').tone).toBe('problem');
    expect(statusInfo('pending_payment').label).toBe('Esperando pago');
  });
});

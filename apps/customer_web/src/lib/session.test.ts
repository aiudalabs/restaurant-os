import { describe, expect, it } from 'vitest';
import { ACTIVE_ORDER_TTL_MS, clearActiveOrder, loadActiveOrder, saveActiveOrder, type SavedOrder } from './session';

function fakeStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  };
}
const NOW = 1_000_000_000_000;
const order = (branchId: string, over: Partial<SavedOrder> = {}): SavedOrder => ({
  orderId: `ord-${branchId}`, pickupCode: 'P-1', customerName: 'Ana', orgId: 'o1', branchId, branchName: branchId, createdAt: NOW, ...over,
});

describe('active order per restaurant', () => {
  it('keeps one active order for each restaurant', () => {
    const s = fakeStore();
    saveActiveOrder(order('A'), s, NOW);
    saveActiveOrder(order('B'), s, NOW);
    expect(loadActiveOrder('A', s, NOW)?.orderId).toBe('ord-A');
    expect(loadActiveOrder('B', s, NOW)?.orderId).toBe('ord-B');
  });

  it('does not offer restaurant A\'s order in restaurant C', () => {
    const s = fakeStore();
    saveActiveOrder(order('A'), s, NOW);
    expect(loadActiveOrder('C', s, NOW)).toBeNull();
  });

  it('a new order replaces only that restaurant\'s entry', () => {
    const s = fakeStore();
    saveActiveOrder(order('A', { orderId: 'old' }), s, NOW);
    saveActiveOrder(order('B'), s, NOW);
    saveActiveOrder(order('A', { orderId: 'new' }), s, NOW);
    expect(loadActiveOrder('A', s, NOW)?.orderId).toBe('new');
    expect(loadActiveOrder('B', s, NOW)?.orderId).toBe('ord-B');
  });

  it('clearing one restaurant leaves the others', () => {
    const s = fakeStore();
    saveActiveOrder(order('A'), s, NOW);
    saveActiveOrder(order('B'), s, NOW);
    clearActiveOrder('A', s, NOW);
    expect(loadActiveOrder('A', s, NOW)).toBeNull();
    expect(loadActiveOrder('B', s, NOW)?.orderId).toBe('ord-B');
  });

  it('forgets orders older than 12 hours', () => {
    const s = fakeStore();
    saveActiveOrder(order('A'), s, NOW);
    expect(loadActiveOrder('A', s, NOW + ACTIVE_ORDER_TTL_MS + 1)).toBeNull();
    expect(loadActiveOrder('A', s, NOW + ACTIVE_ORDER_TTL_MS - 1)?.orderId).toBe('ord-A');
  });

  it('moves the old single-slot order into its restaurant', () => {
    const s = fakeStore({ ros_customer_active_order: JSON.stringify(order('A')) });
    expect(loadActiveOrder('A', s, NOW)?.orderId).toBe('ord-A');
    expect(s.data.ros_customer_active_order).toBeUndefined();
  });

  it('survives corrupt data and missing storage', () => {
    expect(loadActiveOrder('A', fakeStore({ ros_customer_active_orders: '{nope' }), NOW)).toBeNull();
    expect(loadActiveOrder('A', null, NOW)).toBeNull();
    expect(() => saveActiveOrder(order('A'), null, NOW)).not.toThrow();
  });
});

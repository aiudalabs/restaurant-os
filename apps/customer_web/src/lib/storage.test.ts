import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHome, saveHome } from './home';
import { clearActiveOrder, loadActiveOrder, saveActiveOrder, type SavedOrder } from './session';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
  };
}

const ORDER: SavedOrder = {
  orderId: 'o1',
  pickupCode: 'P-ABCD',
  customerName: 'Ana',
  orgId: 'org',
  branchId: 'br',
  branchName: 'Centro',
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('active order recovery', () => {
  it('round-trips', () => {
    saveActiveOrder(ORDER);
    expect(loadActiveOrder()).toEqual(ORDER);
  });

  it('drops an order older than 12h and clears it', () => {
    saveActiveOrder({ ...ORDER, createdAt: Date.now() - 12 * 3600 * 1000 - 1000 });
    expect(loadActiveOrder()).toBeNull();
    expect(localStorage.getItem('ros_customer_active_order')).toBeNull();
  });

  it('keeps an order just under 12h old', () => {
    saveActiveOrder({ ...ORDER, createdAt: Date.now() - 11 * 3600 * 1000 });
    expect(loadActiveOrder()?.orderId).toBe('o1');
  });

  it('rejects entries missing orderId or pickupCode, and corrupt JSON', () => {
    localStorage.setItem('ros_customer_active_order', JSON.stringify({ ...ORDER, pickupCode: '' }));
    expect(loadActiveOrder()).toBeNull();
    localStorage.setItem('ros_customer_active_order', 'not json');
    expect(loadActiveOrder()).toBeNull();
  });

  it('clearActiveOrder removes it', () => {
    saveActiveOrder(ORDER);
    clearActiveOrder();
    expect(loadActiveOrder()).toBeNull();
  });
});

describe('remembered home branch', () => {
  it('round-trips', () => {
    saveHome({ orgId: 'o', branchId: 'b', branchName: 'Centro', customerName: 'Ana' });
    expect(loadHome()).toEqual({ orgId: 'o', branchId: 'b', branchName: 'Centro', customerName: 'Ana' });
  });
  it('requires orgId and branchId and defaults the optional names', () => {
    localStorage.setItem('ros_customer_home', JSON.stringify({ orgId: 'o' }));
    expect(loadHome()).toBeNull();
    localStorage.setItem('ros_customer_home', JSON.stringify({ orgId: 'o', branchId: 'b' }));
    expect(loadHome()).toEqual({ orgId: 'o', branchId: 'b', branchName: '', customerName: '' });
  });
  it('returns null on corrupt data and never throws when storage is blocked', () => {
    localStorage.setItem('ros_customer_home', '{');
    expect(loadHome()).toBeNull();
    const denied = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied, removeItem: denied });
    expect(() => saveHome({ orgId: 'o', branchId: 'b', branchName: '', customerName: '' })).not.toThrow();
    expect(loadHome()).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearHome, loadHome, saveHome } from './home';
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
    expect(loadActiveOrder('br')).toEqual(ORDER);
  });

  it('drops an order older than 12h', () => {
    saveActiveOrder({ ...ORDER, createdAt: Date.now() - 12 * 3600 * 1000 - 1000 });
    expect(loadActiveOrder('br')).toBeNull();
  });

  it('keeps an order just under 12h old', () => {
    saveActiveOrder({ ...ORDER, createdAt: Date.now() - 11 * 3600 * 1000 });
    expect(loadActiveOrder('br')?.orderId).toBe('o1');
  });

  it('rejects entries missing orderId or pickupCode, and corrupt JSON', () => {
    localStorage.setItem('ros_customer_active_orders', JSON.stringify({ br: { ...ORDER, pickupCode: '' } }));
    expect(loadActiveOrder('br')).toBeNull();
    localStorage.setItem('ros_customer_active_orders', 'not json');
    expect(loadActiveOrder('br')).toBeNull();
  });

  it('clearActiveOrder removes it', () => {
    saveActiveOrder(ORDER);
    clearActiveOrder('br');
    expect(loadActiveOrder('br')).toBeNull();
  });
});

describe('remembered home branch', () => {
  it('clearHome forgets the restaurant', () => {
    saveHome({ orgId: 'o', branchId: 'b', branchName: 'Centro', customerName: 'Ana' });
    clearHome();
    expect(loadHome()).toBeNull();
  });
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

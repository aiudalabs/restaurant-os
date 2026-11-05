import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from './draft';
import type { CartLine } from '../types';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

const L: CartLine = { key: 'k', productId: 'p', productName: 'Pizza', categoryId: 'c', unitPrice: 8, quantity: 2, note: 'sin queso' };

describe('order draft', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a draft', () => {
    saveDraft('b1', { customerName: 'Ana', lines: [L] });
    expect(loadDraft('b1')).toEqual({ customerName: 'Ana', lines: [L] });
  });

  it('keeps one draft per branch', () => {
    saveDraft('b1', { customerName: 'Ana', lines: [L] });
    expect(loadDraft('b2')).toBeNull();
  });

  it('removes the stored draft when it becomes empty (no lines, blank name)', () => {
    saveDraft('b1', { customerName: 'Ana', lines: [L] });
    saveDraft('b1', { customerName: '   ', lines: [] });
    expect(loadDraft('b1')).toBeNull();
  });

  it('keeps a draft that has only a name', () => {
    saveDraft('b1', { customerName: 'Ana', lines: [] });
    expect(loadDraft('b1')).toEqual({ customerName: 'Ana', lines: [] });
  });

  it('clearDraft deletes it', () => {
    saveDraft('b1', { customerName: 'Ana', lines: [L] });
    clearDraft('b1');
    expect(loadDraft('b1')).toBeNull();
  });

  it('returns null for corrupt JSON or a payload without lines', () => {
    localStorage.setItem('waiter_draft_b1', '{nope');
    expect(loadDraft('b1')).toBeNull();
    localStorage.setItem('waiter_draft_b1', JSON.stringify({ customerName: 'x' }));
    expect(loadDraft('b1')).toBeNull();
  });

  it('defaults a missing customerName to empty', () => {
    localStorage.setItem('waiter_draft_b1', JSON.stringify({ lines: [L] }));
    expect(loadDraft('b1')?.customerName).toBe('');
  });

  it('never throws when storage is unavailable', () => {
    const denied = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied, removeItem: denied });
    expect(() => saveDraft('b1', { customerName: 'A', lines: [L] })).not.toThrow();
    expect(() => clearDraft('b1')).not.toThrow();
    expect(loadDraft('b1')).toBeNull();
  });
});

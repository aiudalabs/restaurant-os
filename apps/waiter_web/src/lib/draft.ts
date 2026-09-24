import type { CartLine } from '../types';

// The order being built is kept on this device until it is sent or discarded,
// so leaving the screen, the phone's back button or a reload never loses it.
// One draft per branch; storage failures just mean no draft (never block).

export interface OrderDraft {
  customerName: string;
  lines: CartLine[];
}

const key = (branchId: string) => `waiter_draft_${branchId}`;

export function loadDraft(branchId: string): OrderDraft | null {
  try {
    const raw = localStorage.getItem(key(branchId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<OrderDraft>;
    if (!Array.isArray(d.lines)) return null;
    return { customerName: d.customerName ?? '', lines: d.lines };
  } catch {
    return null;
  }
}

export function saveDraft(branchId: string, draft: OrderDraft): void {
  try {
    if (draft.lines.length === 0 && !draft.customerName.trim()) localStorage.removeItem(key(branchId));
    else localStorage.setItem(key(branchId), JSON.stringify(draft));
  } catch {
    /* no draft on this device */
  }
}

export function clearDraft(branchId: string): void {
  try {
    localStorage.removeItem(key(branchId));
  } catch {
    /* nothing to clear */
  }
}

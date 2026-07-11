// Persists the active order to localStorage so a customer who closes the browser
// (or refreshes) lands straight back on their tracking screen. This is the
// primary recovery path; the pickup code is the fallback for a different device.

export interface SavedOrder {
  orderId: string;
  pickupCode: string;
  customerName: string;
  orgId: string;
  branchId: string;
  branchName: string;
  createdAt: number;
}

const KEY = 'ros_customer_active_order';

export function saveActiveOrder(order: SavedOrder): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // Private mode / storage disabled — recovery via pickup code still works.
  }
}

export function loadActiveOrder(): SavedOrder | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedOrder;
    if (!parsed.orderId || !parsed.pickupCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveOrder(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

// Persists the active order to localStorage so a customer who closes the browser
// (or refreshes) lands straight back on their tracking screen. This is the
// primary recovery path; the pickup code is the fallback for a different device.
//
// One entry PER RESTAURANT (keyed by branchId): the same browser can order from
// several restaurants that use RestaurantOS, and an order of one must never show
// up as "active" in another's entry screen nor overwrite it.

export interface SavedOrder {
  orderId: string;
  pickupCode: string;
  customerName: string;
  orgId: string;
  branchId: string;
  branchName: string;
  createdAt: number;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const KEY = 'ros_customer_active_orders';
const LEGACY_KEY = 'ros_customer_active_order'; // single slot, before per-restaurant entries
// An order older than this is yesterday's: don't offer it as "active" on the home screen.
export const ACTIVE_ORDER_TTL_MS = 12 * 60 * 60 * 1000;

function defaultStore(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // storage blocked
  }
}

function fresh(o: Partial<SavedOrder> | undefined, now: number): o is SavedOrder {
  return !!o && !!o.orderId && !!o.pickupCode && now - (o.createdAt ?? 0) <= ACTIVE_ORDER_TTL_MS;
}

function readAll(store: Store, now: number): Record<string, SavedOrder> {
  const out: Record<string, SavedOrder> = {};
  try {
    const raw = store.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, SavedOrder>) : {};
    for (const [branchId, o] of Object.entries(parsed)) if (fresh(o, now)) out[branchId] = o;
    // Move a pre-existing single-slot order into its restaurant's entry.
    const legacy = store.getItem(LEGACY_KEY);
    if (legacy) {
      const o = JSON.parse(legacy) as SavedOrder;
      if (fresh(o, now) && o.branchId && !out[o.branchId]) out[o.branchId] = o;
      store.removeItem(LEGACY_KEY);
    }
  } catch {
    // Corrupt or blocked storage: behave as if there were no active order.
  }
  return out;
}

function writeAll(store: Store, all: Record<string, SavedOrder>): void {
  try {
    if (Object.keys(all).length === 0) store.removeItem(KEY);
    else store.setItem(KEY, JSON.stringify(all));
  } catch {
    // Private mode / storage disabled — recovery via pickup code still works.
  }
}

export function saveActiveOrder(order: SavedOrder, store: Store | null = defaultStore(), now = Date.now()): void {
  if (!store || !order.branchId) return;
  writeAll(store, { ...readAll(store, now), [order.branchId]: order });
}

/** The active order of THIS restaurant, or null. */
export function loadActiveOrder(branchId: string, store: Store | null = defaultStore(), now = Date.now()): SavedOrder | null {
  if (!store || !branchId) return null;
  return readAll(store, now)[branchId] ?? null;
}

export function clearActiveOrder(branchId: string, store: Store | null = defaultStore(), now = Date.now()): void {
  if (!store || !branchId) return;
  const all = readAll(store, now);
  delete all[branchId];
  writeAll(store, all);
}

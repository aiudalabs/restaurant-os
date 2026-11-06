import { Timestamp } from 'firebase/firestore';
import type { Order, OrderStatus } from '@/types/order';
import type { OrderItem } from '@/types/order-item';
import { DEFAULT_TIMEZONE, wallClock } from '@/lib/time';
import { patchOrder, store, subscribe } from './data';

const ACTIVE: OrderStatus[] = ['pending_payment', 'pending', 'confirmed', 'in_preparation', 'ready'];
const LATENCY = 120;

/** Calls back once after a short delay (so loading states show) and again on every change. */
function watch(read: () => Order[], callback: (orders: Order[]) => void) {
  const timer = window.setTimeout(() => callback(read()), LATENCY);
  const off = subscribe(() => callback(read()));
  return () => {
    window.clearTimeout(timer);
    off();
  };
}

export function watchActiveOrders(_orgId: string, _branchId: string, callback: (orders: Order[]) => void) {
  return watch(() => store().orders.filter((o) => ACTIVE.includes(o.status)), callback);
}

export function watchOrders(_orgId: string, _branchId: string, callback: (orders: Order[]) => void) {
  return watch(() => store().orders, callback);
}

export async function fetchOrdersByDateRange(_orgId: string, _branchId: string, startDate: Date, endDate: Date): Promise<Order[]> {
  return store().orders.filter((o) => {
    const ms = o.createdAt.toMillis();
    return ms >= startDate.getTime() && ms <= endDate.getTime();
  });
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  return store().items.filter((i) => i.orderId === orderId);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  patchOrder(orderId, (o) => ({ ...o, status, updatedAt: Timestamp.now() }));
}

export async function fetchTodayOrders(): Promise<Order[]> {
  const today = wallClock(Date.now(), DEFAULT_TIMEZONE).ymd;
  return store().orders.filter((o) => wallClock(o.createdAt.toMillis(), DEFAULT_TIMEZONE).ymd === today);
}

export async function fetchItemsForOrders(_orgId: string, orderIds: string[]): Promise<OrderItem[]> {
  const ids = new Set(orderIds);
  return store().items.filter((i) => ids.has(i.orderId));
}

export async function fetchProductImages(): Promise<Record<string, string>> {
  return {};
}

/** Manual Yappy: received → paid and on its way to the kitchen; not received → cancelled. */
export async function confirmManualPayment(orderId: string, received: boolean): Promise<void> {
  patchOrder(orderId, (o) => ({
    ...o,
    status: received ? 'confirmed' : 'cancelled',
    payment: received ? { ...o.payment, status: 'paid', paidAt: Timestamp.now() } : o.payment,
    updatedAt: Timestamp.now(),
  }));
}

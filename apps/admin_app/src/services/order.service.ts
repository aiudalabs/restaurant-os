import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  documentId,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { Order, OrderStatus } from '@/types/order';
import type { OrderItem } from '@/types/order-item';

export function watchActiveOrders(
  orgId: string,
  branchId: string,
  callback: (orders: Order[]) => void,
) {
  const q = query(
    collection(db, paths.orders),
    where('orgId', '==', orgId),
    where('branchId', '==', branchId),
    // pending_payment: customer orders waiting for a payment (manual Yappy / online).
    where('status', 'in', ['pending_payment', 'pending', 'confirmed', 'in_preparation', 'ready']),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
  });
}

export function watchOrders(
  orgId: string,
  branchId: string,
  callback: (orders: Order[]) => void,
) {
  const q = query(
    collection(db, paths.orders),
    where('orgId', '==', orgId),
    where('branchId', '==', branchId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
  });
}

export async function fetchOrdersByDateRange(
  orgId: string,
  branchId: string,
  startDate: Date,
  endDate: Date,
): Promise<Order[]> {
  const q = query(
    collection(db, paths.orders),
    where('orgId', '==', orgId),
    where('branchId', '==', branchId),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

export async function fetchOrderItems(
  orderId: string,
  orgId: string,
): Promise<OrderItem[]> {
  // Filter by orgId too: security rules scope order_items to the org, and a list
  // query must be constrained to only match readable docs ("rules aren't filters").
  const q = query(
    collection(db, paths.orderItems),
    where('orgId', '==', orgId),
    where('orderId', '==', orderId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrderItem);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const ref = doc(db, paths.orders, orderId);
  const data: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (status === 'closed' || status === 'cancelled') {
    data.completedAt = serverTimestamp();
  }
  await updateDoc(ref, data);
}

export async function fetchTodayOrders(
  orgId: string,
  branchId: string,
): Promise<Order[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return fetchOrdersByDateRange(orgId, branchId, startOfDay, endOfDay);
}

// Firestore `in` accepts at most 30 values per query.
const IN_LIMIT = 30;
function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += IN_LIMIT) out.push(list.slice(i, i + IN_LIMIT));
  return out;
}

/** Items of several orders (batched `in` queries, scoped to the org for the rules). */
export async function fetchItemsForOrders(orgId: string, orderIds: string[]): Promise<OrderItem[]> {
  if (!orgId || orderIds.length === 0) return [];
  const snaps = await Promise.all(
    chunks(orderIds).map((ids) =>
      getDocs(query(collection(db, paths.orderItems), where('orgId', '==', orgId), where('orderId', 'in', ids))),
    ),
  );
  return snaps.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrderItem));
}

/** productId → imageUrl for the given products (those with a photo). */
export async function fetchProductImages(productIds: string[]): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};
  const snaps = await Promise.all(
    chunks(productIds).map((ids) => getDocs(query(collection(db, paths.products), where(documentId(), 'in', ids)))),
  );
  const images: Record<string, string> = {};
  snaps.forEach((snap) =>
    snap.docs.forEach((d) => {
      const url = d.data().imageUrl;
      if (typeof url === 'string' && url) images[d.id] = url;
    }),
  );
  return images;
}

/** Manual Yappy: the payment arrived (order goes to the kitchen) or not (cancelled). */
export async function confirmManualPayment(orderId: string, received: boolean): Promise<void> {
  await httpsCallable<{ orderId: string; received: boolean }, { status: string }>(
    functions,
    'confirmManualPayment',
  )({ orderId, received });
}

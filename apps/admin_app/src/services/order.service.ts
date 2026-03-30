import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { Order } from '@/types/order';
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
    where('status', 'in', ['pending', 'confirmed', 'in_preparation', 'ready']),
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
): Promise<OrderItem[]> {
  const q = query(
    collection(db, paths.orderItems),
    where('orderId', '==', orderId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrderItem);
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

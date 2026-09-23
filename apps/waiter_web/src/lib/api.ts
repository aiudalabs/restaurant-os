import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { paths } from './paths';
import type {
  Branch,
  CartLine,
  Category,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
} from '../types';

export const BRANCH_NOT_FOUND = 'Sucursal no encontrada';

export async function loadBranch(branchId: string): Promise<Branch> {
  const snap = await getDoc(doc(db, paths.branches, branchId));
  if (!snap.exists()) throw new Error(BRANCH_NOT_FOUND);
  const d = snap.data();
  return {
    id: snap.id,
    orgId: d.orgId,
    name: d.name ?? 'Sucursal',
    menuId: d.menuId ?? '',
    taxPercent: typeof d.taxPercent === 'number' ? d.taxPercent : 0,
  };
}

export interface MenuData {
  categories: Category[];
  products: Product[];
}

export async function loadMenu(menuId: string): Promise<MenuData> {
  if (!menuId) return { categories: [], products: [] };
  const [catsSnap, prodsSnap] = await Promise.all([
    getDocs(
      query(collection(db, paths.categories), where('menuId', '==', menuId), where('isActive', '==', true)),
    ),
    getDocs(
      query(collection(db, paths.products), where('menuId', '==', menuId), where('isActive', '==', true)),
    ),
  ]);
  const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;
  const categories = catsSnap.docs
    .map((d) => ({ id: d.id, name: d.data().name ?? '', sortOrder: d.data().sortOrder ?? 0 }))
    .sort(bySort);
  const products = prodsSnap.docs
    .map((d) => {
      const p = d.data();
      return {
        id: d.id,
        categoryId: p.categoryId ?? '',
        name: p.name ?? '',
        description: p.description ?? '',
        price: typeof p.price === 'number' ? p.price : 0,
        sortOrder: p.sortOrder ?? 0,
      };
    })
    .sort(bySort);
  return { categories, products };
}

/**
 * Creates the order + its items in one batch. There are no tables: the
 * customer's name goes in tableNumber so the KDS shows it on the ticket.
 * source 'waiter' makes onOrderCreated route items to the KDS immediately;
 * stationId is assigned server-side. Payment is collected in person later.
 */
export async function createOrder(branch: Branch, customerName: string, lines: CartLine[]): Promise<string> {
  const uid = auth.currentUser?.uid ?? '';
  const name = customerName.trim();
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const taxAmount = round2(subtotal * branch.taxPercent);
  const total = round2(subtotal + taxAmount);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const batch = writeBatch(db);
  const orderRef = doc(collection(db, paths.orders));

  batch.set(orderRef, {
    id: orderRef.id,
    orgId: branch.orgId,
    branchId: branch.id,
    tableId: '',
    tableNumber: name,
    customerName: name,
    source: 'waiter',
    createdByUid: uid,
    status: 'pending',
    subtotal: round2(subtotal),
    taxAmount,
    taxPercent: branch.taxPercent,
    tipAmount: 0,
    total,
    notes: '',
    itemCount,
    payment: { method: null, status: 'pending' },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  for (const line of lines) {
    const itemRef = doc(collection(db, paths.orderItems));
    batch.set(itemRef, {
      id: itemRef.id,
      orgId: branch.orgId,
      branchId: branch.id,
      orderId: orderRef.id,
      createdByUid: uid,
      stationId: '',
      tableNumber: name,
      productId: line.productId,
      productName: line.productName,
      categoryId: line.categoryId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice: round2(line.unitPrice * line.quantity),
      modifiers: [],
      specialInstructions: line.note.trim(),
      status: 'queued',
      sentToStationAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return orderRef.id;
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_preparation', 'ready'];

function mapOrder(id: string, d: DocumentData): Order {
  return {
    id,
    customerName: d.customerName ?? d.tableNumber ?? 'Cliente',
    status: d.status ?? 'pending',
    total: typeof d.total === 'number' ? d.total : 0,
    itemCount: d.itemCount ?? 0,
    createdAtMs: d.createdAt?.toMillis?.() ?? Date.now(),
    paymentStatus: d.payment?.status ?? null,
    paymentMethod: d.payment?.method ?? null,
  };
}

/**
 * Live list of open orders for the branch. Equality/`in` filters only (served
 * without a composite index); sorted client-side, oldest first. orgId is
 * required so the query passes the org-isolation security rules.
 */
export function watchActiveOrders(
  orgId: string,
  branchId: string,
  onData: (orders: Order[]) => void,
  onError: (msg: string) => void,
): () => void {
  const q = query(
    collection(db, paths.orders),
    where('orgId', '==', orgId),
    where('branchId', '==', branchId),
    where('status', 'in', ACTIVE_STATUSES),
  );
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map((d) => mapOrder(d.id, d.data()));
      orders.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onData(orders);
    },
    (err) => onError(err.message),
  );
}

export function watchOrderItems(
  orgId: string,
  orderId: string,
  onData: (items: OrderItem[]) => void,
): () => void {
  const q = query(
    collection(db, paths.orderItems),
    where('orgId', '==', orgId),
    where('orderId', '==', orderId),
  );
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          productName: d.data().productName ?? '',
          quantity: d.data().quantity ?? 1,
          specialInstructions: d.data().specialInstructions ?? '',
          status: d.data().status ?? 'queued',
        })),
      ),
    (err) => console.error('[waiter] order items listener failed', err),
  );
}

/**
 * Records a payment collected in person. Does NOT change the order status:
 * the kitchen drives it (onOrderItemUpdated would overwrite it to 'ready').
 */
export async function recordPayment(orderId: string, method: PaymentMethod): Promise<void> {
  await updateDoc(doc(db, paths.orders, orderId), {
    'payment.method': method,
    'payment.status': 'paid',
    'payment.paidAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Paid + ready + handed to the customer → the order is done. */
export async function closeOrder(orderId: string): Promise<void> {
  await updateDoc(doc(db, paths.orders, orderId), {
    status: 'closed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

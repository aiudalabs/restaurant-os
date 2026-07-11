import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, ensureAnonAuth } from './firebase';
import { paths } from './paths';
import { generatePickupCode } from './pickup';
import type {
  Branch,
  CartLine,
  Category,
  OrderDoc,
  OrderItemDoc,
  Product,
} from '../types';

export interface MenuData {
  branch: Branch;
  categories: Category[];
  products: Product[];
}

export async function loadBranch(branchId: string): Promise<Branch> {
  await ensureAnonAuth();
  const snap = await getDoc(doc(db, paths.branches, branchId));
  if (!snap.exists()) throw new Error('Sucursal no encontrada');
  const data = snap.data();
  return {
    id: snap.id,
    orgId: data.orgId,
    name: data.name ?? 'Restaurante',
    menuId: data.menuId,
  };
}

export async function loadMenu(branchId: string): Promise<MenuData> {
  const branch = await loadBranch(branchId);

  const [catsSnap, prodsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, paths.categories),
        where('menuId', '==', branch.menuId),
        where('isActive', '==', true),
      ),
    ),
    getDocs(
      query(
        collection(db, paths.products),
        where('menuId', '==', branch.menuId),
        where('isActive', '==', true),
      ),
    ),
  ]);

  const bySort = <T extends { sortOrder: number }>(a: T, b: T) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

  const categories = catsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Category)
    .sort(bySort);
  const products = prodsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Product)
    .sort(bySort);

  return { branch, categories, products };
}

/**
 * Resolves the tax rate for checkout: branch override, else org default, else 0.
 * Anonymous clients may read organizations/branches per security rules.
 */
export async function loadTaxPercent(orgId: string, branchId: string): Promise<number> {
  await ensureAnonAuth();
  const [branchSnap, orgSnap] = await Promise.all([
    getDoc(doc(db, paths.branches, branchId)),
    getDoc(doc(db, paths.organizations, orgId)),
  ]);
  const branchTax = branchSnap.data()?.taxPercent;
  if (typeof branchTax === 'number') return branchTax;
  const orgTax = orgSnap.data()?.defaultTaxPercent;
  return typeof orgTax === 'number' ? orgTax : 0;
}

export interface CreateOrderInput {
  branch: Branch;
  customerName: string;
  lines: CartLine[];
  notes: string;
  taxPercent: number;
  // When true the order is created as 'pending_payment' and is NOT routed to the
  // kitchen until the BFF confirms payment. When false (demo / pay-at-counter)
  // it goes straight to the KDS via onOrderCreated.
  requirePayment: boolean;
}

export interface CreatedOrder {
  orderId: string;
  pickupCode: string;
  total: number;
}

/**
 * Creates the order + its items in a single batch (mirrors client_app's
 * cart submit). stationId is left empty — the onOrderCreated Cloud Function
 * routes each item to a station server-side (anon clients can't read stations).
 * tableNumber carries the pickup code so the KDS/counter can call the number.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  await ensureAnonAuth();
  const { branch, customerName, lines, notes, taxPercent, requirePayment } = input;

  const pickupCode = generatePickupCode();
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const taxAmount = subtotal * taxPercent;
  const total = subtotal + taxAmount;
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const batch = writeBatch(db);
  const orderRef = doc(collection(db, paths.orders));

  batch.set(orderRef, {
    id: orderRef.id,
    orgId: branch.orgId,
    branchId: branch.id,
    tableId: '', // no physical table — pickup/counter service
    tableNumber: pickupCode,
    source: 'qr',
    customerName: customerName || 'Cliente',
    pickupCode,
    status: requirePayment ? 'pending_payment' : 'pending',
    subtotal,
    taxAmount,
    taxPercent,
    tipAmount: 0,
    total,
    notes,
    itemCount,
    payment: { method: null, status: requirePayment ? 'pending' : null },
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
      stationId: '', // assigned by onOrderCreated
      tableNumber: pickupCode,
      productId: line.productId,
      productName: line.productName,
      categoryId: line.categoryId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice: line.unitPrice * line.quantity,
      modifiers: [],
      specialInstructions: '',
      status: 'queued',
      sentToStationAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return { orderId: orderRef.id, pickupCode, total };
}

function mapOrder(id: string, data: Record<string, unknown>): OrderDoc {
  return {
    id,
    status: (data.status as OrderDoc['status']) ?? 'pending',
    pickupCode: (data.pickupCode as string) ?? (data.tableNumber as string) ?? '',
    customerName: (data.customerName as string) ?? 'Cliente',
    tableNumber: (data.tableNumber as string) ?? '',
    total: (data.total as number) ?? 0,
    itemCount: (data.itemCount as number) ?? 0,
    branchId: (data.branchId as string) ?? '',
  };
}

/** Live subscription to an order + its items for the tracking screen. */
export function watchOrder(
  orderId: string,
  cb: (order: OrderDoc | null, items: OrderItemDoc[]) => void,
): () => void {
  let latestOrder: OrderDoc | null = null;
  let latestItems: OrderItemDoc[] = [];

  const unsubOrder = onSnapshot(doc(db, paths.orders, orderId), (snap) => {
    latestOrder = snap.exists() ? mapOrder(snap.id, snap.data()) : null;
    cb(latestOrder, latestItems);
  });

  const unsubItems = onSnapshot(
    query(collection(db, paths.orderItems), where('orderId', '==', orderId)),
    (snap) => {
      latestItems = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            productName: d.data().productName,
            quantity: d.data().quantity,
            status: d.data().status,
          }) as OrderItemDoc,
      );
      cb(latestOrder, latestItems);
    },
  );

  return () => {
    unsubOrder();
    unsubItems();
  };
}

/**
 * Recovers an order by its pickup code (different device / cleared storage).
 * Equality-only query — no composite index required.
 */
export async function findOrderByPickupCode(
  pickupCode: string,
  branchId?: string,
): Promise<OrderDoc | null> {
  await ensureAnonAuth();
  const constraints = [where('pickupCode', '==', pickupCode)];
  if (branchId) constraints.push(where('branchId', '==', branchId));
  const snap = await getDocs(
    query(collection(db, paths.orders), ...constraints, limit(1)),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapOrder(d.id, d.data());
}

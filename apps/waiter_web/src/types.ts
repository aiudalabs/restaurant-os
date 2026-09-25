export interface Session {
  uid: string;
  orgId: string;
  branchIds: string[];
  displayName: string;
}

export interface RosterWaiter {
  uid: string;
  displayName: string;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  menuId: string;
  taxPercent: number; // fraction, e.g. 0.07
  showProductImages: boolean; // admin toggle, off by default
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  /** Admin note for waiters, shown small under the name. */
  waiterNote: string;
  imageUrl: string;
  price: number;
  sortOrder: number;
}

export interface CartLine {
  key: string;
  productId: string;
  productName: string;
  categoryId: string;
  unitPrice: number;
  quantity: number;
  note: string;
}

// OrderStatus in FIREBASE_SCHEMA.md. Kitchen drives it via onOrderCreated /
// onOrderItemUpdated; the waiter only sets 'closed' after delivering.
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_preparation'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'closed';

export type PaymentMethod = 'cash' | 'card' | 'yappy';

export interface Order {
  id: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAtMs: number;
  paymentStatus: 'pending' | 'paid' | null;
  paymentMethod: PaymentMethod | null;
}

export type ItemStatus = 'queued' | 'in_progress' | 'done' | 'cancelled';

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  specialInstructions: string;
  status: ItemStatus;
}

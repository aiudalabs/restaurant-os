export interface Branch {
  id: string;
  orgId: string;
  name: string;
  menuId: string;
}

export interface Category {
  id: string;
  orgId: string;
  menuId: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  orgId: string;
  menuId: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  tags?: string[];
  preparationMinutes?: number;
}

export interface CartLine {
  productId: string;
  productName: string;
  categoryId: string;
  unitPrice: number;
  quantity: number;
}

// Order lifecycle used by the tracking screen. Mirrors OrderStatus in
// FIREBASE_SCHEMA.md, plus the payment states the BFF sets:
//   pending_payment → (customer pays) → paid → confirmed → in_preparation → …
//   pending_payment → (declined)      → payment_failed
// Without prepayment, onOrderCreated flips 'pending' → 'confirmed' directly.
export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'paid'
  | 'pending'
  | 'confirmed'
  | 'in_preparation'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'closed';

export interface OrderDoc {
  id: string;
  status: OrderStatus;
  pickupCode: string;
  customerName: string;
  tableNumber: string;
  total: number;
  itemCount: number;
  branchId: string;
}

// ItemStatus in FIREBASE_SCHEMA.md.
export type ItemStatus = 'queued' | 'in_progress' | 'done' | 'cancelled';

export interface OrderItemDoc {
  id: string;
  productName: string;
  quantity: number;
  status: ItemStatus;
}

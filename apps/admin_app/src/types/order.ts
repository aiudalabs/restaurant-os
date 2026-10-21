import type { Timestamp } from 'firebase/firestore';

export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'pending'
  | 'confirmed'
  | 'in_preparation'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'closed';

export type PaymentMethod = 'cash' | 'card' | 'yappy' | 'transfer';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface OrderPayment {
  method: PaymentMethod | null;
  status: PaymentStatus | null;
  yappyOrderId?: string;
  confirmationNumber?: string;
  paidAt?: Timestamp;
  /** Manual Yappy: handle the customer pays to. */
  payTo?: string;
  /** uid of the staff member who collected, or 'bff' for the card callback. */
  recordedBy?: string;
  /** Manual Yappy: uid of the staff member who confirmed / rejected. */
  reviewedBy?: string;
}

export interface Order {
  id: string;
  orgId: string;
  branchId: string;
  tableId: string;
  tableNumber: string;
  /** Waiter and customer-web orders carry who it is for and the pickup number. */
  customerName?: string;
  pickupCode?: string;
  source?: 'waiter' | 'qr' | 'zaveli';
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  taxPercent: number;
  tipAmount: number;
  total: number;
  notes?: string;
  payment: OrderPayment;
  itemCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

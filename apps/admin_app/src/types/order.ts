import type { Timestamp } from 'firebase/firestore';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_preparation'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'closed';

export type PaymentMethod = 'cash' | 'card' | 'yappy';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface OrderPayment {
  method: PaymentMethod | null;
  status: PaymentStatus | null;
  yappyOrderId?: string;
  confirmationNumber?: string;
  paidAt?: Timestamp;
}

export interface Order {
  id: string;
  orgId: string;
  branchId: string;
  tableId: string;
  tableNumber: string;
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

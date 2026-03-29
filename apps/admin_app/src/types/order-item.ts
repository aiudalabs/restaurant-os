import type { Timestamp } from 'firebase/firestore';

export type ItemStatus = 'queued' | 'in_progress' | 'done' | 'cancelled';

export interface OrderItemModifier {
  name: string;
  value: string;
  extraPrice: number;
}

export interface OrderItem {
  id: string;
  orgId: string;
  branchId: string;
  orderId: string;
  stationId: string;
  tableNumber: string;
  productId: string;
  productName: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: OrderItemModifier[];
  specialInstructions?: string;
  status: ItemStatus;
  sentToStationAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

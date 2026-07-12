export type ItemStatus = 'queued' | 'in_progress' | 'done' | 'cancelled';

export interface KdsItem {
  rtdbKey: string; // "{orderId}_{firestoreItemId}"
  productName: string;
  quantity: number;
  status: ItemStatus;
  specialInstructions?: string;
}

export interface KdsTicket {
  orderId: string;
  tableNumber: string;
  displayNumber: string;
  receivedAt: number; // ms epoch
  items: KdsItem[];
}

export interface Session {
  uid: string;
  orgId: string;
  stationId: string;
  stationName: string;
  displayName: string;
}

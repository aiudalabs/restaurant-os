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

/** Customer data for an invoice with a named receiver (01 = contribuyente, 02 = consumidor final). */
export interface InvoiceRequest {
  receiverType: '01' | '02';
  taxId: string;
  dv?: string;
  name: string;
  email?: string;
}

export type FiscalStatus = 'pending' | 'issuing' | 'issued' | 'error' | 'skipped';

/** Electronic invoice of the order, written only by the BFF / Cloud Functions. */
export interface OrderFiscal {
  status: FiscalStatus;
  numeroDF?: string;
  billingPoint?: string;
  cufe?: string;
  qrUrl?: string;
  pdfUrl?: string;
  pdfPath?: string;
  xmlUrl?: string;
  issuedAt?: Timestamp;
  attempts: number;
  lastError?: string;
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
  invoiceRequest?: InvoiceRequest;
  fiscal?: OrderFiscal;
}

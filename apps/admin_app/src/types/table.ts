export interface Table {
  id: string;
  orgId: string;
  branchId: string;
  number: string;
  zone?: string;
  capacity: number;
  qrData: string;
  isActive: boolean;
  currentOrderId?: string;
}

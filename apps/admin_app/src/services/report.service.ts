import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export interface OrderReportParams {
  orgId: string;
  branchId: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
}

/** Response of the getOrderReports callable (functions/src/reports/get-order-reports.ts). */
export interface OrderReportData {
  totalOrders: number;
  totalRevenue: number; // paid orders only
  averageTicket: number;
  cancelledOrders: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  ordersByStatus: Record<string, number>;
  dailyRevenue: Array<{
    date: string; // YYYY-MM-DD in the org's timezone
    revenue: number;
    orders: number;
  }>;
  /** One row per order in the period (cancelled included) — for the CSV export. */
  orders: OrderReportRow[];
}

export interface OrderReportRow {
  id: string;
  date: string; // YYYY-MM-DD, org timezone
  time: string; // HH:mm, org timezone
  label: string; // customer name (waiter), pickup code (QR) or table
  source: string;
  status: string;
  items: string; // "3 Pasta Alfredo; 1 Tiramisú"
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}

export async function getOrderReports(
  params: OrderReportParams,
): Promise<OrderReportData> {
  const fn = httpsCallable<OrderReportParams, OrderReportData>(
    functions,
    'getOrderReports',
  );
  const result = await fn(params);
  return result.data;
}

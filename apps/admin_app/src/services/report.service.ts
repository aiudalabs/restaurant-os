import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export interface OrderReportParams {
  orgId: string;
  branchId: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
}

export interface OrderReportData {
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  cancelledOrders: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  ordersByStatus: Record<string, number>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
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

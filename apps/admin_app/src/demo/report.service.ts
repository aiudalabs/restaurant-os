import type { OrderReportData, OrderReportParams } from '@/services/report.service';
import { buildLastWeekRows } from './data';

export async function getOrderReports(params: OrderReportParams): Promise<OrderReportData> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  const orders = buildLastWeekRows(params.startDate);
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  return {
    totalOrders: orders.length,
    totalRevenue: revenue,
    averageTicket: orders.length ? revenue / orders.length : 0,
    cancelledOrders: 0,
    topProducts: [],
    ordersByStatus: { closed: orders.length },
    dailyRevenue: [],
    orders,
  };
}

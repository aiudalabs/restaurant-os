import { useQuery } from '@tanstack/react-query';
import { getOrderReports, type OrderReportRow } from '@/services/report.service';
import { dayRange } from '@/lib/time';

/**
 * Order rows of one calendar day (org timezone) from getOrderReports.
 * Used for "the same weekday last week" on the day curve: a past day does not
 * change, so it is cached for ten minutes and fetched once per branch and date.
 */
export function useDayReport(orgId: string, branchId: string, ymd: string, tz: string) {
  return useQuery<OrderReportRow[]>({
    queryKey: ['order-report-day', orgId, branchId, ymd, tz],
    enabled: !!orgId && !!branchId && !!ymd,
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { start, end } = dayRange(ymd, tz);
      const data = await getOrderReports({ orgId, branchId, startDate: start, endDate: end });
      return data.orders;
    },
  });
}

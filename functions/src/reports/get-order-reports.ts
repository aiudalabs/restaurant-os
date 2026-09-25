import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface ReportRequest {
  orgId: string;
  branchId: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
}

/**
 * Response contract — must match OrderReportData in
 * apps/admin_app/src/services/report.service.ts (the only consumer).
 */
interface ProductCount {
  productName: string;
  quantity: number;
  revenue: number;
}

interface DailyRevenue {
  date: string; // YYYY-MM-DD in the organization's timezone
  revenue: number;
  orders: number;
}

/** One row per order, for the CSV export (cancelled orders included). */
interface OrderRow {
  id: string;
  date: string; // YYYY-MM-DD, org timezone
  time: string; // HH:mm, org timezone
  label: string; // tableNumber: customer name (waiter), pickup code (QR) or table
  source: string; // waiter | qr | …
  status: string;
  items: string; // "3 Pasta Alfredo; 1 Tiramisú"
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod: string; // cash | card | yappy | ""
  paymentStatus: string; // paid | pending | ""
}

interface OrderReportData {
  totalOrders: number; // non-cancelled
  totalRevenue: number; // paid orders only (money actually collected)
  averageTicket: number; // totalRevenue / paid orders
  cancelledOrders: number;
  topProducts: ProductCount[];
  ordersByStatus: Record<string, number>; // every status, cancelled included
  dailyRevenue: DailyRevenue[];
  orders: OrderRow[];
}

const DEFAULT_TIMEZONE = "America/Panama";
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Date formatter for a timezone; falls back to Panamá if the zone is invalid. */
function formatter(locale: string, opts: Intl.DateTimeFormatOptions, timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone });
  } catch {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: DEFAULT_TIMEZONE });
  }
}

/**
 * getOrderReports — Callable function
 *
 * Generates aggregated order reports for the admin dashboard.
 * Only accessible by managers and admins of the org.
 */
export const getOrderReports = functions.https.onCall(
  async (data: ReportRequest, context) => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated."
      );
    }

    const callerUid = context.auth.uid;
    const firestore = admin.firestore();

    // 2. Verify caller is manager or admin of the org
    const callerDoc = await firestore.collection("users").doc(callerUid).get();
    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "User document not found."
      );
    }

    const callerData = callerDoc.data()!;
    if (
      !["admin", "manager"].includes(callerData.role) ||
      callerData.orgId !== data.orgId
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only managers or admins of the organization can access reports."
      );
    }

    // 3. Validate input
    if (!data.orgId || !data.branchId || !data.startDate || !data.endDate) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: orgId, branchId, startDate, endDate."
      );
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid date format. Use ISO 8601."
      );
    }

    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    try {
      // 4. Orders in the date range (cancelled included: they are reported apart)
      const [ordersSnap, orgSnap] = await Promise.all([
        firestore
          .collection("orders")
          .where("branchId", "==", data.branchId)
          .where("createdAt", ">=", startTimestamp)
          .where("createdAt", "<=", endTimestamp)
          .get(),
        firestore.collection("organizations").doc(data.orgId).get(),
      ]);
      const tz = (orgSnap.data()?.timezone as string) || DEFAULT_TIMEZONE;
      const toDay = formatter("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }, tz); // YYYY-MM-DD
      const toTime = formatter("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, tz); // HH:mm

      const all = ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, unknown> & { id: string });
      const active = all.filter((o) => o.status !== "cancelled");

      // 5. Revenue = paid orders; daily buckets use the org's local day
      let totalRevenue = 0;
      let paidOrderCount = 0;
      const days = new Map<string, DailyRevenue>();
      for (const o of active) {
        const createdAt = o.createdAt as admin.firestore.Timestamp | undefined;
        const date = createdAt ? toDay.format(createdAt.toDate()) : "sin-fecha";
        const day = days.get(date) ?? { date, revenue: 0, orders: 0 };
        day.orders++;
        const payment = o.payment as Record<string, unknown> | undefined;
        if (payment?.status === "paid") {
          const total = (o.total as number) ?? 0;
          totalRevenue += total;
          paidOrderCount++;
          day.revenue += total;
        }
        days.set(date, day);
      }

      // 6. Items of every order (detail export); top products count only
      //    non-cancelled items of non-cancelled orders.
      const productMap = new Map<string, ProductCount>();
      const itemsByOrder = new Map<string, string[]>();
      const activeIds = new Set(active.map((o) => o.id));
      const orderIds = all.map((o) => o.id);
      const batchSize = 30; // Firestore "in" limit
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const itemsSnap = await firestore
          .collection("order_items")
          .where("orderId", "in", orderIds.slice(i, i + batchSize))
          .get();
        for (const itemDoc of itemsSnap.docs) {
          const item = itemDoc.data();
          const lines = itemsByOrder.get(item.orderId) ?? [];
          lines.push(`${item.quantity ?? 1} ${item.productName ?? ""}`);
          itemsByOrder.set(item.orderId, lines);
          if (item.status === "cancelled" || !activeIds.has(item.orderId)) continue;
          const key = item.productId ?? item.productName;
          const p = productMap.get(key) ?? { productName: item.productName ?? "", quantity: 0, revenue: 0 };
          p.quantity += item.quantity ?? 0;
          p.revenue += item.totalPrice ?? 0;
          productMap.set(key, p);
        }
      }
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map((p) => ({ ...p, revenue: round2(p.revenue) }));

      // 7. Status breakdown over every order
      const ordersByStatus: Record<string, number> = {};
      for (const o of all) {
        const status = (o.status as string) ?? "unknown";
        ordersByStatus[status] = (ordersByStatus[status] ?? 0) + 1;
      }

      functions.logger.info(
        `Report generated for branch ${data.branchId}: ` +
        `${active.length} orders, $${totalRevenue.toFixed(2)} collected`
      );

      const orderRows: OrderRow[] = all
        .map((o) => {
          const at = (o.createdAt as admin.firestore.Timestamp | undefined)?.toDate();
          const payment = o.payment as Record<string, unknown> | undefined;
          return {
            sortKey: at?.getTime() ?? 0,
            row: {
              id: o.id,
              date: at ? toDay.format(at) : "",
              time: at ? toTime.format(at) : "",
              label: String(o.tableNumber ?? o.customerName ?? ""),
              source: String(o.source ?? ""),
              status: String(o.status ?? ""),
              items: (itemsByOrder.get(o.id) ?? []).join("; "),
              subtotal: round2((o.subtotal as number) ?? 0),
              tax: round2((o.taxAmount as number) ?? 0),
              tip: round2((o.tipAmount as number) ?? 0),
              total: round2((o.total as number) ?? 0),
              paymentMethod: String(payment?.method ?? ""),
              paymentStatus: String(payment?.status ?? ""),
            },
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((x) => x.row);

      const report: OrderReportData = {
        totalOrders: active.length,
        totalRevenue: round2(totalRevenue),
        averageTicket: paidOrderCount > 0 ? round2(totalRevenue / paidOrderCount) : 0,
        cancelledOrders: all.length - active.length,
        topProducts,
        ordersByStatus,
        dailyRevenue: Array.from(days.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((d) => ({ ...d, revenue: round2(d.revenue) })),
        orders: orderRows,
      };
      return report;
    } catch (error) {
      functions.logger.error("Report generation failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate report."
      );
    }
  }
);

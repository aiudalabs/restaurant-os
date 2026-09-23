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

interface OrderReportData {
  totalOrders: number; // non-cancelled
  totalRevenue: number; // paid orders only (money actually collected)
  averageTicket: number; // totalRevenue / paid orders
  cancelledOrders: number;
  topProducts: ProductCount[];
  ordersByStatus: Record<string, number>; // every status, cancelled included
  dailyRevenue: DailyRevenue[];
}

const DEFAULT_TIMEZONE = "America/Panama";
const round2 = (n: number) => Math.round(n * 100) / 100;

/** YYYY-MM-DD formatter for a timezone; falls back to Panamá if the zone is invalid. */
function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
  try {
    return new Intl.DateTimeFormat("en-CA", { ...opts, timeZone });
  } catch {
    return new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: DEFAULT_TIMEZONE });
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
      const toDay = dayFormatter((orgSnap.data()?.timezone as string) || DEFAULT_TIMEZONE);

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

      // 6. Top products from the non-cancelled orders' items
      const productMap = new Map<string, ProductCount>();
      const orderIds = active.map((o) => o.id);
      const batchSize = 30; // Firestore "in" limit
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const itemsSnap = await firestore
          .collection("order_items")
          .where("orderId", "in", orderIds.slice(i, i + batchSize))
          .get();
        for (const itemDoc of itemsSnap.docs) {
          const item = itemDoc.data();
          if (item.status === "cancelled") continue;
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

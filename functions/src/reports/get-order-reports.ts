import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface ReportRequest {
  orgId: string;
  branchId: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
}

interface ProductCount {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
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
      // 4. Query orders in the date range (exclude cancelled)
      const ordersSnap = await firestore
        .collection("orders")
        .where("branchId", "==", data.branchId)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get();

      const orders = ordersSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((o: Record<string, unknown>) => o.status !== "cancelled");

      // 5. Calculate aggregations
      let totalSales = 0;
      let paidOrderCount = 0;
      const orderIds: string[] = [];

      for (const order of orders) {
        const o = order as Record<string, unknown>;
        const total = (o.total as number) ?? 0;
        const paymentData = o.payment as Record<string, unknown> | undefined;

        if (paymentData?.status === "paid") {
          totalSales += total;
          paidOrderCount++;
        }
        orderIds.push(order.id);
      }

      const averageTicket = paidOrderCount > 0
        ? totalSales / paidOrderCount
        : 0;

      // 6. Get top products from order_items
      const productMap = new Map<string, ProductCount>();

      // Query in batches of 30 (Firestore "in" limit)
      const batchSize = 30;
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize);
        const itemsSnap = await firestore
          .collection("order_items")
          .where("orderId", "in", batch)
          .get();

        for (const itemDoc of itemsSnap.docs) {
          const item = itemDoc.data();
          if (item.status === "cancelled") continue;

          const existing = productMap.get(item.productId);
          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalRevenue += item.totalPrice;
          } else {
            productMap.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              totalQuantity: item.quantity,
              totalRevenue: item.totalPrice,
            });
          }
        }
      }

      // Sort by quantity and take top 10
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

      // 7. Orders by status breakdown
      const statusBreakdown: Record<string, number> = {};
      for (const order of orders) {
        const status = (order as Record<string, unknown>).status as string;
        statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
      }

      functions.logger.info(
        `Report generated for branch ${data.branchId}: ` +
        `${orders.length} orders, $${totalSales.toFixed(2)} total sales`
      );

      return {
        totalSales: Math.round(totalSales * 100) / 100,
        orderCount: orders.length,
        paidOrderCount,
        averageTicket: Math.round(averageTicket * 100) / 100,
        topProducts,
        statusBreakdown,
        period: {
          start: data.startDate,
          end: data.endDate,
        },
      };
    } catch (error) {
      functions.logger.error("Report generation failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate report."
      );
    }
  }
);

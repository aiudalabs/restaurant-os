import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore;

/**
 * onOrderItemUpdated — Triggered when an order_item document is updated.
 *
 * Responsibilities:
 * 1. When any item moves to "in_progress" → set parent order to "in_preparation"
 * 2. When ALL non-cancelled items reach "done" → set parent order to "ready"
 */
export const onOrderItemUpdated = onDocumentUpdated(
  "order_items/{itemId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) {
      functions.logger.warn("Missing before/after data, skipping");
      return;
    }

    // Only act if status actually changed
    if (before.status === after.status) {
      return;
    }

    const orderId = after.orderId as string;
    const newStatus = after.status as string;
    const itemId = event.params.itemId;
    const firestore = db();
    const now = admin.firestore.Timestamp.now();

    functions.logger.info(
      `Order item ${itemId} status changed: ${before.status} → ${newStatus}`,
      { orderId }
    );

    // If item moved to "in_progress", set order to "in_preparation"
    if (newStatus === "in_progress") {
      const orderRef = firestore.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        functions.logger.error(`Order ${orderId} not found`);
        return;
      }

      const orderData = orderSnap.data();
      // Only update if order isn't already in a later state
      if (
        orderData?.status === "confirmed" ||
        orderData?.status === "queued"
      ) {
        await orderRef.update({
          status: "in_preparation",
          updatedAt: now,
        });
        functions.logger.info(
          `Order ${orderId} status updated to "in_preparation"`
        );
      }
      return;
    }

    // If item moved to "done", check if ALL sibling items are done
    if (newStatus === "done") {
      const siblingSnap = await firestore
        .collection("order_items")
        .where("orderId", "==", orderId)
        .get();

      const allDone = siblingSnap.docs.every((doc) => {
        const status = doc.data().status as string;
        // Cancelled items don't count
        return status === "done" || status === "cancelled";
      });

      if (allDone) {
        const orderRef = firestore.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        const orderData = orderSnap.data();

        await orderRef.update({
          status: "ready",
          updatedAt: now,
        });
        functions.logger.info(
          `All items done for order ${orderId}, status updated to "ready"`
        );

        // Free the table (clear currentOrderId)
        if (orderData?.tableId) {
          await firestore
            .collection("tables")
            .doc(orderData.tableId as string)
            .update({ currentOrderId: null });
          functions.logger.info(
            `Table ${orderData.tableId} freed after order ${orderId} ready`
          );
        }
      }
    }
  }
);

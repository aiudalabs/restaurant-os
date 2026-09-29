import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { kdsTicket, kdsTicketKey } from "../orders/kds-ticket";

/**
 * confirmManualPayment — Callable (waiter / manager / admin of the order's org).
 *
 * Manual Yappy (issue #47): a customer who ordered from the branch link pays by
 * Yappy to the business and types the pickup code in the message. The order sits
 * in 'pending_payment' (onOrderCreated pre-assigned stationIds but did not mirror
 * to the KDS). Whoever attends checks their own Yappy app and calls this:
 *  - received: true  → order paid + 'confirmed', items mirrored to their KDS
 *                      (unrouted items stay for the counter, like any order).
 *  - received: false → order 'cancelled' (the transfer never arrived).
 *
 * Idempotent: confirming an already confirmed Yappy order only re-mirrors the
 * tickets (same RTDB keys), so a failed mirror can be retried safely.
 */

const HttpsError = functions.https.HttpsError;
const STAFF = ["admin", "manager", "waiter"];

export const confirmManualPayment = functions.https.onCall(
  async (data: { orderId?: string; received?: boolean }, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
    if (!data.orderId || typeof data.received !== "boolean") {
      throw new HttpsError("invalid-argument", "orderId y received son obligatorios.");
    }

    const db = admin.firestore();
    const caller = (await db.collection("users").doc(uid).get()).data();
    if (!caller || !STAFF.includes(caller.role) || caller.isActive === false) {
      throw new HttpsError("permission-denied", "Solo el personal puede confirmar pagos.");
    }

    const orderRef = db.collection("orders").doc(data.orderId);
    const now = admin.firestore.Timestamp.now();

    const order = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      const o = snap.data();
      if (!o || o.orgId !== caller.orgId) {
        throw new HttpsError("not-found", "Pedido no encontrado.");
      }
      if (o.payment?.method !== "yappy") {
        throw new HttpsError("failed-precondition", "Este pedido no es de Yappy manual.");
      }
      const alreadyPaid = o.status === "confirmed" && o.payment?.status === "paid";
      if (alreadyPaid && data.received) return o; // retry: re-mirror below
      if (o.status !== "pending_payment") {
        throw new HttpsError("failed-precondition", "Este pedido ya no espera pago.");
      }

      if (!data.received) {
        tx.update(orderRef, {
          status: "cancelled",
          "payment.status": "failed",
          "payment.reviewedBy": uid,
          updatedAt: now,
        });
        return null;
      }
      tx.update(orderRef, {
        status: "confirmed",
        "payment.status": "paid",
        "payment.paidAt": now,
        "payment.reviewedBy": uid,
        updatedAt: now,
      });
      return o;
    });

    if (!order) {
      functions.logger.info(`Manual Yappy not received, order ${data.orderId} cancelled by ${uid}`);
      return { status: "cancelled" };
    }

    // Release to the kitchen: mirror the pre-routed items to their stations.
    const items = await db.collection("order_items").where("orderId", "==", data.orderId).get();
    const updates: Record<string, unknown> = {};
    for (const d of items.docs) {
      const item = d.data();
      if (!item.stationId) continue; // counter item: the waiter handles it
      updates[kdsTicketKey(item.stationId, data.orderId, d.id)] = kdsTicket(
        data.orderId,
        order.tableNumber ?? "",
        { productName: item.productName, quantity: item.quantity, specialInstructions: item.specialInstructions },
      );
    }
    if (Object.keys(updates).length > 0) {
      try {
        await admin.database().ref().update(updates);
      } catch (e) {
        functions.logger.error(`Order ${data.orderId} paid but KDS mirror failed`, e);
        throw new HttpsError("internal", "Pago registrado, pero no llegó a cocina. Vuelve a tocar «Pago recibido».");
      }
    }
    functions.logger.info(`Manual Yappy confirmed for order ${data.orderId} by ${uid}`);
    return { status: "confirmed" };
  },
);

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { markOrderPaid } from "./mark-paid";
import { releaseToKds } from "../orders/kds-ticket";

/**
 * confirmManualPayment — Callable (waiter / manager / admin of the order's org).
 *
 * Manual Yappy (issue #47): a customer who ordered from the branch link pays by
 * Yappy to the business and types the pickup code in the message. The order sits
 * in 'pending_payment' (onOrderCreated pre-assigned stationIds but did not mirror
 * to the KDS). Whoever attends checks their own Yappy app and calls this:
 *  - received: true  → order paid + 'confirmed' (markOrderPaid); onOrderPaid
 *                      mirrors the items to their KDS.
 *  - received: false → order 'cancelled' (the transfer never arrived).
 *
 * Idempotent: confirming an already paid order re-mirrors the tickets (same
 * RTDB keys) so a failed mirror can be retried from the same button.
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

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      const o = snap.data();
      if (!o || o.orgId !== caller.orgId) {
        throw new HttpsError("not-found", "Pedido no encontrado.");
      }
      if (o.payment?.method !== "yappy") {
        throw new HttpsError("failed-precondition", "Este pedido no es de Yappy manual.");
      }
      const alreadyPaid = o.payment?.status === "paid";
      if (alreadyPaid && data.received) return { order: o, result: "already_paid" as const };
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
        return { order: null, result: "cancelled" as const };
      }
      tx.update(orderRef, { "payment.reviewedBy": uid });
      markOrderPaid(tx, orderRef, o, { method: "yappy", uid, now });
      return { order: o, result: "paid" as const };
    });

    if (outcome.result === "cancelled") {
      functions.logger.info(`Manual Yappy not received, order ${data.orderId} cancelled by ${uid}`);
      return { status: "cancelled" };
    }
    if (outcome.result === "already_paid" && outcome.order) {
      // Retry after a failed mirror: onOrderPaid already ran; re-mirror here.
      try {
        await releaseToKds(db, data.orderId, outcome.order);
      } catch (e) {
        functions.logger.error(`Order ${data.orderId} re-mirror failed`, e);
        throw new HttpsError("internal", "Pago registrado, pero no llegó a cocina. Vuelve a tocar «Pago recibido».");
      }
    }
    functions.logger.info(`Manual Yappy confirmed for order ${data.orderId} by ${uid} (${outcome.result})`);
    return { status: "confirmed" };
  },
);

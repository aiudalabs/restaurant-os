import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { markOrderPaid, PAYMENT_METHODS, type InvoiceRequest, type PaymentMethod } from "./mark-paid";

const HttpsError = functions.https.HttpsError;
const STAFF = ["admin", "manager", "waiter"];
/** Orders in these states cannot be collected. */
const NOT_PAYABLE = ["cancelled", "closed", "payment_failed"];

interface RecordPaymentRequest {
  orderId?: string;
  method?: PaymentMethod;
  invoiceRequest?: InvoiceRequest;
}

/**
 * recordPayment — Callable (admin / manager / waiter of the order's org).
 *
 * Cobrar in waiter_web: the staff member collected the money in person (cash,
 * card terminal, Yappy shown on their phone, transfer). The server validates
 * the caller, the order and its state, then flips payment.status to 'paid'
 * through markOrderPaid; onOrderPaid does the rest (KDS release for link
 * orders, audit log, electronic invoice).
 *
 * Online card payments never come through here: those are confirmed by the
 * PagueloFácil callback in the BFF.
 */
export const recordPayment = functions.https.onCall(
  async (data: RecordPaymentRequest, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
    const orderId = typeof data.orderId === "string" ? data.orderId : "";
    const method = data.method;
    if (!orderId || !method || !PAYMENT_METHODS.includes(method)) {
      throw new HttpsError("invalid-argument", "orderId y method (cash|card|yappy|transfer) son obligatorios.");
    }

    const db = admin.firestore();
    const caller = (await db.collection("users").doc(uid).get()).data();
    if (!caller || !STAFF.includes(caller.role) || caller.isActive === false) {
      throw new HttpsError("permission-denied", "Solo el personal puede cobrar.");
    }

    const orderRef = db.collection("orders").doc(orderId);
    const now = admin.firestore.Timestamp.now();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      const order = snap.data();
      if (!order || order.orgId !== caller.orgId) {
        throw new HttpsError("not-found", "Pedido no encontrado.");
      }
      if (NOT_PAYABLE.includes(order.status)) {
        throw new HttpsError("failed-precondition", `El pedido está ${order.status}; no se puede cobrar.`);
      }
      if (order.status === "pending_payment" && method === "card") {
        throw new HttpsError(
          "failed-precondition",
          "Este pedido está pagándose en línea; espera la confirmación o cóbralo en efectivo.",
        );
      }
      try {
        return markOrderPaid(tx, orderRef, order, {
          method,
          uid,
          now,
          invoiceRequest: data.invoiceRequest,
        });
      } catch (e) {
        throw new HttpsError("invalid-argument", (e as Error).message);
      }
    });

    functions.logger.info(`recordPayment ${orderId}: ${result} (${method}) by ${uid}`);
    return { status: result };
  },
);

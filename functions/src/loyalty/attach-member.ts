import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { awardLoyalty } from "./award";

const HttpsError = functions.https.HttpsError;
const STAFF = ["admin", "manager", "waiter"];

/**
 * attachMember — Callable (waiter / manager / admin). The waiter scans the member
 * QR of a customer (value = loyalty_members id, "{orgId}_{uid}") and ties the
 * order they took to that member:
 *  - order not paid yet → order.loyaltyUid is set; onOrderPaid awards on payment.
 *  - order already paid → awarded right away (idempotent: earn_{orderId} event).
 * Only orders created by staff (customer orders already earn for their own
 * customer), one member per order, same organization.
 */
export const attachMember = functions.https.onCall(async (data: { orderId?: string; memberId?: string }, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
  if (typeof data.orderId !== "string" || typeof data.memberId !== "string" || !data.orderId || !data.memberId) {
    throw new HttpsError("invalid-argument", "orderId y memberId son obligatorios.");
  }

  const db = admin.firestore();
  const caller = (await db.collection("users").doc(uid).get()).data();
  if (!caller || !STAFF.includes(caller.role) || caller.isActive === false) {
    throw new HttpsError("permission-denied", "Solo el personal puede sumar puntos.");
  }

  const prefix = `${caller.orgId}_`;
  if (!data.memberId.startsWith(prefix) || data.memberId.length === prefix.length) {
    throw new HttpsError("invalid-argument", "Este código no es de un socio de este restaurante.");
  }
  const memberUid = data.memberId.slice(prefix.length);

  const orderRef = db.collection("orders").doc(data.orderId);
  const order = await db.runTransaction(async (tx) => {
    const o = (await tx.get(orderRef)).data();
    if (!o || o.orgId !== caller.orgId) throw new HttpsError("not-found", "Pedido no encontrado.");
    if (o.loyaltyUid && o.loyaltyUid !== memberUid) {
      throw new HttpsError("failed-precondition", "Este pedido ya tiene otro socio.");
    }
    const creator = typeof o.createdByUid === "string" ? o.createdByUid : "";
    if (!creator || !(await tx.get(db.collection("users").doc(creator))).exists) {
      throw new HttpsError("failed-precondition", "Este pedido es de un cliente y ya suma a su propia cuenta.");
    }
    tx.update(orderRef, { loyaltyUid: memberUid });
    return { ...o, loyaltyUid: memberUid } as FirebaseFirestore.DocumentData;
  });

  let awarded = false;
  if (order.payment?.status === "paid") {
    await awardLoyalty(data.orderId, order);
    awarded = true;
  }

  const member = (await db.collection("loyalty_members").doc(data.memberId).get()).data();
  return { awarded, name: member?.name ?? "", points: Number(member?.points ?? 0) };
});

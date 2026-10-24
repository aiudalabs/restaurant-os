import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { computeTotals, UnknownProduct } from "../orders/totals";
import { loadPrices, loadTaxPercent } from "../orders/on-order-created";

const HttpsError = functions.https.HttpsError;
const STAFF = ["admin", "manager", "waiter"];
/** pending_payment: the online amount (PagueloFácil / Yappy link) is already fixed. */
const LOCKED = ["cancelled", "closed", "payment_failed", "pending_payment"];

interface ApplyDiscountRequest {
  orderId?: string;
  /** organizations/{orgId}.discounts[].id; null/absent removes the discount. */
  discountId?: string | null;
  /** Beneficiary's cédula / carné; required when the discount has requiresId. */
  idNumber?: string;
}

/**
 * applyDiscount — Callable (admin / manager / waiter of the order's org). Issue #81.
 *
 * Applies one of the organization's configured discounts (e.g. jubilados 25 %)
 * to an order that has not been paid yet, or removes it (discountId null).
 * Totals are recomputed from order_items + products by computeTotals — the same
 * code onOrderCreated uses — and each item gets its `discountAmount`, which the
 * electronic invoice (BFF nuc.py) reads. One discount per order: applying again
 * replaces the previous one.
 */
export const applyDiscount = functions.https.onCall(async (data: ApplyDiscountRequest, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
  const orderId = typeof data.orderId === "string" ? data.orderId : "";
  if (!orderId) throw new HttpsError("invalid-argument", "orderId es obligatorio.");
  const discountId = typeof data.discountId === "string" && data.discountId ? data.discountId : null;

  const db = admin.firestore();
  const caller = (await db.collection("users").doc(uid).get()).data();
  if (!caller || !STAFF.includes(caller.role) || caller.isActive === false) {
    throw new HttpsError("permission-denied", "Solo el personal puede aplicar descuentos.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const pre = (await orderRef.get()).data();
  if (!pre || pre.orgId !== caller.orgId) throw new HttpsError("not-found", "Pedido no encontrado.");

  let discount: { id: string; name: string; percent: number } | null = null;
  let idNumber = "";
  if (discountId) {
    const org = (await db.collection("organizations").doc(caller.orgId).get()).data();
    const list = Array.isArray(org?.discounts) ? org.discounts : [];
    const found = list.find((d: { id?: string }) => d?.id === discountId);
    if (!found || found.active === false || typeof found.percent !== "number" || found.percent <= 0 || found.percent > 100) {
      throw new HttpsError("failed-precondition", "Descuento no disponible.");
    }
    if (found.requiresId === true) {
      idNumber = typeof data.idNumber === "string" ? data.idNumber.trim().slice(0, 30) : "";
      if (idNumber.length < 3) throw new HttpsError("invalid-argument", "Este descuento exige la cédula o carné del beneficiario.");
    }
    discount = { id: found.id, name: String(found.name ?? found.id), percent: found.percent };
  }

  const itemsQuery = db.collection("order_items").where("orderId", "==", orderId);
  const prices = await loadPrices(db, (await itemsQuery.get()).docs.map((d) => d.data().productId));
  const taxPercent = await loadTaxPercent(db, pre as never);
  const now = admin.firestore.Timestamp.now();

  const result = await db.runTransaction(async (tx) => {
    const [snap, itemsSnap] = await Promise.all([tx.get(orderRef), tx.get(itemsQuery)]);
    const order = snap.data();
    if (!order || order.orgId !== caller.orgId) throw new HttpsError("not-found", "Pedido no encontrado.");
    if (order.payment?.status === "paid") throw new HttpsError("failed-precondition", "El pedido ya está pagado.");
    if (LOCKED.includes(order.status)) {
      throw new HttpsError("failed-precondition", `El pedido está ${order.status}; no admite descuento.`);
    }
    const items = itemsSnap.docs.map((d) => d.data() as { productId: string; quantity: number; modifiers?: { extraPrice?: number }[] });
    let totals;
    try {
      totals = computeTotals(items, prices, taxPercent, discount?.percent ?? 0);
    } catch (e) {
      if (e instanceof UnknownProduct) throw new HttpsError("failed-precondition", `Producto desconocido ${e.productId}.`);
      throw e;
    }
    tx.update(orderRef, {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      taxPercent,
      total: totals.total,
      discount: discount
        ? {
            ...discount,
            amount: totals.discountAmount,
            appliedBy: uid,
            appliedAt: now,
            ...(idNumber ? { idNumber } : {}),
          }
        : admin.firestore.FieldValue.delete(),
      updatedAt: now,
    });
    itemsSnap.docs.forEach((d, i) => {
      tx.update(d.ref, { unitPrice: totals.lines[i].unitPrice, totalPrice: totals.lines[i].totalPrice, discountAmount: totals.lines[i].discountAmount });
    });
    return { total: totals.total, discountAmount: totals.discountAmount };
  });

  await db.collection("audit_log").add({
    orgId: caller.orgId,
    branchId: pre.branchId ?? "",
    type: discount ? "discount_applied" : "discount_removed",
    orderId,
    discountId: discount?.id ?? null,
    amount: result.discountAmount,
    by: uid,
    at: now,
  });
  functions.logger.info(`applyDiscount ${orderId}: ${discount?.id ?? "removed"} → total ${result.total} by ${uid}`);
  return result;
});

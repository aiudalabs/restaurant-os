import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { releaseToKds } from "../orders/kds-ticket";
import { requestInvoice } from "./request-invoice";

/**
 * onOrderPaid — fires once per order, when payment.status flips to 'paid'
 * (from any origin: recordPayment, confirmManualPayment, the BFF card callback).
 *
 * 1. A link order that was waiting for its payment is released to the kitchen
 *    (its items were pre-routed by onOrderCreated but not mirrored to RTDB).
 * 2. The payment is recorded in audit_log.
 * 3. The electronic invoice is requested (request-invoice.ts).
 *
 * Idempotent by construction: the flip happens once; the RTDB keys are stable.
 */
export const onOrderPaid = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  if (before.payment?.status === "paid" || after.payment?.status !== "paid") return;

  const orderId = event.params.orderId;
  const db = admin.firestore();
  functions.logger.info(`Order ${orderId} paid (${after.payment?.method}) by ${after.payment?.recordedBy ?? "?"}`);

  if (before.status === "pending_payment") {
    try {
      const n = await releaseToKds(db, orderId, after);
      functions.logger.info(`Order ${orderId} released to the KDS (${n} tickets)`);
    } catch (e) {
      // The order IS paid; a failed mirror is recoverable (confirmManualPayment
      // retry re-mirrors the same keys). Never fail the payment for this.
      functions.logger.error(`Order ${orderId} paid but KDS mirror failed`, e);
    }
  }

  await db.collection("audit_log").add({
    orgId: after.orgId,
    branchId: after.branchId ?? "",
    type: "order_paid",
    orderId,
    method: after.payment?.method ?? null,
    amount: typeof after.total === "number" ? after.total : 0,
    by: after.payment?.recordedBy ?? "bff",
    at: admin.firestore.Timestamp.now(),
  });

  await requestInvoice(orderId, after);
});

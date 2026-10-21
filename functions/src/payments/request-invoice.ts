import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { bffInternalToken, bffUrl } from "./config";

/**
 * Electronic invoice hook (issue #68). When the order's organization has
 * fiscal invoicing enabled, mark the order `fiscal.status = 'pending'` and ask
 * the BFF to issue it (POST /fiscal/orders/{id}/invoice with the internal
 * token). The BFF owns numbering, Digifact and Storage; whatever happens there
 * ends up in orders/{id}.fiscal. A failed call here is logged only: staff can
 * retry from the admin, the payment itself is never affected.
 *
 * Returns true when the BFF was asked, false when the org has no invoicing.
 */
export async function requestInvoice(
  orderId: string,
  order: FirebaseFirestore.DocumentData,
): Promise<boolean> {
  const db = admin.firestore();
  const org = (await db.collection("organizations").doc(order.orgId).get()).data();
  if (org?.fiscal?.enabled !== true) return false;
  if (order.fiscal?.status === "issued") return false;

  await db.collection("orders").doc(orderId).update({
    "fiscal.status": "pending",
    "fiscal.attempts": order.fiscal?.attempts ?? 0,
  });

  const base = bffUrl.value().replace(/\/$/, "");
  const token = bffInternalToken.value();
  if (!base || !token) {
    functions.logger.error(`Order ${orderId}: BFF_URL / BFF_INTERNAL_TOKEN not configured; invoice left pending`);
    return true;
  }
  try {
    const res = await axios.post(`${base}/fiscal/orders/${orderId}/invoice`, null, {
      headers: { "X-Internal-Token": token },
      timeout: 90_000,
    });
    functions.logger.info(`Order ${orderId}: invoice ${res.data?.status} ${res.data?.cufe ?? ""}`);
  } catch (e) {
    const err = e as { message?: string; response?: { status?: number; data?: unknown } };
    functions.logger.error(`Order ${orderId}: invoice request failed`, { message: err.message, status: err.response?.status, data: err.response?.data });
  }
  return true;
}

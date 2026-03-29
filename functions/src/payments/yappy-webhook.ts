import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

interface YappyCallback {
  orderId: string;
  status: string; // "E" = ejecutado, "R" = rechazado, "C" = cancelado
  domain: string;
  hash: string;
  transactionId?: string;
  confirmationNumber?: string;
}

/**
 * yappyWebhook — HTTP endpoint for Yappy payment callbacks.
 *
 * Validates the security hash, updates order payment status,
 * and writes to audit_log.
 */
export const yappyWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Only accept POST
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const body = req.body as YappyCallback;
  const firestore = admin.firestore();

  // 2. Validate required fields
  if (!body.orderId || !body.status || !body.hash || !body.domain) {
    functions.logger.warn("Yappy webhook: missing required fields", body);
    res.status(400).send("Missing required fields");
    return;
  }

  try {
    // 3. Find the order to get branchId
    const orderRef = firestore.collection("orders").doc(body.orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      functions.logger.warn(`Yappy webhook: order ${body.orderId} not found`);
      res.status(404).send("Order not found");
      return;
    }

    const orderData = orderSnap.data()!;

    // 4. Load the Yappy integration for this branch
    const integrationId = `${orderData.branchId}_yappy`;
    const integrationSnap = await firestore
      .collection("integrations")
      .doc(integrationId)
      .get();

    if (!integrationSnap.exists) {
      functions.logger.error(
        `Yappy integration not found for branch ${orderData.branchId}`
      );
      res.status(500).send("Integration not configured");
      return;
    }

    const integration = integrationSnap.data()!;

    // 5. Validate security hash
    // Yappy hash = SHA-256(orderId + domain + secretKey + status)
    const expectedHash = crypto
      .createHash("sha256")
      .update(`${body.orderId}${body.domain}${integration.secretKey}${body.status}`)
      .digest("hex");

    if (body.hash !== expectedHash) {
      functions.logger.error(
        `Yappy webhook: hash mismatch for order ${body.orderId}`
      );
      res.status(403).send("Invalid hash");
      return;
    }

    const now = admin.firestore.Timestamp.now();

    // 6. Map Yappy status to our payment status
    let paymentStatus: string;
    let orderStatusUpdate: Record<string, unknown> = {};

    switch (body.status) {
      case "E": // Ejecutado (success)
        paymentStatus = "paid";
        orderStatusUpdate = {
          "payment.status": "paid",
          "payment.paidAt": now,
          "payment.confirmationNumber": body.confirmationNumber ?? null,
          "payment.yappyOrderId": body.transactionId ?? null,
          updatedAt: now,
        };
        break;

      case "R": // Rechazado
      case "C": // Cancelado
        paymentStatus = "failed";
        orderStatusUpdate = {
          "payment.status": "failed",
          updatedAt: now,
        };
        break;

      default:
        functions.logger.warn(
          `Yappy webhook: unknown status "${body.status}" for order ${body.orderId}`
        );
        res.status(400).send("Unknown status");
        return;
    }

    // 7. Update order
    await orderRef.update(orderStatusUpdate);

    // 8. Write audit log
    await firestore.collection("audit_log").add({
      orgId: orderData.orgId,
      action: "payment_callback",
      targetOrderId: body.orderId,
      performedBy: "yappy_webhook",
      details: {
        status: body.status,
        paymentStatus,
        transactionId: body.transactionId ?? null,
        confirmationNumber: body.confirmationNumber ?? null,
      },
      createdAt: now,
    });

    functions.logger.info(
      `Yappy webhook: order ${body.orderId} payment ${paymentStatus}`
    );

    res.status(200).json({ success: true, paymentStatus });
  } catch (error) {
    functions.logger.error("Yappy webhook error:", error);
    res.status(500).send("Internal error");
  }
});

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface RecoverOrderRequest {
  pickupCode: string;
  branchId?: string;
}

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Pickup codes are short (P-XXXX) so recovery is rate-limited per caller:
 * at most MAX_ATTEMPTS lookups per hour, counted in RTDB (server-only path,
 * default-deny rules). Throws resource-exhausted when the budget is spent.
 */
async function consumeAttempt(uid: string): Promise<void> {
  const ref = admin.database().ref(`recover_attempts/${uid}`);
  const now = Date.now();
  const result = await ref.transaction((cur: { count?: number; windowStart?: number } | null) => {
    const windowStart = cur?.windowStart ?? 0;
    const inWindow = now - windowStart < WINDOW_MS;
    const count = inWindow ? (cur?.count ?? 0) : 0;
    return { count: count + 1, windowStart: inWindow ? windowStart : now };
  });
  const count = (result.snapshot.val() as { count: number } | null)?.count ?? 0;
  if (count > MAX_ATTEMPTS) {
    throw new functions.https.HttpsError("resource-exhausted", "Demasiados intentos. Espera una hora.");
  }
}

/**
 * recoverOrder — Callable.
 *
 * A customer who cleared their storage or switched devices recovers an order by
 * its pickup code. Order reads are locked to the creating device (createdByUid),
 * so we look the order up server-side and TRANSFER the claim to the requesting
 * device — the pickup code is the claim ticket. Returns the orderId so the app
 * can then read/track it under the new device's uid.
 */
export const recoverOrder = functions.https.onCall(
  async (data: RecoverOrderRequest, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required.");
    }
    const pickupCode = (data.pickupCode || "").trim();
    if (!pickupCode) {
      throw new functions.https.HttpsError("invalid-argument", "pickupCode required.");
    }
    await consumeAttempt(uid);

    const db = admin.firestore();
    let q = db.collection("orders").where("pickupCode", "==", pickupCode);
    if (data.branchId) q = q.where("branchId", "==", data.branchId);
    const snap = await q.limit(1).get();

    if (snap.empty) {
      throw new functions.https.HttpsError("not-found", "Pedido no encontrado.");
    }

    const orderRef = snap.docs[0].ref;
    await orderRef.update({ createdByUid: uid });

    // Transfer the claim on the items too, so the tracking screen can read them.
    const items = await db.collection("order_items").where("orderId", "==", orderRef.id).get();
    if (!items.empty) {
      const batch = db.batch();
      items.forEach((d) => batch.update(d.ref, { createdByUid: uid }));
      await batch.commit();
    }

    return { orderId: orderRef.id };
  }
);

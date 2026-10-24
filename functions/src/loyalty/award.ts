import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { applyOrder, EMPTY_MEMBER, memberId, type MemberState } from "./program";
import { newVoucherRef } from "./vouchers";

/**
 * awardLoyalty — called from onOrderPaid. Gives the order's points / stamp /
 * challenge progress to the customer who placed it.
 *
 * - Only customer orders: staff-created orders carry the waiter's uid (a users/{uid}
 *   doc exists) and earn nothing.
 * - Idempotent: the earn event id is the order id, created inside the transaction.
 * - Never throws into the payment flow (the caller catches).
 */
export async function awardLoyalty(orderId: string, order: FirebaseFirestore.DocumentData): Promise<void> {
  const uid = order.createdByUid;
  const total = Number(order.total);
  if (typeof uid !== "string" || !uid || typeof order.orgId !== "string" || !(total > 0)) return;

  const db = admin.firestore();
  if ((await db.collection("users").doc(uid).get()).exists) return;

  const itemsSnap = await db.collection("order_items").where("orderId", "==", orderId).get();
  const productIds = itemsSnap.docs.map((d) => String(d.data().productId ?? "")).filter(Boolean);

  const mid = memberId(order.orgId, uid);
  const memberRef = db.collection("loyalty_members").doc(mid);
  const eventRef = db.collection("loyalty_events").doc(`earn_${orderId}`);
  const now = admin.firestore.Timestamp.now();

  const result = await db.runTransaction(async (tx) => {
    const [eventSnap, memberSnap] = await Promise.all([tx.get(eventRef), tx.get(memberRef)]);
    if (eventSnap.exists) return null;

    const prev = memberSnap.exists ? ({ ...EMPTY_MEMBER, ...memberSnap.data() } as MemberState) : EMPTY_MEMBER;
    const award = applyOrder(prev, { total, productIds, at: now.toDate() });
    const bonusPoints = award.bonuses.reduce((s, b) => s + b.points, 0);

    const name = typeof order.customerName === "string" && order.customerName !== "Cliente" ? order.customerName : null;
    const memberData = {
      ...award.member,
      orgId: order.orgId,
      uid,
      ...(name ? { name } : {}),
      ...(memberSnap.exists ? {} : { createdAt: now }),
      updatedAt: now,
    };
    tx.set(memberRef, memberData, { merge: true });
    tx.create(eventRef, {
      orgId: order.orgId,
      uid,
      memberId: mid,
      type: "earn",
      orderId,
      total,
      points: award.points,
      bonusPoints,
      bonuses: award.bonuses,
      stampsAfter: award.member.stamps,
      stampCompleted: award.vouchers.length > 0,
      tierAfter: award.member.tier,
      createdAt: now,
    });
    for (const v of award.vouchers) {
      const ref = newVoucherRef(db, order.orgId);
      tx.create(ref, {
        orgId: order.orgId,
        uid,
        memberId: mid,
        rewardId: v.id,
        rewardName: v.name,
        source: "stamps",
        code: ref.id.slice(order.orgId.length + 1),
        status: "active",
        createdAt: now,
      });
    }
    return award;
  });

  if (result) {
    functions.logger.info(`Loyalty: order ${orderId} → ${result.points}+${result.bonuses.length} bonus, member ${mid}`);
  }
}

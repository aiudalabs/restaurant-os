import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { memberId, REWARDS } from "./program";

const HttpsError = functions.https.HttpsError;
const STAFF = ["admin", "manager", "waiter"];
// No 0/O/1/I/L: the code is read aloud at the counter.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** loyalty_vouchers/{orgId}_{CODE}: the doc id doubles as the uniqueness check (tx.create). */
export function newVoucherRef(db: FirebaseFirestore.Firestore, orgId: string): FirebaseFirestore.DocumentReference {
  return db.collection("loyalty_vouchers").doc(`${orgId}_${randomCode()}`);
}

/**
 * redeemReward — Callable (the customer). Spends points on a free-product
 * voucher. The order total and the electronic invoice are never touched: the
 * restaurant hands over the product and marks the voucher used (useVoucher).
 */
export const redeemReward = functions.https.onCall(async (data: { orgId?: string; rewardId?: string }, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
  const reward = REWARDS.find((r) => r.id === data.rewardId);
  if (!reward || typeof data.orgId !== "string" || !data.orgId) {
    throw new HttpsError("invalid-argument", "orgId y rewardId válidos son obligatorios.");
  }

  const db = admin.firestore();
  const mid = memberId(data.orgId, uid);
  const memberRef = db.collection("loyalty_members").doc(mid);
  const now = admin.firestore.Timestamp.now();

  return db.runTransaction(async (tx) => {
    const member = (await tx.get(memberRef)).data();
    if (!member || Number(member.points) < reward.cost) {
      throw new HttpsError("failed-precondition", "No tienes puntos suficientes.");
    }
    const voucherRef = newVoucherRef(db, data.orgId as string);
    const code = voucherRef.id.slice(data.orgId!.length + 1);
    tx.update(memberRef, { points: admin.firestore.FieldValue.increment(-reward.cost), updatedAt: now });
    tx.create(voucherRef, {
      orgId: data.orgId, uid, memberId: mid, rewardId: reward.id, rewardName: reward.name,
      source: "points", cost: reward.cost, code, status: "active", createdAt: now,
    });
    tx.create(db.collection("loyalty_events").doc(), {
      orgId: data.orgId, uid, memberId: mid, type: "redeem", rewardId: reward.id,
      points: -reward.cost, voucherCode: code, createdAt: now,
    });
    return { code, rewardName: reward.name };
  });
});

/**
 * useVoucher — Callable (waiter / manager / admin). commit=false only looks the
 * voucher up (shows what to hand over); commit=true marks it used. Idempotent
 * guard: a used voucher cannot be used twice.
 */
export const useVoucher = functions.https.onCall(async (data: { code?: string; commit?: boolean }, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
  const code = String(data.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new HttpsError("invalid-argument", "Código inválido.");

  const db = admin.firestore();
  const caller = (await db.collection("users").doc(uid).get()).data();
  if (!caller || !STAFF.includes(caller.role) || caller.isActive === false) {
    throw new HttpsError("permission-denied", "Solo el personal puede canjear cupones.");
  }
  const ref = db.collection("loyalty_vouchers").doc(`${caller.orgId}_${code}`);

  return db.runTransaction(async (tx) => {
    const v = (await tx.get(ref)).data();
    if (!v) throw new HttpsError("not-found", "No existe un cupón con ese código.");
    if (v.status === "used") throw new HttpsError("failed-precondition", "Este cupón ya fue usado.");
    if (data.commit) {
      tx.update(ref, { status: "used", usedBy: uid, usedAt: admin.firestore.Timestamp.now() });
    }
    return { code, rewardName: String(v.rewardName), used: Boolean(data.commit) };
  });
});

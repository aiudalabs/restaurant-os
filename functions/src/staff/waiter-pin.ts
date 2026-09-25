import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { newPinRecord, PIN_FORMAT, verifyPin } from "../kds/pin-lock";

/**
 * Waiter PIN login (waiter_web). A device is set up once with its branch link
 * (?branch=…); the waiter picks their name from the branch roster and types
 * their personal 6-digit PIN. Each order keeps the waiter's uid (createdByUid).
 *
 * PINs live hashed in staff_pins/{uid} (server-only in firestore.rules), with
 * the same escalating lockout as KDS station PINs.
 */

const HttpsError = functions.https.HttpsError;

function isActiveWaiterOf(user: admin.firestore.DocumentData | undefined, branchId: string): boolean {
  return (
    !!user &&
    user.role === "waiter" &&
    user.isActive !== false &&
    Array.isArray(user.branchIds) &&
    user.branchIds.includes(branchId)
  );
}

/** setWaiterPin — Callable (admin/manager). Sets or replaces a waiter's PIN. */
export const setWaiterPin = functions.https.onCall(async (data: { userId?: string; pin?: string }, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
  if (!data.userId || !PIN_FORMAT.test(data.pin || "")) {
    throw new HttpsError("invalid-argument", "El PIN debe ser de 6 dígitos.");
  }

  const db = admin.firestore();
  const [callerSnap, targetSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("users").doc(data.userId).get(),
  ]);
  const caller = callerSnap.data();
  if (!caller || !["admin", "manager"].includes(caller.role)) {
    throw new HttpsError("permission-denied", "Solo un administrador o gerente puede poner el PIN.");
  }
  const target = targetSnap.data();
  if (!target || target.orgId !== caller.orgId) {
    throw new HttpsError("permission-denied", "El usuario no existe o es de otra organización.");
  }
  if (target.role !== "waiter") {
    throw new HttpsError("failed-precondition", "Solo los meseros entran con PIN.");
  }

  await db.collection("staff_pins").doc(data.userId).set({
    orgId: target.orgId,
    userId: data.userId,
    ...newPinRecord(data.pin!),
    updatedAt: admin.firestore.Timestamp.now(),
  });
  functions.logger.info(`Waiter PIN set for ${data.userId} by ${uid}`);
  return { success: true };
});

/**
 * waiterRoster — Callable (public). Names of the branch's active waiters that
 * have a PIN, for the device's login screen. The branch id (from the device
 * link) is the key; only first-screen display data is returned.
 */
export const waiterRoster = functions.https.onCall(async (data: { branchId?: string }) => {
  if (!data.branchId) throw new HttpsError("invalid-argument", "Sucursal inválida.");
  const db = admin.firestore();
  const branch = await db.collection("branches").doc(data.branchId).get();
  if (!branch.exists) throw new HttpsError("not-found", "Esta sucursal ya no existe.");
  const orgId = branch.data()?.orgId;

  // Single-field array-contains query (no composite index); filter the rest here.
  const users = await db.collection("users").where("branchIds", "array-contains", data.branchId).get();
  const waiters = users.docs.filter((d) => d.data().orgId === orgId && isActiveWaiterOf(d.data(), data.branchId!));
  const pins = waiters.length
    ? await db.getAll(...waiters.map((d) => db.collection("staff_pins").doc(d.id)))
    : [];
  const withPin = new Set(pins.filter((p) => p.exists).map((p) => p.id));

  return {
    branchName: (branch.data()?.name as string) ?? "",
    waiters: waiters
      .filter((d) => withPin.has(d.id))
      .map((d) => ({ uid: d.id, displayName: (d.data().displayName as string) || "Mesero" }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "es")),
  };
});

/** waiterLogin — Callable (public). PIN check → custom token for that waiter. */
export const waiterLogin = functions.https.onCall(
  async (data: { branchId?: string; userId?: string; pin?: string }) => {
    if (!data.branchId || !data.userId || !PIN_FORMAT.test(data.pin || "")) {
      throw new HttpsError("invalid-argument", "Datos de acceso inválidos.");
    }
    const db = admin.firestore();
    const user = (await db.collection("users").doc(data.userId).get()).data();
    if (!isActiveWaiterOf(user, data.branchId)) {
      throw new HttpsError("permission-denied", "Esta cuenta no puede entrar en esta sucursal.");
    }

    const outcome = await verifyPin(
      db.collection("staff_pins").doc(data.userId),
      data.pin!,
      "Tu cuenta no tiene PIN. Pide al administrador que te lo ponga.",
    );
    if (!outcome.ok) throw new HttpsError(outcome.code, outcome.message);

    const token = await admin.auth().createCustomToken(data.userId, { orgId: user!.orgId, role: "waiter" });
    return { token };
  },
);

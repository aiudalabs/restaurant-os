import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { newPinRecord, PIN_FORMAT } from "./pin-lock";
import { setStaffClaims } from "../users/staff-claims";

interface SetPinRequest {
  stationId: string;
  pin: string;
}


/**
 * setStationPin — Callable (admin). Sets/updates the numeric PIN a KDS device
 * uses to sign in to a station. The PIN is stored HASHED (pbkdf2 + random salt)
 * in kds_pins/{stationId}, which is locked to server-only access by rules.
 *
 * The PIN unlocks a low-privilege operator identity for that station: if the
 * station already has an operator, we reuse it; otherwise we create a dedicated
 * KDS device account (Auth user + users doc) scoped to the station.
 */
export const setStationPin = functions.https.onCall(async (data: SetPinRequest, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Auth required.");
  // 6 digits: with the escalating lockout in kdsLogin, guessing takes years, not days.
  if (!PIN_FORMAT.test(data.pin || "")) {
    throw new functions.https.HttpsError("invalid-argument", "El PIN debe ser de 6 dígitos.");
  }

  const db = admin.firestore();
  const caller = (await db.collection("users").doc(uid).get()).data();
  if (caller?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo un administrador puede configurar el PIN.");
  }
  const orgId = caller.orgId;

  const stationSnap = await db.collection("stations").doc(data.stationId).get();
  if (!stationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "La estación no existe.");
  }
  const station = stationSnap.data()!;
  if (station.orgId !== orgId) {
    throw new functions.https.HttpsError("permission-denied", "La estación es de otra organización.");
  }
  const branchId = station.branchId;

  // Resolve the operator identity the PIN unlocks (reuse or create a device user).
  let operatorUid: string;
  const existing = await db
    .collection("users")
    .where("orgId", "==", orgId)
    .where("stationId", "==", data.stationId)
    .limit(1)
    .get();

  if (!existing.empty) {
    operatorUid = existing.docs[0].id;
  } else {
    const email = `kds.${data.stationId.toLowerCase()}@kds.restaurantos.local`;
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password: crypto.randomBytes(16).toString("hex"),
        displayName: `KDS · ${station.name}`,
      });
    }
    operatorUid = userRecord.uid;
    await db.collection("users").doc(operatorUid).set(
      {
        id: operatorUid,
        orgId,
        branchIds: [branchId],
        email,
        displayName: `KDS · ${station.name}`,
        role: "operator",
        stationId: data.stationId,
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
      },
      { merge: true },
    );
  }

  await setStaffClaims(operatorUid, { orgId, role: "operator", stationId: data.stationId });

  await db.collection("kds_pins").doc(data.stationId).set({
    orgId,
    branchId,
    stationId: data.stationId,
    operatorUid,
    ...newPinRecord(data.pin),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  functions.logger.info(`PIN set for station ${data.stationId} by ${uid}`);
  return { success: true, stationName: station.name };
});

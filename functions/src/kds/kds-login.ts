import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { verifyPin } from "./pin-lock";

interface KdsLoginRequest {
  stationId: string;
  pin: string;
}

/**
 * kdsLogin — Callable (public). A KDS device signs in to its station with a PIN.
 *
 * Security: the PIN is verified SERVER-SIDE against the hash in kds_pins, with
 * per-station escalating lockouts (5 min → 30 min → 24 h after each 5 wrong
 * tries). The station id is a random, unguessable Firestore id (an extra factor).
 * On success we mint a custom token for the station's operator identity with a
 * stationId claim: RTDB rules limit it to that station's tickets, and Firestore
 * rules deny operators any write on orders (no payments, no closing).
 */
export const kdsLogin = functions.https.onCall(async (data: KdsLoginRequest) => {
  if (!data.stationId || !/^\d{4,6}$/.test(data.pin || "")) {
    throw new functions.https.HttpsError("invalid-argument", "Estación o PIN inválidos.");
  }

  const db = admin.firestore();
  const ref = db.collection("kds_pins").doc(data.stationId);

  const outcome = await verifyPin(ref, data.pin, "Esta estación no tiene PIN configurado.");
  if (!outcome.ok) throw new functions.https.HttpsError(outcome.code, outcome.message);
  const result = { operatorUid: outcome.record.operatorUid as string, orgId: outcome.record.orgId as string };

  const token = await admin.auth().createCustomToken(result.operatorUid, {
    orgId: result.orgId,
    stationId: data.stationId,
    role: "operator",
  });

  let stationName = "Estación";
  try {
    const st = await db.collection("stations").doc(data.stationId).get();
    stationName = st.data()?.name ?? "Estación";
  } catch {
    /* keep default */
  }

  return { token, stationName };
});

/**
 * kdsStationInfo — Callable (public). Lets the KDS PIN screen show which
 * restaurant and station the device is set up for, so staff know they are on
 * the right kitchen. Returns display names only; the station id is the key.
 */
export const kdsStationInfo = functions.https.onCall(async (data: { stationId?: string }) => {
  if (!data.stationId) {
    throw new functions.https.HttpsError("invalid-argument", "Estación inválida.");
  }
  const db = admin.firestore();
  const st = await db.collection("stations").doc(data.stationId).get();
  if (!st.exists) {
    throw new functions.https.HttpsError("not-found", "Esta estación ya no existe.");
  }
  const station = st.data()!;
  const branch = await db.collection("branches").doc(station.branchId).get();
  return {
    stationName: (station.name as string) ?? "Estación",
    branchName: (branch.data()?.name as string) ?? "",
  };
});

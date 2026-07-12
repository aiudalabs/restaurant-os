import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

interface KdsLoginRequest {
  stationId: string;
  pin: string;
}

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000; // 5 minutes

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 32, "sha256").toString("hex");
}

/**
 * kdsLogin — Callable (public). A KDS device signs in to its station with a PIN.
 *
 * Security: the PIN is verified SERVER-SIDE against the hash in kds_pins, with
 * per-station rate limiting (locks for 5 min after 5 wrong tries). The station id
 * is a random, unguessable Firestore id (an extra factor). On success we mint a
 * custom token for the station's low-privilege operator identity — its blast
 * radius is one station's tickets, no money/PII/admin.
 */
export const kdsLogin = functions.https.onCall(async (data: KdsLoginRequest) => {
  if (!data.stationId || !/^\d{4,6}$/.test(data.pin || "")) {
    throw new functions.https.HttpsError("invalid-argument", "Estación o PIN inválidos.");
  }

  const db = admin.firestore();
  const ref = db.collection("kds_pins").doc(data.stationId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Esta estación no tiene PIN configurado.");
    }
    const p = snap.data()!;
    const now = Date.now();

    if (p.lockedUntil && now < p.lockedUntil) {
      const secs = Math.ceil((p.lockedUntil - now) / 1000);
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Demasiados intentos. Espera ${secs}s.`,
      );
    }

    if (hashPin(data.pin, p.salt) !== p.pinHash) {
      const attempts = (p.failedAttempts || 0) + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      tx.update(ref, {
        failedAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? now + LOCK_MS : 0,
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        locked ? "PIN incorrecto. Estación bloqueada 5 min." : "PIN incorrecto.",
      );
    }

    tx.update(ref, { failedAttempts: 0, lockedUntil: 0 });
    return { operatorUid: p.operatorUid as string, orgId: p.orgId as string };
  });

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

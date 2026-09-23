import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

interface KdsLoginRequest {
  stationId: string;
  pin: string;
}

const MAX_ATTEMPTS = 5;
// Each lockout is longer than the last until a correct PIN resets it. A flat
// 5-min lock allowed ~1,440 guesses/day (a 4-digit PIN fell in days).
const LOCK_STEPS_MS = [5 * 60 * 1000, 30 * 60 * 1000, 24 * 60 * 60 * 1000];

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 32, "sha256").toString("hex");
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
function waitLabel(ms: number): string {
  const mins = Math.ceil(ms / 60000);
  return mins >= 60 ? `${Math.ceil(mins / 60)} h` : `${mins} min`;
}

export const kdsLogin = functions.https.onCall(async (data: KdsLoginRequest) => {
  if (!data.stationId || !/^\d{4,6}$/.test(data.pin || "")) {
    throw new functions.https.HttpsError("invalid-argument", "Estación o PIN inválidos.");
  }

  const db = admin.firestore();
  const ref = db.collection("kds_pins").doc(data.stationId);

  // The transaction RETURNS the outcome and we throw afterwards: throwing inside
  // runTransaction rolls it back, which silently discarded every failed-attempt
  // counter and lockout (the PIN could be brute-forced without limit).
  type Outcome =
    | { ok: true; operatorUid: string; orgId: string }
    | { ok: false; code: "not-found" | "resource-exhausted" | "permission-denied"; message: string };

  const outcome = await db.runTransaction(async (tx): Promise<Outcome> => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return { ok: false, code: "not-found", message: "Esta estación no tiene PIN configurado." };
    }
    const p = snap.data()!;
    const now = Date.now();

    if (p.lockedUntil && now < p.lockedUntil) {
      return {
        ok: false,
        code: "resource-exhausted",
        message: `Demasiados intentos. Espera ${waitLabel(p.lockedUntil - now)}.`,
      };
    }

    if (hashPin(data.pin, p.salt) !== p.pinHash) {
      const attempts = (p.failedAttempts || 0) + 1;
      if (attempts < MAX_ATTEMPTS) {
        tx.update(ref, { failedAttempts: attempts });
        return { ok: false, code: "permission-denied", message: "PIN incorrecto." };
      }
      const level = Math.min((p.lockLevel || 0) + 1, LOCK_STEPS_MS.length);
      const lockMs = LOCK_STEPS_MS[level - 1];
      tx.update(ref, { failedAttempts: 0, lockLevel: level, lockedUntil: now + lockMs });
      return {
        ok: false,
        code: "permission-denied",
        message: `PIN incorrecto. Estación bloqueada ${waitLabel(lockMs)}.`,
      };
    }

    tx.update(ref, { failedAttempts: 0, lockedUntil: 0, lockLevel: 0 });
    return { ok: true, operatorUid: p.operatorUid as string, orgId: p.orgId as string };
  });

  if (!outcome.ok) throw new functions.https.HttpsError(outcome.code, outcome.message);
  const result = outcome;

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

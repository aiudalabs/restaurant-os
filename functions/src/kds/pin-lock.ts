import * as admin from "firebase-admin";
import * as crypto from "crypto";

/**
 * Shared PIN storage + verification for device logins (KDS station PINs in
 * kds_pins, waiter PINs in staff_pins). Both collections are server-only in
 * firestore.rules; documents hold { salt, pinHash, failedAttempts, lockLevel,
 * lockedUntil } plus their own ownership fields.
 */

const MAX_ATTEMPTS = 5;
// Each lockout is longer than the last until a correct PIN resets it. A flat
// 5-min lock allowed ~1,440 guesses/day (a 4-digit PIN fell in days).
const LOCK_STEPS_MS = [5 * 60 * 1000, 30 * 60 * 1000, 24 * 60 * 60 * 1000];

export const PIN_FORMAT = /^\d{6}$/;

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 32, "sha256").toString("hex");
}

function waitLabel(ms: number): string {
  const mins = Math.ceil(ms / 60000);
  return mins >= 60 ? `${Math.ceil(mins / 60)} h` : `${mins} min`;
}

/** Fields to store for a new PIN (resets any lockout). */
export function newPinRecord(pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, pinHash: hashPin(pin, salt), failedAttempts: 0, lockedUntil: 0, lockLevel: 0 };
}

export type PinOutcome =
  | { ok: true; record: admin.firestore.DocumentData }
  | { ok: false; code: "not-found" | "resource-exhausted" | "permission-denied"; message: string };

/**
 * Verifies a PIN against the record at `ref`, counting failures and applying
 * escalating lockouts (5 min → 30 min → 24 h) atomically.
 *
 * The transaction RETURNS the outcome and callers throw afterwards: throwing
 * inside runTransaction rolls it back, which silently discarded every
 * failed-attempt counter and lockout (the PIN could be brute-forced).
 */
export function verifyPin(
  ref: admin.firestore.DocumentReference,
  pin: string,
  notFoundMessage: string,
): Promise<PinOutcome> {
  return admin.firestore().runTransaction(async (tx): Promise<PinOutcome> => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, code: "not-found", message: notFoundMessage };
    const p = snap.data()!;
    const now = Date.now();

    if (p.lockedUntil && now < p.lockedUntil) {
      return { ok: false, code: "resource-exhausted", message: `Demasiados intentos. Espera ${waitLabel(p.lockedUntil - now)}.` };
    }

    if (hashPin(pin, p.salt) !== p.pinHash) {
      const attempts = (p.failedAttempts || 0) + 1;
      if (attempts < MAX_ATTEMPTS) {
        tx.update(ref, { failedAttempts: attempts });
        return { ok: false, code: "permission-denied", message: "PIN incorrecto." };
      }
      const level = Math.min((p.lockLevel || 0) + 1, LOCK_STEPS_MS.length);
      const lockMs = LOCK_STEPS_MS[level - 1];
      tx.update(ref, { failedAttempts: 0, lockLevel: level, lockedUntil: now + lockMs });
      return { ok: false, code: "permission-denied", message: `PIN incorrecto. Bloqueado ${waitLabel(lockMs)}.` };
    }

    tx.update(ref, { failedAttempts: 0, lockedUntil: 0, lockLevel: 0 });
    return { ok: true, record: p };
  });
}

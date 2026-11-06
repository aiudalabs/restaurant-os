import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export interface StaffClaims {
  orgId: string;
  role: string;
  stationId?: string;
}

/**
 * Custom claims mirror of users/{uid} (orgId, role, stationId). RTDB rules can't
 * read Firestore, so the KDS ticket nodes are isolated with
 * `auth.token.stationId === $stationId` — which only works if the claim exists.
 * Call this right after creating a staff account so its first login already has
 * the claims; syncStaffClaims keeps them current on later edits.
 */
export async function setStaffClaims(uid: string, c: StaffClaims): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, {
    orgId: c.orgId,
    role: c.role,
    ...(c.stationId ? { stationId: c.stationId } : {}),
  });
}

/** Runs one Auth step; a failure is logged (error level, except a missing Auth user) and never skips the next step. */
async function authStep(uid: string, step: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/user-not-found") {
      functions.logger.warn(`${step} skipped for ${uid}: Auth user not found`);
      return;
    }
    functions.logger.error(`${step} failed for ${uid}: ${(e as Error).message}`);
  }
}

/** Deactivation: drop claims, revoke refresh tokens, disable the Auth account (no new sign-ins). Independent steps. */
async function revokeStaffAccess(uid: string): Promise<void> {
  await authStep(uid, "Claims removal", () => admin.auth().setCustomUserClaims(uid, null));
  await authStep(uid, "Token revocation", () => admin.auth().revokeRefreshTokens(uid));
  await authStep(uid, "Account disable", () => admin.auth().updateUser(uid, { disabled: true }));
}

/**
 * syncStaffClaims — Firestore trigger on users/{uid}. When the admin changes a
 * user's role or station (or org), re-issue the claims. When isActive turns false the claims are removed and refresh
 * tokens revoked; when it turns true again they are re-emitted. The user's next token
 * refresh (≤1h, or forced by the KDS on a permission error) picks them up.
 */
export const syncStaffClaims = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return;
    const before = change.before.exists ? change.before.data() : null;
    const deactivated = after.isActive === false;
    const wasDeactivated = before?.isActive === false;
    if (deactivated) {
      if (wasDeactivated) return;
      await revokeStaffAccess(context.params.uid);
      return;
    }

    if (wasDeactivated) {
      await authStep(context.params.uid, "Account enable", () => admin.auth().updateUser(context.params.uid, { disabled: false }));
    }

    const same =
      before &&
      !wasDeactivated &&
      before.orgId === after.orgId &&
      before.role === after.role &&
      (before.stationId ?? "") === (after.stationId ?? "");
    if (same) return;

    try {
      await setStaffClaims(context.params.uid, {
        orgId: after.orgId ?? "",
        role: after.role ?? "",
        stationId: after.stationId ?? "",
      });
    } catch (e) {
      // The Auth user may already be gone (doc written during a delete).
      functions.logger.warn(`Claims not synced for ${context.params.uid}: ${(e as Error).message}`);
    }
  });

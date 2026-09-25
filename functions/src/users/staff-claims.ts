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

/**
 * syncStaffClaims — Firestore trigger on users/{uid}. When the admin changes a
 * user's role or station (or org), re-issue the claims. The user's next token
 * refresh (≤1h, or forced by the KDS on a permission error) picks them up.
 */
export const syncStaffClaims = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return;
    const before = change.before.exists ? change.before.data() : null;
    const same =
      before &&
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

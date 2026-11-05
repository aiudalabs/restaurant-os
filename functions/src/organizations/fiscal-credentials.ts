import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const HttpsError = functions.https.HttpsError;

async function requireAdmin(uid: string | undefined): Promise<{ uid: string; orgId: string; role: string }> {
  if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
  const me = (await admin.firestore().collection("users").doc(uid).get()).data();
  if (!me || me.isActive === false || !me.orgId) {
    throw new HttpsError("permission-denied", "Usuario sin organización.");
  }
  return { uid, orgId: me.orgId as string, role: me.role as string };
}

const privateDigifact = (orgId: string) =>
  admin.firestore().collection("organizations").doc(orgId).collection("private").doc("digifact");

/**
 * setFiscalCredentials — Callable (admin of the org).
 * Stores the Digifact API user of the organization in the server-only
 * subcollection organizations/{orgId}/private/digifact. The BFF reads it when
 * it certifies invoices. Never returned to clients.
 */
export const setFiscalCredentials = functions.https.onCall(
  async (data: { username?: string; password?: string }, context) => {
    const me = await requireAdmin(context.auth?.uid);
    if (me.role !== "admin") throw new HttpsError("permission-denied", "Solo el administrador puede guardar credenciales.");
    const username = typeof data.username === "string" ? data.username.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    if (!username || !password) throw new HttpsError("invalid-argument", "Usuario y contraseña son obligatorios.");

    // A new user invalidates any cached token.
    await privateDigifact(me.orgId).set(
      { username, password, token: admin.firestore.FieldValue.delete(), tokenExpiresAt: admin.firestore.FieldValue.delete(), updatedAt: admin.firestore.Timestamp.now(), updatedBy: me.uid },
      { merge: true },
    );
    await admin.firestore().collection("audit_log").add({
      orgId: me.orgId, type: "fiscal_credentials_set", by: me.uid, at: admin.firestore.Timestamp.now(),
    });
    functions.logger.info(`Digifact credentials set for org ${me.orgId} by ${me.uid}`);
    return { ok: true };
  },
);

/** getFiscalStatus — Callable (admin / manager): whether credentials exist, and the username. */
export const getFiscalStatus = functions.https.onCall(async (_data: unknown, context) => {
  const me = await requireAdmin(context.auth?.uid);
  if (!["admin", "manager"].includes(me.role)) throw new HttpsError("permission-denied", "Solo administradores.");
  const snap = await privateDigifact(me.orgId).get();
  const d = snap.data();
  const configured = !!(d?.username && d?.password);
  return { configured, ...(configured ? { username: d?.username as string } : {}) };
});

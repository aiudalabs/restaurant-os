import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface DeleteUserRequest {
  userId: string;
}

/**
 * deleteUser — Callable. An org admin deletes a staff user (Auth user + doc).
 * Guards: caller must be admin of the same org, and cannot delete themselves.
 */
export const deleteUser = functions.https.onCall(
  async (data: DeleteUserRequest, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Auth required.");
    if (!data.userId) throw new functions.https.HttpsError("invalid-argument", "userId requerido.");
    if (data.userId === uid) {
      throw new functions.https.HttpsError("failed-precondition", "No puedes eliminar tu propia cuenta.");
    }

    const db = admin.firestore();
    const [callerSnap, targetSnap] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("users").doc(data.userId).get(),
    ]);
    const caller = callerSnap.data();
    if (!callerSnap.exists || caller?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Solo un administrador puede eliminar usuarios.");
    }
    if (!targetSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Usuario no encontrado.");
    }
    if (targetSnap.data()?.orgId !== caller.orgId) {
      throw new functions.https.HttpsError("permission-denied", "El usuario pertenece a otra organización.");
    }

    await db.collection("users").doc(data.userId).delete();
    try {
      await admin.auth().deleteUser(data.userId);
    } catch (e) {
      // Doc-only users (e.g. odoo_*) may not have an Auth record — that's fine.
      functions.logger.warn(`Auth user ${data.userId} not deleted: ${(e as Error).message}`);
    }
    return { success: true };
  },
);

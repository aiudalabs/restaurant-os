import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

interface CreateOperatorRequest {
  email: string;
  displayName: string;
  orgId: string;
  branchIds: string[];
  role: "manager" | "operator";
  stationId?: string;
}

/**
 * createOperatorUser — Callable function
 *
 * Allows org admins to create operator/manager users.
 * Creates the user in Firebase Auth + Firestore users collection.
 */
export const createOperatorUser = functions.https.onCall(
  async (data: CreateOperatorRequest, context) => {
    // 1. Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to create users."
      );
    }

    const callerUid = context.auth.uid;
    const firestore = admin.firestore();

    // 2. Verify caller is admin of the target org
    const callerDoc = await firestore.collection("users").doc(callerUid).get();
    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Caller user document not found."
      );
    }

    const callerData = callerDoc.data()!;
    if (callerData.role !== "admin" || callerData.orgId !== data.orgId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins of the same organization can create users."
      );
    }

    // 3. Validate input
    if (!data.email || !data.displayName || !data.orgId || !data.branchIds?.length) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: email, displayName, orgId, branchIds."
      );
    }

    if (!["manager", "operator"].includes(data.role)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Role must be 'manager' or 'operator'."
      );
    }

    // 4. Generate a temporary password
    const tempPassword = crypto.randomBytes(16).toString("hex");

    try {
      // 5. Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: data.email,
        displayName: data.displayName,
        password: tempPassword,
      });

      const now = admin.firestore.Timestamp.now();

      // 6. Create Firestore user document
      const userData = {
        id: userRecord.uid,
        orgId: data.orgId,
        branchIds: data.branchIds,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        isActive: true,
        createdAt: now,
        ...(data.stationId ? { stationId: data.stationId } : {}),
      };

      await firestore.collection("users").doc(userRecord.uid).set(userData);

      // 7. Write audit log
      await firestore.collection("audit_log").add({
        orgId: data.orgId,
        action: "user_created",
        targetUserId: userRecord.uid,
        performedBy: callerUid,
        details: {
          email: data.email,
          role: data.role,
          branchIds: data.branchIds,
        },
        createdAt: now,
      });

      functions.logger.info(
        `User created: ${userRecord.uid} (${data.email}) by ${callerUid}`
      );

      return {
        uid: userRecord.uid,
        tempPassword: tempPassword,
        success: true,
      };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };

      if (firebaseError.code === "auth/email-already-exists") {
        throw new functions.https.HttpsError(
          "already-exists",
          `A user with email ${data.email} already exists.`
        );
      }

      functions.logger.error("Failed to create user:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to create user: ${firebaseError.message ?? "Unknown error"}`
      );
    }
  }
);

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

interface ProvisionBranchRequest {
  name: string;
  address?: string;
  phone?: string;
  menuId?: string;
  taxPercent?: number;
}

const STATION_DEFS = [
  { key: "cocina", name: "Cocina", color: "#F4511E" },
  { key: "bar", name: "Bar", color: "#3949AB" },
];

/**
 * provisionBranch — Callable (branch onboarding).
 *
 * Creates a branch AND everything it needs to operate: its stations (Cocina,
 * Bar) and one operator user per station (Firebase Auth user + users doc). This
 * closes the gap where a new branch had no stations/operators, so its orders
 * never reached a KDS. Returns the generated operator credentials so the owner
 * can hand them out (they can be renamed/reset later in the Users page).
 *
 * Only an org admin can call it; the new branch is added to the caller's
 * branchIds so it appears in their switcher immediately.
 */
export const provisionBranch = functions.https.onCall(
  async (data: ProvisionBranchRequest, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required.");
    }
    if (!data.name?.trim()) {
      throw new functions.https.HttpsError("invalid-argument", "El nombre de la sucursal es obligatorio.");
    }

    const db = admin.firestore();
    const callerSnap = await db.collection("users").doc(uid).get();
    const caller = callerSnap.data();
    if (!callerSnap.exists || caller?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo un administrador puede crear sucursales.",
      );
    }
    const orgId: string = caller.orgId;
    const now = admin.firestore.Timestamp.now();

    // 1. Branch + stations in one batch.
    const branchRef = db.collection("branches").doc();
    const batch = db.batch();
    batch.set(branchRef, {
      id: branchRef.id,
      orgId,
      name: data.name.trim(),
      address: data.address?.trim() ?? "",
      phone: data.phone?.trim() ?? "",
      menuId: data.menuId ?? "",
      taxPercent: typeof data.taxPercent === "number" ? data.taxPercent : 0.07,
      tipOptions: [],
      isActive: true,
      businessHours: {},
      createdAt: now,
    });

    const stations = STATION_DEFS.map((sd) => {
      const ref = db.collection("stations").doc();
      batch.set(ref, {
        id: ref.id,
        orgId,
        branchId: branchRef.id,
        name: sd.name,
        categoryIds: [],
        fcmTokens: [],
        color: sd.color,
        isActive: true,
        createdAt: now,
      });
      return { key: sd.key, id: ref.id, name: sd.name };
    });

    // Owner gains access to the new branch.
    batch.update(callerSnap.ref, {
      branchIds: admin.firestore.FieldValue.arrayUnion(branchRef.id),
    });

    await batch.commit();

    // 2. One operator per station (Auth user creation can't be batched).
    const slug = branchRef.id.slice(0, 6).toLowerCase();
    const operators: { station: string; email: string; password: string }[] = [];
    for (const st of stations) {
      const email = `${st.key}.${slug}@${orgId}.ros.app`;
      const password = crypto.randomBytes(6).toString("hex");
      let userRecord;
      try {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: `${st.name} · ${data.name.trim()}`,
        });
      } catch (e) {
        functions.logger.warn(`Operator ${email} not created: ${(e as Error).message}`);
        continue;
      }
      await db.collection("users").doc(userRecord.uid).set({
        id: userRecord.uid,
        orgId,
        branchIds: [branchRef.id],
        email,
        displayName: `${st.name} · ${data.name.trim()}`,
        role: "operator",
        stationId: st.id,
        isActive: true,
        createdAt: now,
      });
      operators.push({ station: st.name, email, password });
    }

    functions.logger.info(`Branch ${branchRef.id} provisioned by ${uid} (${stations.length} stations, ${operators.length} operators)`);
    return {
      branchId: branchRef.id,
      stations: stations.map((s) => ({ id: s.id, name: s.name })),
      operators,
    };
  },
);

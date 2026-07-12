import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface DeleteBranchRequest {
  branchId: string;
}

/**
 * deleteBranch — Callable. An org admin deletes a branch AND cascades:
 * its stations, its tables, and its dedicated operators (users assigned ONLY to
 * this branch). Operators shared with other branches just lose this branch from
 * their branchIds. Orders are left as historical records.
 */
export const deleteBranch = functions.https.onCall(
  async (data: DeleteBranchRequest, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Auth required.");
    if (!data.branchId) throw new functions.https.HttpsError("invalid-argument", "branchId requerido.");

    const db = admin.firestore();
    const callerSnap = await db.collection("users").doc(uid).get();
    const caller = callerSnap.data();
    if (!callerSnap.exists || caller?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Solo un administrador puede eliminar sucursales.");
    }
    const orgId = caller.orgId;

    const branchSnap = await db.collection("branches").doc(data.branchId).get();
    if (!branchSnap.exists || branchSnap.data()?.orgId !== orgId) {
      throw new functions.https.HttpsError("permission-denied", "La sucursal no existe o es de otra organización.");
    }

    const batch = db.batch();
    let stationCount = 0;
    let tableCount = 0;

    const stations = await db.collection("stations").where("branchId", "==", data.branchId).get();
    stations.forEach((d) => { batch.delete(d.ref); stationCount++; });

    const tables = await db.collection("tables").where("branchId", "==", data.branchId).get();
    tables.forEach((d) => { batch.delete(d.ref); tableCount++; });

    // Operators / staff assigned to this branch.
    const staff = await db.collection("users").where("branchIds", "array-contains", data.branchId).get();
    const toDeleteAuth: string[] = [];
    for (const d of staff.docs) {
      const u = d.data();
      const others = (u.branchIds || []).filter((b: string) => b !== data.branchId);
      if (others.length === 0 && u.role !== "admin") {
        // dedicated operator → remove entirely
        batch.delete(d.ref);
        toDeleteAuth.push(d.id);
      } else {
        batch.update(d.ref, { branchIds: others });
      }
    }

    batch.delete(branchSnap.ref);
    await batch.commit();

    // Delete the orphaned operators' Auth records (outside the Firestore batch).
    let operatorCount = 0;
    for (const authUid of toDeleteAuth) {
      try {
        await admin.auth().deleteUser(authUid);
        operatorCount++;
      } catch (e) {
        functions.logger.warn(`Auth user ${authUid} not deleted: ${(e as Error).message}`);
      }
    }

    functions.logger.info(
      `Branch ${data.branchId} deleted by ${uid}: ${stationCount} stations, ${tableCount} tables, ${operatorCount} operators.`,
    );
    return { success: true, stations: stationCount, tables: tableCount, operators: operatorCount };
  },
);

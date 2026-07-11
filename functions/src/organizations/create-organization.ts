import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface CreateOrgRequest {
  orgName: string;
  ownerName: string;
  branchName?: string;
  timezone?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/**
 * createOrganization — Callable (tenant onboarding).
 *
 * The just-signed-up user becomes the OWNER of a brand-new organization. In one
 * batch we create: the organization, its first branch, an (empty) first menu
 * assigned to that branch, and the caller's users/{uid} doc (role admin).
 *
 * Guard: the caller must not already belong to an org (no users doc), so an
 * existing staff member can't spin themselves a second tenant by accident.
 */
export const createOrganization = functions.https.onCall(
  async (data: CreateOrgRequest, context) => {
    const uid = context.auth?.uid;
    const email = context.auth?.token.email ?? "";
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required.");
    }
    if (!data.orgName?.trim() || !data.ownerName?.trim()) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orgName y ownerName son obligatorios."
      );
    }

    const db = admin.firestore();

    const existing = await db.collection("users").doc(uid).get();
    if (existing.exists) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Este usuario ya pertenece a una organización."
      );
    }

    const now = admin.firestore.Timestamp.now();
    const orgRef = db.collection("organizations").doc();
    const branchRef = db.collection("branches").doc();
    const menuRef = db.collection("menus").doc();

    const batch = db.batch();

    batch.set(orgRef, {
      id: orgRef.id,
      name: data.orgName.trim(),
      slug: slugify(data.orgName),
      plan: "starter",
      defaultCurrency: "USD",
      defaultTaxPercent: 0.07,
      defaultTipOptions: [0.1, 0.15, 0.2],
      timezone: data.timezone || "America/Panama",
      isActive: true,
      ownerId: uid,
      createdAt: now,
    });

    batch.set(menuRef, {
      id: menuRef.id,
      orgId: orgRef.id,
      name: "Menú principal",
      isActive: true,
      createdAt: now,
    });

    batch.set(branchRef, {
      id: branchRef.id,
      orgId: orgRef.id,
      name: data.branchName?.trim() || "Sucursal principal",
      address: "",
      menuId: menuRef.id,
      taxPercent: 0.07,
      tipOptions: [],
      isActive: true,
      businessHours: {},
      createdAt: now,
    });

    batch.set(db.collection("users").doc(uid), {
      id: uid,
      orgId: orgRef.id,
      branchIds: [branchRef.id],
      email,
      displayName: data.ownerName.trim(),
      role: "admin",
      isActive: true,
      createdAt: now,
    });

    await batch.commit();

    functions.logger.info(`Organization ${orgRef.id} created by owner ${uid}`);
    return { orgId: orgRef.id, branchId: branchRef.id, menuId: menuRef.id };
  }
);

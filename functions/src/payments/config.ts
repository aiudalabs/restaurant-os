import { defineSecret, defineString } from "firebase-functions/params";

/**
 * Where the BFF lives for this project (functions/.env.<projectId>) and the
 * shared secret for its internal endpoints (Secret Manager: BFF_INTERNAL_TOKEN,
 * same value as INTERNAL_TOKEN on the Cloud Run service).
 */
export const bffUrl = defineString("BFF_URL", { default: "" });
export const bffInternalToken = defineSecret("BFF_INTERNAL_TOKEN");

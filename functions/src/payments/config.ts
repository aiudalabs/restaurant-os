import { defineSecret, defineString } from "firebase-functions/params";

/**
 * Where the BFF lives for this project (functions/.env.<projectId>) and the
 * shared secret for its internal endpoints (Secret Manager: BFF_INTERNAL_TOKEN,
 * same value as INTERNAL_TOKEN on the Cloud Run service).
 */
export const bffUrl = defineString("BFF_URL", { default: "" });
export const bffInternalToken = defineSecret("BFF_INTERNAL_TOKEN");

/**
 * Runtime identity for v2 (Eventarc) functions that write to RTDB.
 *
 * v2 functions default to the Compute Engine service account, which has no
 * Realtime Database access: the KDS mirror write fails ("authentication
 * credentials are invalid") and paid orders never reach the kitchen. v1
 * functions run as the App Engine account (roles/firebase.admin). Pointing the
 * v2 function at that same account keeps one identity for every environment
 * without extra IAM per project. Undefined when the project id is unknown
 * (then the platform default applies).
 */
const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
export const runtimeServiceAccount = projectId ? `${projectId}@appspot.gserviceaccount.com` : undefined;

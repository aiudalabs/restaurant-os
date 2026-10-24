import * as crypto from "crypto";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";
import { memberId, STAMP_GOAL, TIERS, type MemberState } from "./program";

/**
 * Google Wallet pass for the Club card (issue #77).
 *
 * "Save to Google Wallet" link = a JWT signed (RS256) with the issuer's service
 * account, carrying the class and the object inline. No Google API call, no new
 * dependency. Configuration (nothing is hard-coded):
 *   - GOOGLE_WALLET_ISSUER_ID  (functions/.env.<projectId>)  Issuer ID from the Google Pay & Wallet Console
 *   - CUSTOMER_URL             (functions/.env.<projectId>)  public URL of customer_web (logo, link back)
 *   - GOOGLE_WALLET_KEY        (Secret Manager)              the issuer service account's JSON key
 * Until all three exist the callable answers "failed-precondition" and the app hides the button.
 */

export const walletIssuerId = defineString("GOOGLE_WALLET_ISSUER_ID", { default: "" });
export const customerUrl = defineString("CUSTOMER_URL", { default: "" });

const CLASS_SUFFIX = "pick_and_eat_club";
const BRAND_GREEN = "#3F6B2A";

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const b64url = (v: Buffer | string): string => Buffer.from(v).toString("base64url");

/** Signs a compact RS256 JWT. */
export function signJwt(payload: Record<string, unknown>, key: string): string {
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createSign("RSA-SHA256").update(`${head}.${body}`).sign(key);
  return `${head}.${body}.${b64url(sig)}`;
}

export interface PassInput {
  issuerId: string;
  siteUrl: string;
  account: ServiceAccount;
  memberId: string;
  name: string;
  member: MemberState;
}

/** The "add to wallet" URL for one member (pure, testable). */
export function buildSaveUrl(i: PassInput): string {
  const classId = `${i.issuerId}.${CLASS_SUFFIX}`;
  const tier = TIERS.find((t) => t.id === i.member.tier)?.id ?? "bronce";
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const logo = { sourceUri: { uri: `${i.siteUrl}/icons/icon-512.png` } };
  const payload = {
    iss: i.account.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [] as string[],
    payload: {
      loyaltyClasses: [
        {
          id: classId,
          issuerName: "Pick & Eat",
          programName: "Pick & Eat Club",
          programLogo: logo,
          hexBackgroundColor: BRAND_GREEN,
          reviewStatus: "UNDER_REVIEW",
          countryCode: "PA",
        },
      ],
      loyaltyObjects: [
        {
          id: `${i.issuerId}.${i.memberId}`,
          classId,
          state: "ACTIVE",
          accountId: i.memberId,
          accountName: i.name || "Socio",
          loyaltyPoints: { label: "Puntos", balance: { int: i.member.points } },
          secondaryLoyaltyPoints: { label: "Sellos", balance: { string: `${i.member.stamps}/${STAMP_GOAL}` } },
          textModulesData: [{ id: "nivel", header: "Nivel", body: tierLabel }],
          barcode: { type: "QR_CODE", value: i.memberId, alternateText: i.memberId.slice(-8) },
          linksModuleData: { uris: [{ uri: `${i.siteUrl}/club`, description: "Mi Club" }] },
        },
      ],
    },
  };
  return `https://pay.google.com/gp/v/save/${signJwt(payload, i.account.private_key)}`;
}

const HttpsError = functions.https.HttpsError;

/**
 * googleWalletLink — Callable (the customer). Returns the Save-to-Wallet URL with
 * the member's current balance. The pass shows the balance at the moment it is
 * added; live updates need the Wallet REST API (not wired yet).
 */
export const googleWalletLink = functions
  .runWith({ secrets: ["GOOGLE_WALLET_KEY"] })
  .https.onCall(async (data: { orgId?: string }, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Auth required.");
    if (typeof data.orgId !== "string" || !data.orgId) throw new HttpsError("invalid-argument", "orgId es obligatorio.");

    const issuerId = walletIssuerId.value();
    const siteUrl = customerUrl.value().replace(/\/$/, "");
    const raw = process.env.GOOGLE_WALLET_KEY ?? "";
    if (!issuerId || !siteUrl || !raw) throw new HttpsError("failed-precondition", "Google Wallet no está configurado.");

    let account: ServiceAccount;
    try {
      account = JSON.parse(raw) as ServiceAccount;
    } catch {
      throw new HttpsError("failed-precondition", "La clave de Google Wallet no es un JSON válido.");
    }

    const mid = memberId(data.orgId, uid);
    const snap = await admin.firestore().collection("loyalty_members").doc(mid).get();
    if (!snap.exists) throw new HttpsError("failed-precondition", "Aún no tienes puntos: haz tu primer pedido.");
    const m = snap.data() as MemberState & { name?: string };
    return { url: buildSaveUrl({ issuerId, siteUrl, account, memberId: mid, name: m.name ?? "", member: m }) };
  });

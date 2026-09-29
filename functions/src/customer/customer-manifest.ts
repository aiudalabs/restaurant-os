import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * customerManifest — GET /manifest.webmanifest?org=…&branch=… (Hosting rewrite, customer site).
 *
 * Web app manifest per branch so "Instalar" puts the restaurant's own name on the
 * home screen and the installed app opens straight to that branch's menu
 * (issue #49). The branch name is public (the menu shows it); nothing else from
 * the branch is exposed. Unknown or mismatched ids get the generic manifest.
 */

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

function manifest(name: string, startUrl: string, id: string) {
  return {
    id,
    name,
    short_name: name.length <= 12 ? name : name.slice(0, 12).trim(),
    description: `Haz tu pedido en ${name} y retíralo sin filas.`,
    lang: "es",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    background_color: "#F7F6F3",
    theme_color: "#E23744",
    icons: ICONS,
  };
}

export const customerManifest = functions.https.onRequest(async (req, res) => {
  res.set("Content-Type", "application/manifest+json; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300");

  const org = String(req.query.org ?? "");
  const branch = String(req.query.branch ?? "");
  const generic = manifest("Pedir", "/", "/");
  if (!ID.test(org) || !ID.test(branch)) {
    res.send(generic);
    return;
  }

  try {
    const snap = await admin.firestore().collection("branches").doc(branch).get();
    const b = snap.data();
    if (!b || b.orgId !== org || b.isActive === false) {
      res.send(generic);
      return;
    }
    const name = String(b.name || "Pedir").trim();
    res.send(manifest(name, `/?org=${org}&branch=${branch}`, `/?branch=${branch}`));
  } catch (e) {
    functions.logger.error("customerManifest failed", e);
    res.send(generic);
  }
});

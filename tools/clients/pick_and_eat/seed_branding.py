#!/usr/bin/env python3
"""
Siembra la marca (branches/{id}.branding) de Pick & Eat y sube su logo/ícono a Storage.
Ver docs/BRANDING_DESIGN.md (Refs #108). Dry-run por defecto.

  ROS_PROJECT=restaurant-os-dev-49096 CLOUDSDK_CORE_ACCOUNT=admin@aiudalabs.com \
    python3 tools/clients/pick_and_eat/seed_branding.py [--yes]

Prod solo con `--allow-prod` Y ROS_PROJECT=restaurant-os-68c79. Solo añade el campo
`branding` (updateMask) y dos archivos bajo orgs/<orgId>/brand/; no toca otros datos.
"""
import argparse, json, os, subprocess, sys, urllib.parse, urllib.request

DEV = "restaurant-os-dev-49096"
PROD = "restaurant-os-68c79"
ORG_NAME = "Pick & Eat"
BRAND = {"displayName": "Pick & Eat", "primary": "#3F6B2A", "accent": "#C9A24A", "fontPreset": "classic"}
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FILES = [  # (local, object name under orgs/<org>/brand/, branding field)
    ("apps/customer_web/brand-assets/pick_and_eat/logo.png", "logo.png", "logoUrl"),
    ("apps/customer_web/public/icons/icon-512.png", "icon-512.png", "iconUrl"),
]


def token():
    return subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()


def http(url, body=None, method=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method or ("POST" if body is not None else "GET"),
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} en {url.split('?')[0]}: {e.read().decode()[:300]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--yes", action="store_true", help="aplica los cambios (por defecto solo muestra)")
    ap.add_argument("--allow-prod", action="store_true")
    ap.add_argument("--logo", help="PNG del logo (por defecto apps/customer_web/brand-assets/pick_and_eat/logo.png)")
    ap.add_argument("--icon", help="PNG 512 del ícono (por defecto apps/customer_web/public/icons/icon-512.png)")
    a = ap.parse_args()
    project = os.environ.get("ROS_PROJECT") or sys.exit("Define ROS_PROJECT (dev o prod). Ver docs/ENVIRONMENTS.md")
    if project not in (DEV, PROD):
        sys.exit(f"ROS_PROJECT desconocido: {project}")
    if project == PROD and not a.allow_prod:
        sys.exit("Prod rechazado: requiere --allow-prod y ROS_PROJECT=" + PROD)
    if a.allow_prod and project != PROD:
        sys.exit("--allow-prod solo aplica con ROS_PROJECT=" + PROD)
    bucket = f"{project}.firebasestorage.app"
    fs = f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents"
    hdr = {"Authorization": f"Bearer {token()}", "x-goog-user-project": project}

    def query(coll, field, value):
        r = http(fs + ":runQuery", {"structuredQuery": {"from": [{"collectionId": coll}], "where": {"fieldFilter": {
            "field": {"fieldPath": field}, "op": "EQUAL", "value": {"stringValue": value}}}}}, headers=hdr)
        return [x["document"] for x in r if x.get("document")]

    orgs = query("organizations", "name", ORG_NAME)
    if len(orgs) != 1:
        sys.exit(f"Esperaba 1 organización '{ORG_NAME}', encontré {len(orgs)}")
    org = orgs[0]["name"].split("/")[-1]
    branches = [d["name"].split("/")[-1] for d in query("branches", "orgId", org)]
    print(f"proyecto={project} org={org} sucursales={branches} modo={'APLICAR' if a.yes else 'DRY-RUN'}")

    branding = dict(BRAND)
    overrides = {"logoUrl": a.logo, "iconUrl": a.icon}
    for local, name, field in FILES:
        path = os.path.abspath(overrides[field]) if overrides[field] else os.path.join(ROOT, local)
        if not os.path.isfile(path):
            sys.exit(f"Falta {path}")
        obj = f"orgs/{org}/brand/{name}"
        branding[field] = f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{urllib.parse.quote(obj, safe='')}?alt=media"
        print(f"subir {local} -> gs://{bucket}/{obj}")
        if a.yes:
            subprocess.run(["gcloud", "storage", "cp", path, f"gs://{bucket}/{obj}", "--content-type=image/png",
                            "--cache-control=public,max-age=300", "--quiet", f"--project={project}"], check=True)
    fields = {"mapValue": {"fields": {k: {"stringValue": v} for k, v in branding.items()}}}
    print("branding =", json.dumps(branding, indent=2))
    for b in branches:
        print(f"branches/{b}.branding <- (updateMask=branding)")
        if a.yes:
            http(fs + f"/branches/{b}?updateMask.fieldPaths=branding&currentDocument.exists=true",
                 {"fields": {"branding": fields}}, "PATCH", hdr)
    print("listo." if a.yes else "dry-run: nada escrito (usa --yes).")


if __name__ == "__main__":
    main()

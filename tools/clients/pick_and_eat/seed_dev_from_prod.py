#!/usr/bin/env python3
"""
Crea en DEV una organización «Pick & Eat» de demo con el menú de PROD (solo lectura sobre prod).

Flujo (el mismo del alta real): signUp en Firebase Auth -> callable createOrganization ->
copia categorías, productos, estaciones y fotos desde prod -> crea un mesero con PIN y PIN de estaciones.

  ROS_PROJECT=restaurant-os-dev-49096 CLOUDSDK_CORE_ACCOUNT=admin@aiudalabs.com \
    python3 tools/clients/pick_and_eat/seed_dev_from_prod.py --email admin@aiudalabs.com

Seguridad: aborta si el destino no es dev. Prod solo se LEE. Contraseña y PINs son aleatorios y se
imprimen una vez; no se guardan en ningún archivo.
"""
import argparse, json, re, secrets, subprocess, sys, urllib.parse, urllib.request

DEV = "restaurant-os-dev-49096"
PROD = "restaurant-os-68c79"
PROD_ORG = "yN4NWwXOCjmh0ydwwRIu"
DEV_BUCKET = f"{DEV}.firebasestorage.app"
PROD_BUCKET = f"{PROD}.firebasestorage.app"


def token() -> str:
    return subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()


def http(url, body=None, method=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method or ("POST" if body is not None else "GET"),
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} en {url.split('?')[0]}: {e.read().decode()[:300]}")


def fs_url(project, path=""):
    return f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents{path}"


def query_prod(coll):
    r = http(fs_url(PROD) + ":runQuery", {"structuredQuery": {
        "from": [{"collectionId": coll}],
        "where": {"fieldFilter": {"field": {"fieldPath": "orgId"}, "op": "EQUAL", "value": {"stringValue": PROD_ORG}}}}},
        headers={"Authorization": f"Bearer {PA}"})
    return [x["document"] for x in r if x.get("document")]


def sval(v): return {"stringValue": v}


def main():
    global PA
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", required=True, help="correo del administrador de la org demo")
    ap.add_argument("--waiter-email", default="mesero.demo@pickneat.test")
    a = ap.parse_args()
    import os
    if os.environ.get("ROS_PROJECT") != DEV:
        sys.exit(f"ROS_PROJECT debe ser {DEV}")
    PA = token()
    hdr = {"Authorization": f"Bearer {PA}", "x-goog-user-project": DEV}

    api_key = None
    for line in open("apps/admin_app/.env.restaurant-os-dev-49096"):
        if line.startswith("VITE_FIREBASE_API_KEY="):
            api_key = line.strip().split("=", 1)[1]
    if not api_key:
        sys.exit("No encuentro VITE_FIREBASE_API_KEY de dev")

    # 1. Alta como la hace la app: signUp + createOrganization
    password = "Pe-" + secrets.token_urlsafe(9)
    su = http(f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={api_key}",
              {"email": a.email, "password": password, "returnSecureToken": True})
    idt = su["idToken"]
    call = lambda name, data, t=None: http(f"https://us-central1-{DEV}.cloudfunctions.net/{name}", {"data": data},
                                           headers={"Authorization": f"Bearer {t or idt}"})["result"]
    call("createOrganization", {"orgName": "Pick & Eat", "ownerName": "Admin Pick & Eat", "branchName": "Pick & Eat", "plan": "growth"})
    me = http(fs_url(DEV, f"/users/{su['localId']}"), headers=hdr)["fields"]
    org, branch = me["orgId"]["stringValue"], me["branchIds"]["arrayValue"]["values"][0]["stringValue"]
    b = http(fs_url(DEV, f"/branches/{branch}"), headers=hdr)["fields"]
    menu = b["menuId"]["stringValue"]
    print(f"org={org} branch={branch} menu={menu}")

    # 2. Copiar desde prod: sucursal (config), menú, categorías, productos, estaciones
    prod_branch = query_prod("branches")[0]["fields"]
    patch = {k: prod_branch[k] for k in ("address", "businessHours", "taxPercent", "tipOptions", "showProductImagesToWaiters") if k in prod_branch}
    patch["allowPayAtPickup"] = {"booleanValue": True}
    mask = "&".join(f"updateMask.fieldPaths={k}" for k in patch)
    http(fs_url(DEV, f"/branches/{branch}?{mask}"), {"fields": patch}, "PATCH", hdr)

    def put(coll, doc):
        f = dict(doc["fields"]); did = doc["name"].split("/")[-1]
        f["orgId"] = sval(org)
        if "menuId" in f: f["menuId"] = sval(menu)
        if "branchId" in f: f["branchId"] = sval(branch)
        return did, f

    for coll in ("categories", "stations", "products"):
        docs = query_prod(coll)
        for d in docs:
            did, f = put(coll, d)
            if coll == "products" and "imageUrl" in f:
                u = f["imageUrl"]["stringValue"]
                m = re.search(r"/o/([^?]+)", u)
                if m:
                    obj = urllib.parse.unquote(m.group(1))                     # orgs/<prod>/products/x.jpg
                    new = obj.replace(f"orgs/{PROD_ORG}/", f"orgs/{org}/")
                    subprocess.run(["gcloud", "storage", "cp", f"gs://{PROD_BUCKET}/{obj}", f"gs://{DEV_BUCKET}/{new}", "--quiet"],
                                   check=True, capture_output=True)
                    f["imageUrl"] = sval(f"https://firebasestorage.googleapis.com/v0/b/{DEV_BUCKET}/o/{urllib.parse.quote(new, safe='')}?alt=media")
            f["id"] = sval(did)
            http(fs_url(DEV, f"/{coll}/{did}"), {"fields": f}, "PATCH", hdr)
        print(f"{coll}: {len(docs)}")

    # 3. Personal de prueba: PIN de estaciones y un mesero con PIN
    out = {"admin": (a.email, password), "stations": {}, "waiter": None}
    for d in query_prod("stations"):
        sid = d["name"].split("/")[-1]; pin = f"{secrets.randbelow(10**6):06d}"
        call("setStationPin", {"stationId": sid, "pin": pin})
        out["stations"][d["fields"]["name"]["stringValue"]] = (sid, pin)
    w = call("createOperatorUser", {"email": a.waiter_email, "displayName": "Mesero Demo", "orgId": org,
                                    "branchIds": [branch], "role": "waiter"})
    wid = w.get("uid") or w.get("userId")
    pin = f"{secrets.randbelow(10**6):06d}"
    call("setWaiterPin", {"userId": wid, "pin": pin})
    out["waiter"] = ("Mesero Demo", pin)
    out["ids"] = {"org": org, "branch": branch}
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

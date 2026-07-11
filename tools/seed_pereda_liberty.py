#!/usr/bin/env python3
"""Seed the 'Pereda Liberty' branch with a simple, functional demo menu:
categories + products (with images), station routing, and tables with QR codes.
Idempotent-ish: adds products/tables and fixes station routing. Uses gcloud token.

  python3 tools/seed_pereda_liberty.py           # dry-run
  python3 tools/seed_pereda_liberty.py --yes      # apply
"""
import json, subprocess, sys, urllib.request, urllib.error

PROJECT = "restaurant-os-68c79"
ORG = "demo-org"
BRANCH = "26qBYnIxdHuUYSNN7uHx"
MENU = "EgjMYwhJ0M6CXLNhH2uT"
COCINA = "PqhATLGDIzCAgUXRxsON"
BAR = "u2rKvZHRPu8LhGN0J4HB"
PIZZA_CAT = "SHdzrTT9vALtUOWDebfR"       # existing
BEBIDAS_CAT = "gFKfRc5DPglQ38GTKSJW"     # existing
CUSTOMER = "https://restaurant-os-pedir.web.app"
FS = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"

# New categories to create (Pizza + Bebidas already exist).
NEW_CATS = [
    {"key": "burgers", "name": "Hamburguesas", "sortOrder": 1},
    {"key": "postres", "name": "Postres", "sortOrder": 3},
]

def img(url): return url
def ph(text): return f"https://placehold.co/600x400/E23744/FFFFFF.png?text={text.replace(' ', '+')}"

# category key -> resolved id filled in at runtime
PRODUCTS = [
    # Pizza (real photos)
    {"cat": PIZZA_CAT, "name": "Pizza Pepperoni", "price": 12.0, "prep": 15,
     "desc": "Salsa de tomate, mozzarella y pepperoni.",
     "img": img("https://upload.wikimedia.org/wikipedia/commons/d/d1/Pepperoni_pizza.jpg")},
    {"cat": PIZZA_CAT, "name": "Pizza 4 Quesos", "price": 11.0, "prep": 15,
     "desc": "Mozzarella, parmesano, gorgonzola y provolone.",
     "img": img("https://upload.wikimedia.org/wikipedia/commons/5/51/Cheese_Pizza.jpg")},
    # Hamburguesas
    {"cat": "burgers", "name": "Hamburguesa Clásica", "price": 9.0, "prep": 12,
     "desc": "Carne de res, lechuga, tomate y salsa de la casa.",
     "img": img("https://upload.wikimedia.org/wikipedia/commons/0/0b/RedDot_Burger.jpg")},
    {"cat": "burgers", "name": "Hamburguesa Doble Queso", "price": 11.0, "prep": 14,
     "desc": "Doble carne, doble queso cheddar y bacon.",
     "img": ph("Hamburguesa Doble")},
    # Bebidas
    {"cat": BEBIDAS_CAT, "name": "Cerveza Panamá", "price": 2.5, "prep": 1,
     "desc": "Pilsner panameña 355 ml.",
     "img": img("https://upload.wikimedia.org/wikipedia/commons/2/28/Cerveza_Panama.jpg")},
    {"cat": BEBIDAS_CAT, "name": "Cerveza Balboa", "price": 2.5, "prep": 1,
     "desc": "Pale lager panameña 355 ml.",
     "img": img("https://upload.wikimedia.org/wikipedia/commons/4/45/Botella_de_Cerveza_Balboa.jpg")},
    {"cat": BEBIDAS_CAT, "name": "Coca-Cola", "price": 1.5, "prep": 1,
     "desc": "Refresco 355 ml.", "img": ph("Coca-Cola")},
    {"cat": BEBIDAS_CAT, "name": "Limonada Natural", "price": 2.0, "prep": 2,
     "desc": "Limonada fresca del día.", "img": ph("Limonada")},
    # Postres
    {"cat": "postres", "name": "Cheesecake", "price": 4.5, "prep": 3,
     "desc": "Tarta de queso con salsa de fresa.", "img": ph("Cheesecake")},
    {"cat": "postres", "name": "Brownie con Helado", "price": 5.0, "prep": 4,
     "desc": "Brownie tibio con helado de vainilla.", "img": ph("Brownie")},
]

TABLES = [{"number": str(n), "zone": "Salón", "capacity": 4} for n in range(2, 7)]

def token():
    return subprocess.run(["gcloud", "auth", "print-access-token"],
                          capture_output=True, text=True).stdout.strip()

def http(method, url, tok, body=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Authorization": f"Bearer {tok}"}
    if data:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode(); return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:200]}

def s(x): return {"stringValue": x}
def d(x): return {"doubleValue": float(x)}
def i(x): return {"integerValue": str(x)}
def b(x): return {"booleanValue": bool(x)}
def arr(vals): return {"arrayValue": {"values": [s(v) for v in vals]}}

def main():
    apply = "--yes" in sys.argv
    print("APLICAR" if apply else "DRY-RUN (usa --yes para aplicar)")
    tok = token()
    cat_ids = {PIZZA_CAT: PIZZA_CAT, BEBIDAS_CAT: BEBIDAS_CAT}

    print("\n1) Categorías nuevas:")
    for c in NEW_CATS:
        print(f"   + {c['name']}")
        if apply:
            st, res = http("POST", f"{FS}/categories", tok, {"fields": {
                "orgId": s(ORG), "menuId": s(MENU), "name": s(c["name"]),
                "sortOrder": i(c["sortOrder"]), "isActive": b(True)}})
            cid = res.get("name", "").split("/")[-1] if st == 200 else None
            cat_ids[c["key"]] = cid
            print(f"       -> {st} id={cid}")
        else:
            cat_ids[c["key"]] = f"<{c['key']}>"

    print("\n2) Productos (con imágenes):")
    for p in PRODUCTS:
        cid = cat_ids.get(p["cat"], p["cat"])
        print(f"   + {p['name']}  (${p['price']})  cat={cid}")
        if apply:
            st, _ = http("POST", f"{FS}/products", tok, {"fields": {
                "orgId": s(ORG), "menuId": s(MENU), "categoryId": s(cid),
                "name": s(p["name"]), "description": s(p["desc"]),
                "price": d(p["price"]), "imageUrl": s(p["img"]),
                "isActive": b(True), "sortOrder": i(0), "tags": arr([]),
                "modifierGroups": {"arrayValue": {"values": []}},
                "preparationMinutes": i(p["prep"])}})
            print(f"       -> {st}")

    print("\n3) Routing de estaciones:")
    routing = {
        COCINA: [PIZZA_CAT, cat_ids.get("burgers", ""), cat_ids.get("postres", "")],
        BAR: [BEBIDAS_CAT],
    }
    for sid, cats in routing.items():
        cats = [c for c in cats if c and not c.startswith("<")]
        print(f"   station {sid} -> categoryIds={cats}, isActive=True")
        if apply:
            mask = "updateMask.fieldPaths=categoryIds&updateMask.fieldPaths=isActive"
            st, _ = http("PATCH", f"{FS}/stations/{sid}?{mask}", tok,
                         {"fields": {"categoryIds": arr(cats), "isActive": b(True)}})
            print(f"       -> {st}")

    print("\n4) Mesas (con QR a customer_web):")
    # fix existing table 1 qr + create 2..6
    print("   fix Mesa 1 qrData")
    if apply:
        t1 = "ul4sD9BNlMk0EsG4GHAp"
        url = f"{CUSTOMER}/?org={ORG}&branch={BRANCH}&table={t1}"
        http("PATCH", f"{FS}/tables/{t1}?updateMask.fieldPaths=qrData", tok,
             {"fields": {"qrData": s(url)}})
    for t in TABLES:
        print(f"   + Mesa {t['number']}")
        if apply:
            st, res = http("POST", f"{FS}/tables", tok, {"fields": {
                "orgId": s(ORG), "branchId": s(BRANCH), "number": s(t["number"]),
                "zone": s(t["zone"]), "capacity": i(t["capacity"]),
                "isActive": b(True), "qrData": s("")}})
            tid = res.get("name", "").split("/")[-1] if st == 200 else None
            if tid:
                url = f"{CUSTOMER}/?org={ORG}&branch={BRANCH}&table={tid}"
                http("PATCH", f"{FS}/tables/{tid}?updateMask.fieldPaths=qrData", tok,
                     {"fields": {"qrData": s(url)}})
            print(f"       -> {st} id={tid}")

    print("\nlisto." if apply else "\n(dry-run — nada se escribió)")

if __name__ == "__main__":
    main()

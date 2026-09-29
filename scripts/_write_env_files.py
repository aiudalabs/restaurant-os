"""Write the config files of a new environment (called by scripts/bootstrap-env.sh).

Reads everything from environment variables (ALIAS, PROJECT, SDK_JSON, RTDB_URL,
BFF_URL, SA, REGION, BFF_SERVICE, SITE_*) and writes, relative to the repo root:
  apps/<app>/.env.<project>      web config + URLs (and .env.development for dev)
  .firebaserc                    alias + hosting targets
  deploy/env/<alias>.env         BFF variables (no secrets)
See docs/ENVIRONMENTS.md.
"""
import json
import os

e = os.environ
project, alias = e["PROJECT"], e["ALIAS"]
sdk = json.loads(e["SDK_JSON"])
sdk = sdk.get("result", sdk)
sdk = sdk.get("sdkConfig", sdk)
if sdk.get("projectId") != project:
    raise SystemExit(f"sdkconfig es de {sdk.get('projectId')}, no de {project}")

SITES = {k: e[f"SITE_{k.upper()}"] for k in ("admin", "customer", "kds", "waiter", "landing")}
urls = {k: f"https://{site}.web.app" for k, site in SITES.items()}

firebase = "\n".join([
    f"VITE_FIREBASE_API_KEY={sdk['apiKey']}",
    f"VITE_FIREBASE_AUTH_DOMAIN={sdk['authDomain']}",
    f"VITE_FIREBASE_PROJECT_ID={sdk['projectId']}",
    f"VITE_FIREBASE_STORAGE_BUCKET={sdk['storageBucket']}",
    f"VITE_FIREBASE_MESSAGING_SENDER_ID={sdk['messagingSenderId']}",
    f"VITE_FIREBASE_APP_ID={sdk['appId']}",
    f"VITE_FIREBASE_DATABASE_URL={e['RTDB_URL']}",
])
header = (
    f"# {alias.upper()} ({project}). Config web pública de Firebase + URLs del ambiente.\n"
    f"# Generado por scripts/bootstrap-env.sh. Ver docs/ENVIRONMENTS.md.\n"
)
files = {
    "admin_app": firebase
    + f"\nVITE_CUSTOMER_APP_URL={urls['customer']}\nVITE_WAITER_APP_URL={urls['waiter']}"
    + f"\nVITE_KDS_APP_URL={urls['kds']}\nVITE_BFF_URL={e['BFF_URL']}\n",
    "customer_web": firebase + f"\nVITE_BFF_URL={e['BFF_URL']}\nVITE_PAYMENTS_ENABLED=false\n",
    "kitchen_web": firebase + "\n",
    "waiter_web": firebase + "\n",
    "landing": f"VITE_ADMIN_URL={urls['admin']}\n",
}
for app, body in files.items():
    # dev is also what `npm run dev` uses locally (.env.development).
    for name in [f".env.{project}"] + ([".env.development"] if alias == "dev" else []):
        with open(f"apps/{app}/{name}", "w") as f:
            f.write(header + body)
        print(f"  ✓ apps/{app}/{name}")

rc = json.load(open(".firebaserc"))
rc.setdefault("projects", {})[alias] = project
rc.setdefault("targets", {})[project] = {"hosting": {t: [site] for t, site in SITES.items()}}
with open(".firebaserc", "w") as f:
    f.write(json.dumps(rc, indent=2) + "\n")
print(f"  ✓ .firebaserc ({alias} → {project})")

bff = f"""# BFF (Cloud Run) — {alias.upper()}. Solo valores no secretos: este archivo se versiona.
# Secretos en deploy/env/{alias}.secrets.env (gitignored). Generado por scripts/bootstrap-env.sh.

# Dónde se despliega (no se pasan al contenedor)
GCP_PROJECT={project}
REGION={e['REGION']}
SERVICE={e['BFF_SERVICE']}
SERVICE_ACCOUNT={e['SA']}

# Variables del contenedor (app/config.py)
FIREBASE_PROJECT_ID={project}
FIREBASE_RTDB_URL={e['RTDB_URL']}
CUSTOMER_APP_URL={urls['customer']}
ADMIN_APP_URL={urls['admin']}
ADMIN_PREVIEW_ORIGIN_REGEX=https://{SITES['admin']}--[a-z0-9-]+\\.web\\.app
BFF_BASE_URL={e['BFF_URL']}
PAGUELOFACIL_ENV=sandbox
"""
with open(f"deploy/env/{alias}.env", "w") as f:
    f.write(bff)
print(f"  ✓ deploy/env/{alias}.env")

print("\nURLs de este ambiente:")
for k, v in urls.items():
    print(f"  {k:9s} {v}")
print(f"  bff       {e['BFF_URL']}")

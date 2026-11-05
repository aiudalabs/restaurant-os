# RestaurantOS

Sistema de gestión de pedidos para restaurantes y cadenas. SaaS multi-tenant.

> **Lectura obligatoria antes de tocar código:** [`AGENTS.md`](./AGENTS.md) (reglas del monorepo; `CLAUDE.md` lo importa) y [`FIREBASE_SCHEMA.md`](./FIREBASE_SCHEMA.md) (fuente de verdad del esquema).

---

## Apps

Todo el producto es web (no hay apps nativas; Flutter se archivó en el tag `archive/flutter-2026-11`).

| App | Stack | Quién la usa |
|---|---|---|
| `apps/admin_app` | React + TypeScript + Vite | Dueños y managers |
| `apps/customer_web` | React + TypeScript + Vite | Clientes (pedido por QR/link) |
| `apps/waiter_web` | React + TypeScript + Vite | Meseros y caja |
| `apps/kitchen_web` | React + TypeScript + Vite | Cocina / bar (KDS) |
| `apps/landing` | React + Vite | Marketing y alta de organizaciones |
| `functions/` | TypeScript (Cloud Functions) | Motor operacional |
| `apps/fastapi_bff` | Python + FastAPI | Integraciones (fiscal, pagos, IA, Zaveli) |

Estado real, comandos y reglas: [`AGENTS.md`](./AGENTS.md). Ambientes dev/prod: `docs/ENVIRONMENTS.md`.

---

## Firebase

- **Project ID:** `restaurant-os-68c79`
- **RTDB:** `https://restaurant-os-68c79-default-rtdb.firebaseio.com`
- **Hosting (admin_app):** https://restaurant-os-68c79.web.app
- **Consola:** https://console.firebase.google.com/project/restaurant-os-68c79/overview

---

## Cómo compilar y correr

### Calidad

```bash
make check    # functions + BFF (rápido)
make verify   # check + build de las 4 webs contra dev
make e2e      # reglas y pagos contra emuladores (JDK 21+)
```

Las webs se construyen con `--mode <projectId>`; un build sin modo falla a propósito.

### Admin app (React)

```bash
cd apps/admin_app
npm install                 # solo la primera vez
npm run dev                 # dev server → http://localhost:5173
npm run build               # build producción (dist/)
```

### Deploy admin app

```bash
firebase deploy --only hosting
```

---

## Usuarios demo

| Email | Rol | Station |
|---|---|---|
| `admin@demo.restaurantos.local` | admin | — |
| `operator@demo.restaurantos.local` | operator | demo |
| `bar@restauranteos.com` | operator | bar |
| `bar2@restauranteos.com` | operator | bar |

> Las contraseñas no se guardan en ningún sitio (las genera `createOperatorUser` y solo se retornan una vez). Si olvidas una, resetéala con el tool (ver abajo).

---

## Tools (admin scripts)

Python scripts en `tools/`. Usan el token de `gcloud auth print-access-token` — no hace falta service account.

**Requisitos:** estar autenticado con `gcloud auth login` como owner/editor del proyecto.

| Script | Qué hace |
|---|---|
| `tools/debug_kds_routing.py` | Dump de stations/categories/products/order_items + diagnóstico |
| `tools/reset_db_state.py` | Borra todos los orders + order_items, libera mesas. `--yes` para aplicar |
| `tools/reset_user_password.py` | Resetea password en Firebase Auth. Args: `--email` y/o `--role`, `--password`, `--dry-run` |

Ejemplos:

```bash
# Ver estado actual de la BD sin modificar nada
python3 tools/reset_db_state.py

# Resetear estado de la BD (borra orders, libera mesas)
python3 tools/reset_db_state.py --yes

# Resetear contraseña de un usuario
python3 tools/reset_user_password.py --email admin@demo.restaurantos.local --password <nueva>

# Resetear contraseñas de todos los operadores
python3 tools/reset_user_password.py --role operator --password <nueva>
```

---

## Estructura del monorepo

```
restaurant_os/
├── AGENTS.md                 ← reglas del monorepo (leer primero)
├── CLAUDE.md                 ← importa AGENTS.md
├── FIREBASE_SCHEMA.md        ← esquema de Firestore/RTDB
├── firebase.json             ← rules + indexes + hosting + functions
├── firestore.rules
├── firestore.indexes.json
├── database.rules.json
├── functions/                ← Cloud Functions (TypeScript)
├── apps/
│   ├── admin_app/            ← React — dashboard
│   ├── customer_web/         ← React — cliente
│   ├── waiter_web/           ← React — mesero/caja
│   ├── kitchen_web/          ← React — KDS
│   ├── landing/              ← React — marketing
│   └── fastapi_bff/          ← Python — integraciones
├── docs/                     ← documentación (docs/archive = histórico)
├── scripts/                  ← deploy y utilidades
└── tools/                    ← scripts Python admin (gcloud token)
```

---

## Convenciones

Ver `AGENTS.md` para reglas completas. Resumen:

- Commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `docs:`, `test(scope):`. Scopes: `waiter`, `kitchen`, `admin`, `customer`, `landing`, `firebase`, `bff`, `docs`, `ci`.
- Rama por issue: `feat/issue-{n}-{slug}`.
- Nunca commitear directo a `main`, nunca subir credenciales.
- React: sin `any`, `useQuery` para lecturas, `react-hook-form` + `zod` para formularios.

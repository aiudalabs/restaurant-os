# RestaurantOS

Sistema de gestión de pedidos para restaurantes y cadenas. SaaS multi-tenant.

> **Lectura obligatoria antes de tocar código:** [`CLAUDE.md`](./CLAUDE.md) (reglas del monorepo) y [`FIREBASE_SCHEMA.md`](./FIREBASE_SCHEMA.md) (fuente de verdad del esquema).

---

## Apps

| App | Stack | Plataforma | Quién la usa |
|---|---|---|---|
| `apps/client_app` | Flutter | iOS + Android | Clientes del restaurante |
| `apps/kitchen_app` | Flutter | Android tablet | Cocina / bar / estaciones |
| `apps/admin_app` | React + TypeScript + Vite | Web | Dueños y managers |
| `packages/core` | Dart | Compartido | Usado por client_app y kitchen_app |

---

## Firebase

- **Project ID:** `restaurant-os-68c79`
- **RTDB:** `https://restaurant-os-68c79-default-rtdb.firebaseio.com`
- **Hosting (admin_app):** https://restaurant-os-68c79.web.app
- **Consola:** https://console.firebase.google.com/project/restaurant-os-68c79/overview

---

## Cómo compilar y correr

### Flutter apps (client / kitchen)

```bash
# APK release Android
cd apps/client_app && flutter build apk --release
cd apps/kitchen_app && flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Admin app (React)

```bash
cd apps/admin_app
npm install                 # solo la primera vez
npm run dev                 # dev server → http://localhost:5173
npm run build               # build producción (dist/)
```

> Nota: el script `build` actualmente es `vite build` sin `tsc -b` porque hay errores de tipos pendientes tras upgrade de Recharts/Zod/react-hook-form. El runtime funciona; los tipos quedan por arreglar.

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
├── CLAUDE.md                 ← reglas del monorepo (leer primero)
├── FIREBASE_SCHEMA.md        ← esquema de Firestore/RTDB
├── AGENTS.md                 ← coordinación entre agentes
├── ORCHESTRATOR.md           ← orquestador multi-agente
├── firebase.json             ← rules + indexes + hosting + functions
├── firestore.rules
├── firestore.indexes.json
├── database.rules.json
├── functions/                ← Cloud Functions (TypeScript)
├── packages/core/            ← Dart package compartido
├── apps/
│   ├── client_app/           ← Flutter — cliente
│   ├── kitchen_app/          ← Flutter — KDS
│   └── admin_app/            ← React — dashboard
└── tools/                    ← scripts Python admin (gcloud token)
```

---

## Convenciones

Ver `CLAUDE.md` para reglas completas. Resumen:

- Commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `docs:`, `test(scope):`. Scopes: `client`, `kitchen`, `admin`, `core`, `firebase`, `docs`.
- Rama por issue: `feat/issue-{n}-{slug}`.
- Nunca commitear directo a `main`, nunca subir credenciales.
- Dart: Freezed para todos los modelos, `final` sobre `var`, sin `dynamic`.
- React: sin `any`, `useQuery` para lecturas, `react-hook-form` + `zod` para formularios.

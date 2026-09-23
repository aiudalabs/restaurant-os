# AGENTS.md — RestaurantOS

Guía operativa para agentes de código (Claude Code, Codex, Cursor, OpenCode…).
Describe **el estado real del repo** y cómo trabajar en él sin romper nada.

- Reglas de estilo y prohibiciones completas: **`CLAUDE.md`** (manda sobre este archivo si hay conflicto).
- Esquema de datos: **`FIREBASE_SCHEMA.md`**. Flujo Odoo ↔ Firebase ↔ BFF: **`docs/INTEGRATION_ARCHITECTURE.md`**.
- Historial de decisiones (por qué las cosas son como son): `~/.devtrace/decisions/restaurant_os.md`.

> Este archivo reemplaza la guía original de "5 agentes paralelos" (marzo 2026). Esa versión,
> `ORCHESTRATOR.md` y `setup_agents.sh` describen un plan de arranque ya ejecutado: son
> **históricos**, no los uses como instrucciones.

---

## 1. Qué es

SaaS multi-tenant de pedidos para restaurantes (mercado: Panamá / LATAM). El cliente escanea un QR,
pide desde el navegador, la orden se rutea por estación al KDS de cocina/bar y el dueño administra
todo desde un panel web. Self-onboarding desde una landing con planes.

**Motores:**
- **Firebase** (`restaurant-os-68c79`) — Firestore (fuente de verdad operacional), RTDB (tickets
  en vivo del KDS), Auth, Cloud Functions, Hosting.
- **FastAPI BFF** — auth de staff contra Odoo, pagos (PagueloFácil), asistente IA (Gemini).
- **Odoo 17** — ERP/contabilidad. **Diferido y opcional** (decisión 2026-07-12): no está en el
  camino crítico para vender ni facturar; el BFF lo trata como no-bloqueante y por-org.

---

## 2. Mapa de apps — qué está vivo

| Ruta | Stack | Estado | Deploy |
|---|---|---|---|
| `apps/admin_app` | React 19 + TS + Vite + Tailwind 4 + TanStack Router/Query | **Activa** — panel dueños/managers | Hosting `admin` → restaurant-os-68c79.web.app |
| `apps/customer_web` | React 18 + TS + Vite + Tailwind 3 + react-router-dom | **Activa** — pedido por QR con número de retiro; reemplaza a `client_app` | Hosting `customer` → restaurant-os-pedir.web.app |
| `apps/kitchen_web` | React 18 + TS + Vite + Tailwind 3 | **Activa** — KDS web, login por PIN de estación | Hosting `kds` → restaurant-os-cocina.web.app |
| `apps/waiter_web` | React 18 + TS + Vite + Tailwind 3 | **Activa** — mesero sin mesas: pedido por nombre del cliente → KDS; cobro manual (efectivo/tarjeta/Yappy). Rol `waiter` | Hosting `waiter` → restaurant-os-mesero.web.app |
| `apps/landing` | React 18 + Vite + Tailwind 3 | **Activa** — marketing + pricing + checkout simulado → signup en admin | Hosting `landing` → restaurant-os-inicio.web.app |
| `apps/fastapi_bff` | Python 3.12 + FastAPI | **Activa** — dominios `auth`, `catalog`, `payments`, `ai`, `webhooks` | Cloud Run `restaurantos-bff` (URL en `apps/admin_app/src/lib/config.ts`) |
| `functions/` | TypeScript, firebase-functions v5 | **Activa** — ver §5 | `firebase deploy --only functions` |
| `packages/core` | Dart (Freezed, Riverpod) | Mantenimiento — lo usan las apps Flutter | — |
| `apps/client_app` | Flutter | Legacy — sustituida por `customer_web` en el demo | APK manual |
| `apps/kitchen_app` | Flutter | Secundaria — `kitchen_web` es el KDS principal | APK manual |
| `apps/waiter_app` | Flutter | Congelada — `waiter_web` la reemplaza | APK manual |

No son código: `apps/admin`, `apps/client`, `apps/kitchen` (solo `SPEC.md` originales),
`apps/waiter_demo` (prototipo HTML), `design/`, `desings/`, `diagrams/` (mockups).
Otros: `deploy/` (Docker Compose Odoo+Postgres+BFF+Caddy en VM GCP, **no ejecutado**),
`odoo_demo/` (Odoo local para pruebas), `tools/` (scripts admin, §7).

⚠️ Las versiones que pinnea `CLAUDE.md` para React (18 / firebase 10 / Tailwind 3) ya **no coinciden**
con `admin_app` (React 19 / firebase 12 / Tailwind 4 / zod 4). La verdad es el `package.json` de
cada app. No hagas upgrades ni downgrades para "alinear" sin preguntar.

---

## 3. Comandos

Las apps web **no** son un workspace npm: cada una tiene su propio `package.json` y `node_modules`.

```bash
# Web apps (admin_app | customer_web | kitchen_web | waiter_web | landing)
cd apps/<app> && npm install
npm run dev        # puertos: admin 5173, customer 5175, kds 5176, landing 5177, waiter 5178
npm run build      # vite build → dist/
npm run lint       # solo admin_app tiene eslint

# Cloud Functions
cd functions && npm install && npm run build      # tsc → lib/ (gitignored)
npm run serve                                     # emulador de functions

# BFF (usar python3.12 — el python3 del sistema es 3.14 y PEP 668)
cd apps/fastapi_bff
cp .env.example .env                              # rellenar; nunca commitear
python3.12 -m uvicorn app.main:app --reload --port 8000
python3.12 -m pytest tests -v                     # OJO: tests de integración, ver §6

# Flutter (melos, desde la raíz) — Flutter NO está instalado en esta máquina
melos bootstrap
melos run build     # build_runner (Freezed/json_serializable)
melos run analyze
melos run test      # o `melos run test:core`
```

**Deploy** (desde la raíz; cada target de hosting corre su `npm run build` como predeploy):
```bash
firebase deploy --only hosting:admin      # también: hosting:customer, hosting:kds, hosting:waiter, hosting:landing
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes,database
```
El BFF no tiene script de deploy versionado en el repo. No inventes el comando de Cloud Run:
pregunta o léelo de `gcloud run services describe restaurantos-bff`.

Deploy = acción visible para clientes reales. **Confirma con el usuario antes de desplegar.**

---

## 4. Modelo de datos y multi-tenancy (lo que más se rompe)

- Colecciones **planas** en la raíz de Firestore, todas con `orgId` (y `branchId` cuando aplica).
  Jerarquía: Organization → Branch (`menuId`) → Tables / Stations (`categoryIds[]`);
  Menu → Categories → Products. Detalle: `FIREBASE_SCHEMA.md`, `docs/ARCHITECTURE.md`.
- **No crees colecciones fuera de `FIREBASE_SCHEMA.md`.** No toques `firestore.rules`,
  `FIREBASE_SCHEMA.md` ni `packages/core/lib/utils/firestore_paths.dart` sin consenso explícito.
- **Aislamiento por org** en `firestore.rules`: el staff se resuelve por `users/{uid}` (`orgId`, `role`).
  Roles: `admin`, `manager`, `operator` (KDS, con `stationId`), `waiter` (solo `waiter_web`). Toda query de lista desde el admin **debe filtrar por
  `orgId`** o las reglas la rechazan (bug real ya visto: commit 2b9f05d).
- **Cliente final = auth anónima**, sin doc en `users`. Solo puede leer su orden (`createdByUid`);
  la recuperación por código va por la callable `recoverOrder`. El anónimo **no puede leer
  `stations`**, por eso el routing a estación ocurre server-side en `onOrderCreated`.
- **Routing KDS:** `onOrderCreated` asigna `stationId` por `categoryId` y espeja el ítem en RTDB
  `/order_items/{stationId}/{orderId}_{itemId}`. El KDS escucha solo su nodo. El avance de estado
  escribe RTDB (velocidad) + Firestore (verdad); `onOrderItemUpdated` hace el roll-up de la orden.
  Si una categoría queda en dos estaciones o en ninguna, los tickets se pierden — diagnostica con
  `tools/debug_kds_routing.py`.
- Órdenes `source: 'qr'` con prepago activo nacen `pending_payment` y **no** van al KDS hasta que
  el BFF confirma el pago.
- Crear usuarios de staff **solo** vía callables (`createOperatorUser`, `provisionBranch`,
  `createOrganization`) — nunca crear usuarios de Auth desde el cliente.

---

## 5. Backend: Functions y BFF

**Cloud Functions** (`functions/src/index.ts`): `onOrderCreated`, `onOrderItemUpdated`, `recoverOrder`,
`createOperatorUser`, `deleteUser`, `createOrganization` (acepta `plan` starter|growth|chain),
`provisionBranch` (crea estaciones + operadores), `deleteBranch`, `setStationPin`, `kdsLogin`
(PIN con pbkdf2 + lockout), `yappyWebhook` (futuro), `getOrderReports`.

**BFF** — reglas en `CLAUDE.md` §Python. Además:
- Un dominio = carpeta con `router.py` / `service.py` / `models.py`. Contratos siempre Pydantic.
- JSON-RPC a Odoo **solo** en `app/core/odoo.py`. Odoo es por-org (credenciales en
  `organizations/{orgId}`), con fallback single-tenant a `.env`. El sync a Odoo tras un pago
  nunca bloquea al cliente. `CLAUDE.md` pide encolar fallos en `sync_queue`, pero **hoy no existe**:
  `_sync_to_odoo` (`payments/service.py`) solo loguea y sigue — un fallo de Odoo se pierde.
- El `orgId` se deriva del **token verificado** o de la orden, nunca del body de la petición.
- **Asistente IA** (`app/ai/`, `POST /ai/plan` + `POST /ai/apply`, doc `docs/AI_ASSISTANT.md`):
  el modelo **nunca escribe en la DB** — solo produce un `BuildPlan`; el BFF lo ejecuta
  determinísticamente tras confirmación humana, con `orgId` inyectado. Solo herramientas de creación.
  Gemini vía Vertex AI + ADC (sin API key); los modelos Gemini 3 solo responden en
  `location="global"`.
- **Pagos** (`docs/PAYMENTS.md`): PagueloFácil (link hospedado, sin tocar datos de tarjeta).
  Stripe **no opera en Panamá**. El callback de PagueloFácil **no viene firmado** → mantener la
  idempotencia y el hook de verificación S2S (`_verify_with_paguelofacil`; la URL REST es un TODO,
  no la inventes). En `customer_web` el prepago está apagado salvo `VITE_PAYMENTS_ENABLED` + `VITE_BFF_URL`.

---

## 6. Verificación antes de dar algo por terminado

No hay CI. Verifica a mano lo que tocaste:

| Tocaste | Mínimo |
|---|---|
| Una web app | `npm run build` sin errores (+ `npm run lint` en admin) |
| `admin_app` tipos | El build es `vite build` **sin** `tsc` a propósito (errores de tipos pendientes tras upgrades). No reintroduzcas `tsc -b` en el build hasta arreglarlos. `npx tsc -b` sirve para no empeorar |
| `functions/` | `npm run build` (tsc) |
| BFF | Importa sin error (`python3.12 -c "import app.main"`) y prueba el endpoint. `tests/test_auth.py` y `test_catalog_sync.py` necesitan Odoo corriendo + credenciales Firebase; si no están, dilo en vez de reportar "tests OK" |
| Reglas / routing | Probar el flujo anónimo real: QR → menú → orden → aparece en KDS |
| Flutter | `melos run analyze` / `test` — requiere Flutter, que no está instalado aquí; reporta que no se verificó |

La DB de producción se **borró por completo el 2026-07-12** para arrancar a vender: no existen los
datos ni los usuarios demo que aparecen en `README.md`/memorias antiguas. Las pruebas que escriban
en la DB deben limpiar lo que crean.

---

### Emuladores (prueba local sin tocar producción)
`firebase.json` tiene bloque `emulators` (auth 9099, firestore 8080, database 9000, functions 5001, UI 4000).
Sin el emulador de **auth** corriendo, las Functions emuladas crean usuarios en el Auth **real** — verifica
que aparezca "Authentication" en la tabla de arranque. Usa Node 20 (`/opt/homebrew/opt/node@20/bin`).
⚠️ Bug de `firebase-tools` (14.12 y 15.30): el emulador envuelve `admin.firestore` con `.bind()` y se
pierde `admin.firestore.Timestamp` → las Functions fallan **solo en el emulador** con
"Cannot read properties of undefined (reading 'now')". En producción funcionan. Para probar, usar una copia
local de firebase-tools con `Proxied.getOriginal` parcheado (`Object.assign(value.bind(target), value)`).
`waiter_web` se conecta a los emuladores con `VITE_USE_EMULATORS=true npm run dev`.

---

## 7. Scripts admin (`tools/`)

Python con token de `gcloud auth print-access-token` (no service account). Todos hacen **dry-run
por defecto**; `--yes` aplica. Son destructivos sobre datos reales — confirma antes de usar `--yes`.

`debug_kds_routing.py` (diagnóstico, solo lectura) · `reset_db_state.py` (borra órdenes, libera mesas) ·
`reset_user_password.py` · `seed_pizzas_beers.py` / `seed_pereda_liberty.py` (seeds) ·
`bump_prices.py` · `export_daily_report.py` (xlsx; requiere `openpyxl` en `.venv/` de la raíz).
Llamadas a Identity Toolkit necesitan el header `x-goog-user-project: restaurant-os-68c79`.

---

## 8. Git y GitHub

- Repo: `aiudalabs/restaurant-os`. Flujo por issue, ramas `feat/issue-{n}-{slug}` y formato de
  commit `tipo(scope): …` + `Closes #N` — detalle en `CLAUDE.md`. Nunca commitear a `main`.
- Scopes de `CLAUDE.md`: `client`, `waiter`, `kitchen`, `admin`, `core`, `firebase`, `bff`, `docs`.
  El historial también usa `customer`, `kds`, `landing` para las apps web nuevas.
- **⚠️ `main` no tiene el código actual.** Está ~32 commits detrás de `feat/landing-pricing`.
  Las PRs #35–#40 (customer web, pagos, M3, multi-tenancy P0–P3) se **cerraron sin mergear**; todo
  ese trabajo vive apilado en las ramas `feat/*`, con `feat/landing-pricing` como la más reciente.
  No ramifiques desde `main` ni asumas que "Closes #N" cerró un issue sin confirmar con el usuario.
- Issues abiertos del plan original (#25–#30) son épicas de sprint antiguas; el mapa vigente de
  prioridades está en `docs/ROADMAP.md` + decisiones recientes, no en esos issues.

---

## 9. Seguridad y secretos

- Existen localmente y están en `.gitignore`: `apps/fastapi_bff/.env`, `apps/fastapi_bff/serviceAccountKey.json`,
  `apps/*/.env.local`. **No los leas en voz alta, no los copies, no los saques del ignore.**
- **Riesgo abierto:** `apps/waiter_app/android/app/google-services.json` y
  `apps/waiter_app/ios/Runner/GoogleService-Info.plist` están sin trackear pero **no** ignorados.
  Nunca uses `git add -A` / `git add .`; agrega archivos por nombre.
- La API key web de Firebase inline en `customer_web/src/lib/firebase.ts` es pública por diseño.
- Nunca fabriques IDs, URLs, claves o endpoints (Cloud Run, PagueloFácil, Odoo…). Si no está en el
  repo o no lo puedes consultar, pregunta o márcalo `TODO: replace with real value`.
- Bug conocido: `waiter_app` usa el bundle ID de `client_app` (`com.aiudalabs.restaurantos.client`).
  No lo cambies sin coordinar — afecta firma y config de Firebase.

---

## 10. Subagentes de Claude Code

Definidos en `.claude/agents/`: `core-agent` (packages/core), `admin-agent` (admin_app),
`firebase-agent` (functions + rules). Úsalos solo dentro de su carpeta. No hay agentes dedicados
para `customer_web`, `kitchen_web`, `landing` ni el BFF.

# AGENTS.md — RestaurantOS

Guía única para agentes de código (Claude Code, Codex, Cursor, OpenCode…). Es el estándar del repo:
`CLAUDE.md` solo la importa. Describe **el estado real** y las reglas obligatorias.

- Esquema de datos: `FIREBASE_SCHEMA.md`. Ambientes y respaldos: `docs/ENVIRONMENTS.md`.
- Diagnóstico y hoja de ruta vigentes: `docs/PLATFORM_DIAGNOSIS_2026-11.md`.
- Flujo de agentes, pruebas y puerta de merge: `docs/DEV_WORKFLOW.md`.
- Por qué las cosas son como son: `~/.devtrace/decisions/restaurant_os.md`.
- `ORCHESTRATOR.md` y `setup_agents.sh` (marzo 2026) son **históricos**; no los uses.

---

## 0. Estado actual (2026-11-05)

- **Producto:** SaaS multi-tenant de pedidos para restaurantes (Panamá primero, luego LATAM). El cliente pide por QR o link, el pedido se rutea por estación al KDS, el mesero cobra, el sistema factura (Digifact) y el dueño administra desde un panel web.
- **Único cliente en producción: Pick & Eat** (org `yN4NWwXOCjmh0ydwwRIu`). Sus pedidos reales viven en prod: **no se pierden datos**. Hay respaldos (PITR, diarios, semanales) y restauración probada: `docs/ENVIRONMENTS.md` §8.
- **`main`** contiene desde el 2026-11-05 la cadena de PRs #69→#82 (pago en servidor, reglas con validación de campos, Digifact, Club de fidelidad, Google Wallet sin credenciales, escaneo de socio, descuentos) y #66. **Dev ya corre ese código; prod sigue en la versión del 2026-10-14** hasta que el responsable pida desplegar.
- **Antes de desplegar eso a prod**: export manual de Firestore, CORS de Storage (`storage.cors.json`), `BFF_URL` de prod en `functions/.env.restaurant-os-68c79`, secretos del BFF (`INTERNAL_TOKEN`), y credenciales Digifact productivas si se factura.
- **Principio permanente: multi-tenant y todo configurable.** Nada que cambie de un restaurante a otro (marca, colores, logo, programa de fidelidad, métodos de pago, impuestos, moneda, módulos) va en el código. Es configuración por organización o sucursal. Pick & Eat es un cliente más, no el valor por defecto. Diseño: `docs/BRANDING_DESIGN.md`.
- **Decisiones del responsable (2026-11-05):** Panamá primero; **Odoo se abandona**; Flutter y `waiter_demo` se archivan/borran; objetivo = producto vendible a cualquier restaurante.
- **Fase actual:** Fase 1 de la hoja de ruta (limpiar: Odoo ya retirado del BFF; Flutter, CI, documentación). Ver el diagnóstico.

---

## 1. Ambientes — siempre dev primero (OBLIGATORIO)

`dev` = `restaurant-os-dev-49096` (pruebas). `prod` = `restaurant-os-68c79` (restaurantes reales). Guía: `docs/ENVIRONMENTS.md`.

1. Todo se despliega y prueba en dev: `scripts/deploy.sh dev <qué>` desde cualquier rama. `npm run dev` local apunta a dev.
2. Nada va a prod hasta que esté mergeado en `main` por PR, probado de punta a punta en dev, **y el usuario lo pida explícitamente**. Entonces, desde `main` limpio: `scripts/deploy.sh prod <qué>` (nombra lo que cambió; no `all` por costumbre).
3. Scripts de `tools/` y escrituras directas a Firestore/RTDB van contra dev (`ROS_PROJECT=restaurant-os-dev-49096`). Datos de prod solo si el usuario lo pide para ese caso.
4. Antes de cualquier deploy o migración a prod: export manual (comando en `ENVIRONMENTS.md` §8).
5. Comandos `gcloud` de prod: `--account=admin@aiudalabs.com` (la cuenta por defecto no tiene acceso).
6. Al terminar una tarea, reporta qué quedó **desplegado en dev** y qué falta para prod. Avisa al usuario cuando haya algo listo para probar en dev. No despliegues a prod por iniciativa propia.

Un `npm run build` sin `--mode <projectId>` falla a propósito (guard en `scripts/vite-env-guard.ts`).

---

## 2. Mapa de apps

| Ruta | Stack | Estado |
|---|---|---|
| `apps/admin_app` | React 19, Vite 8, TS, Tailwind 4, TanStack Router/Query, Firebase 12 | **Activa.** Panel dueños/gerentes. Hosting `admin`. Única con lint. |
| `apps/customer_web` | React 18, Vite 5, Tailwind 3, Firebase 10 | **Activa.** Pedido por QR/link con número de retiro, pago (Yappy manual, al retirar, tarjeta sandbox), seguimiento, Club. Hosting `customer` (`*-pedir`). |
| `apps/waiter_web` | React 18, Vite 5, Tailwind 3 | **Activa.** Mesero/caja: pedido, cobro, descuentos, factura, cupones, escaneo de socio. Login con `?branch=` + PIN personal. Hosting `waiter` (`*-mesero`). |
| `apps/kitchen_web` | React 18, Vite 5, Tailwind 3 | **Activa.** KDS: PIN de estación (`?station=`), fila FIFO. Hosting `kds` (`*-cocina`). |
| `apps/landing` | React 18, Vite 5 | **Activa.** Marketing y planes; checkout simulado → signup en admin. Hosting `landing` (`*-inicio`). |
| `functions/` | TS, firebase-functions v5, Node 22, us-central1 | **Activa.** Motor operacional (§5). |
| `apps/fastapi_bff` | Python 3.12, FastAPI, Cloud Run `restaurantos-bff` | **Activa**, pero se queda solo con integraciones: fiscal (Digifact), pagos (PagueloFácil), IA, Zaveli. |
| `packages/core`, `apps/client_app`, `apps/waiter_app`, `apps/kitchen_app` | Flutter/Dart | **Abandonadas.** Congeladas: no las modifiques ni arregles. Se archivan en Fase 1 (tag `archive/flutter-2026-11`). |
| `apps/waiter_demo` | HTML | **Muerto e inseguro** (credenciales en claro). Se borra en Fase 1. |
| `apps/admin`, `apps/client`, `apps/kitchen` | solo `SPEC.md` | Obsoletos; no son código vivo. |

Las apps web **no** son un workspace npm: cada una tiene su `package.json`. Las versiones de React, Vite, Tailwind y Firebase **difieren** entre `admin_app` y las demás: la verdad es el `package.json` de cada app. No hagas upgrades para "alinear" sin preguntar (la consolidación está planeada en la Fase 2).

---

## 3. Comandos

```bash
make check      # bucle rápido: tests de functions + BFF (sin emuladores)
make verify     # check + build de las 4 webs contra dev (antes de pedir revisión)
make e2e        # reglas, pagos y triggers contra emuladores (requiere JDK 21+)

cd apps/<app> && npm install && npm run dev      # puertos: admin 5173, customer 5175, kds 5176, landing 5177, waiter 5178
cd functions && npm run build                    # tsc; npm run test:unit
cd apps/fastapi_bff && python3.12 -m pytest -q   # usa python3.12, no el python3 del sistema
```

**Deploy:** `scripts/deploy.sh <dev|prod> [web|functions|rules|bff|"hosting:waiter,functions:x"]`. Prod exige `main` limpio igual a origin y escribir «prod». `DRY_RUN=1` muestra el comando. Los scripts fijan `firebase-tools@15.30.2`. Al desplegar índices, si la CLI ofrece **borrar** índices que no están en `firestore.indexes.json`, responde **No**.

Deploy = acción visible para clientes reales. **Confirma con el usuario antes de desplegar a prod.**

---

## 4. Modelo de datos y multi-tenancy (lo que más se rompe)

- Colecciones **planas** en la raíz de Firestore, todas con `orgId` (y `branchId` si aplica). Detalle: `FIREBASE_SCHEMA.md`.
- **No crees colecciones fuera de `FIREBASE_SCHEMA.md`.** No toques `firestore.rules`, `FIREBASE_SCHEMA.md` ni este archivo sin consenso explícito del usuario.
- **Aislamiento por org** en `firestore.rules`: el staff se resuelve por `users/{uid}` (`orgId`, `role`). Roles: `admin`, `manager`, `operator` (KDS), `waiter`. Toda query de lista desde el admin **debe filtrar por `orgId`**.
- **Cliente final = auth anónima**, sin doc en `users`. Solo lee su pedido (`createdByUid`). Recuperación por código con la callable `recoverOrder`.
- **Dinero y estado de pago lo decide el servidor.** Los clientes no escriben `payment.*` ni `fiscal`. Totales los calcula `onOrderCreated` desde `products` (`functions/src/orders/totals.ts`). Todo camino de pago converge en `markOrderPaid` (`recordPayment`, `confirmManualPayment`, callback de tarjeta) y el trigger `onOrderPaid` libera a cocina, suma puntos y pide la factura.
- **Routing KDS:** `onOrderCreated` asigna `stationId` por categoría y espeja a RTDB `/order_items/{stationId}/{orderId}_{itemId}`. Pedidos `pending_payment` no se espejan hasta pagarse. Diagnóstico: `tools/debug_kds_routing.py`.
- **Custom claims** `{orgId, role, stationId}`: los pone `setStaffClaims` y los re-emite `syncStaffClaims`. RTDB y Storage dependen de ellos. Crear staff **solo** vía callables (`createOperatorUser`, `provisionBranch`, `createOrganization`).
- **PINs** (`functions/src/kds/pin-lock.ts`: pbkdf2, 6 dígitos, bloqueo creciente): estación en `kds_pins`, mesero en `staff_pins`. Colecciones server-only. En transacciones **no lances errores dentro de `runTransaction`**: se revierten las escrituras.
- **`organizations/{orgId}/private/*`** (credenciales Digifact) es solo servidor.
- **Storage:** fotos en `orgs/{orgId}/products/` (escritura admin/manager); facturas en `orgs/{orgId}/invoices/` (lectura pública por CUFE).
- **Estaciones y categorías:** nada impide asignar una categoría a dos estaciones; `onOrderCreated` usa la última. El Asistente IA crea estaciones pero no les asigna categorías.

---

## 5. Backend: Functions y BFF

**Cloud Functions** (`functions/src/index.ts`): triggers `onOrderCreated`, `onOrderItemUpdated`, `onOrderPaid`, `syncStaffClaims`; HTTPS `yappyWebhook`, `customerManifest`; callables de organizaciones, personal, PINs, pagos (`recordPayment`, `confirmManualPayment`, `applyDiscount`), Club (`redeemReward`, `useVoucher`, `attachMember`, `googleWalletLink`), fiscal (`setFiscalCredentials`, `getFiscalStatus`) y `getOrderReports`. Lista completa con su detalle: `docs/PLATFORM_DIAGNOSIS_2026-11.md` apéndice A. `getOrderReports` devuelve exactamente `OrderReportData` de `apps/admin_app/src/services/report.service.ts`; si cambias uno, cambia el otro.

**BFF** (`apps/fastapi_bff`):
- Un dominio = carpeta con `router.py` / `service.py` / `models.py`. Contratos siempre Pydantic; nada de `dict` suelto cruzando un router.
- El `orgId` sale del **token verificado** o de la orden, nunca del body.
- Facturación: `onOrderPaid` llama `POST /fiscal/orders/{id}/invoice` con `X-Internal-Token`. El número fiscal (`branches.fiscal.nextNumber`) se asigna y persiste **antes** de llamar a Digifact; idempotente.
- CORS: orígenes fijos + `admin_preview_origin_regex`. Un dominio nuevo que llame al BFF debe estar ahí.
- Asistente IA: el modelo **nunca escribe en la DB**; produce un `BuildPlan` que el BFF ejecuta tras confirmación humana. Gemini vía Vertex AI + ADC.
- Pagos: PagueloFácil; el callback **no viene firmado**, mantén la idempotencia. Stripe no opera en Panamá.
- **Odoo:** retirado del BFF y de `deploy/` (issue #87, 2026-11-05). No agregues código que dependa de él.

---

## 6. Reglas de código

**React / TypeScript** (todas las apps web)
1. Componentes funcionales con hooks. Sin class components.
2. Props tipadas. Sin `any`.
3. Formularios con `react-hook-form` + `zod` (en admin).
4. Nunca llamar a Firestore directamente desde un componente: usa hooks/services. `useQuery` de TanStack para llamadas (excepto realtime).
5. Cada feature en su carpeta: `components/`, `hooks/`, `services/`, `types/`.
6. Sin lógica de negocio en componentes. Sin dinero ni estado de pago calculados en el navegador.

**Python / FastAPI**
1. Contratos Pydantic. Nada de `dict` suelto entre capas.
2. `catch` vacío prohibido: un fallo tragado cambia el comportamiento sin avisar; se registra con su correlación.
3. Comparación de secretos en tiempo constante (`hmac.compare_digest`).
4. Nunca commitear `.env`, `serviceAccountKey.json` ni credenciales.

**TypeScript en Functions:** tipado estricto, sin `any`, errores de callables con `HttpsError`.

**Nomenclatura**

| Elemento | TypeScript | Python |
|---|---|---|
| Archivos | `kebab-case.tsx` | `snake_case.py` |
| Clases/Componentes | `PascalCase` | `PascalCase` |
| Variables/funciones | `camelCase` | `snake_case` |
| Constantes | `CONSTANT` | `UPPER_CASE` |
| Servicios/Repos | sufijo `Service` | sufijo `Service` |

**Prohibido a cualquier agente**
- Crear colecciones de Firestore fuera de `FIREBASE_SCHEMA.md`; hardcodear rutas de Firestore (usa `firestore-paths`/`paths.ts`).
- Subir `google-services.json`, `.env` o credenciales al repo.
- Modificar los archivos de otra tarea sin autorización; instalar dependencias sin consultar (incluye Vitest/Playwright: ya consultado, ver §8).
- Fabricar IDs, URLs, claves o endpoints. Si no está en el repo o no se puede consultar, pregunta o marca `TODO: replace with real value`.
- `git add -A` / `git add .`: agrega archivos por nombre.

---

## 7. Flujo con GitHub

Repo: `aiudalabs/restaurant-os`. Tienes `gh` con permiso `repo`; úsalo para PRs e issues.

1. **Un issue por tarea.** Sin issue no hay código. Los criterios de aceptación se escriben como pruebas verificables.
2. Comenta «🚧 En progreso» en el issue. Rama desde `main`: `feat/issue-{n}-{slug}` o `fix/issue-{n}-{slug}`.
3. Commits `tipo(scope): descripción` + `Closes #N`. Tags `[ADR]` en cambios de arquitectura. Scopes válidos: `waiter`, `kitchen`, `admin`, `customer`, `landing`, `firebase`, `bff`, `docs`, `ci`. (`client`, `core` son de Flutter, congelado.)
4. **Un PR por issue, pequeño. Máximo dos PRs apilados.** (La cadena de ocho PRs de octubre fue un error: no se repite.) El PR dice qué cambia, cómo probarlo y qué queda fuera.
5. **`main` solo por PR.** Nadie hace push directo a `main`.
6. Bug encontrado trabajando: abre issue con label `app:{scope}`; arréglalo en el mismo commit si es chico, en otra rama si es grande.
7. Si necesitas algo que otra tarea no entrega: issue con label `blocker` y un stub con `// TODO(blocker): #N`.

---

## 8. Calidad: cómo se trabaja con agentes (resumen de `docs/DEV_WORKFLOW.md`)

- **Orquestador** (sesión principal) divide el trabajo, lanza **agentes independientes en worktrees** (uno por rama/tarea), los vigila, y es el único que mergea.
- Mientras trabajas: `make check`. Antes de pedir revisión, una vez: `make verify` y, si tocaste reglas, pagos o triggers, `make e2e`. No corras las suites completas en cada cambio.
- **Puerta previa al merge** (sobre el commit exacto que se fusiona): CI en verde; `make verify` en verde; `make e2e` si aplica; cada criterio de aceptación del issue cubierto por una prueba o una verificación anotada en el PR.
- **Revisión por otro agente**, obligatoria para: reglas de seguridad, pagos, credenciales, aislamiento entre organizaciones, facturación. Lo demás se mergea con lo local en verde, declarado en el PR.
- **Pruebas que no se omiten:** dinero y totales, pago y factura, aislamiento entre orgs (A **no** lee ni escribe lo de B), credenciales y PINs, descuentos y puntos.
- **Sin atajos para llegar al verde:** no cambies un criterio de aceptación para ocultar un fallo ni sustituyas una integración real por un simulador sin declararlo en el PR. No declares verificada una integración que solo probaste con un simulador.
- Pirámide objetivo: unitarias (existe en functions/BFF; **falta en webs**) → emuladores (existe) → Playwright de punta a punta (falta). Vitest y Playwright están aprobados como dependencias de desarrollo.
- Si el sistema de permisos deniega un comando, no lo reintentes por otra vía de forma encubierta: anótalo y pregunta.
- Reporta resultados con fidelidad: si una prueba falla o algo no se verificó (p. ej. Flutter no está instalado aquí), dilo.

---

## 9. Seguridad y secretos

- Locales e ignorados: `apps/fastapi_bff/.env`, `apps/fastapi_bff/serviceAccountKey.json`, `apps/*/.env.local`, `functions/.secret.local`, `deploy/env/*.secrets.env`. No los leas en voz alta ni los copies.
- Las API keys web de Firebase en `apps/*/.env.*` son públicas por diseño; su seguridad depende de las reglas (y de restricciones de key / App Check, pendiente de confirmar).
- Pendientes de seguridad (ver diagnóstico §4.4): firma del callback de tarjeta, hash de Yappy en tiempo constante y su `secretKey` en claro, `/payments/init` sin autenticación, secretos del BFF fuera de Secret Manager.
- Escrituras a la DB de prod desde scripts de `tools/`: dry-run por defecto, `--yes` aplica; son destructivas, confirma antes. `reset_db_state.py` falla en prod por la protección de borrado (intencional).

---

## 10. Subagentes

En `.claude/agents/` hay `core-agent`, `admin-agent`, `firebase-agent`. `core-agent` es de Flutter (congelado). Para el trabajo nuevo se lanzan agentes por tarea (`general-purpose`, `aiuda-stack:react-dev`, `aiuda-stack:firebase-dev`, `aiuda-stack:python-dev`, `aiuda-stack:qa-tester`) cada uno en su worktree, con el issue y los archivos permitidos en el prompt.

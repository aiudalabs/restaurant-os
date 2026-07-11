# RestaurantOS — Auditoría de Multi-tenancy y plan de cambios

**Objetivo:** que un dueño que nos paga pueda, desde su panel, dar de alta **todo**
(organización → sucursales → menús → productos → mesas/QR → staff), y que cuando un
cliente escanee el QR de una mesa vea **el menú del restaurante donde está**, aunque
ese dueño tenga 20 restaurantes.

> **Estado (2026-07-11):** ✅ **P0** (QR apunta al customer_web, configurable), ✅ **P1**
> (página **Sucursales**: crear/editar + asignar menú; branch context lista por org en
> vivo), ✅ **P4** (datos duplicados eliminados) — **implementados y desplegados**.
> Pendientes: **P2** (onboarding `createOrganization` + reglas aisladas por org) y
> **P3** (BFF multi-tenant).

---

## Diagnóstico: el modelo está bien, falta el cableado

El esquema **ya es multi-tenant** (plano, con `orgId`/`branchId` en todo):

- `menus` scopeados por `orgId`; `categories` por `menuId`; `products` por `menuId`+`categoryId`;
  `tables`/`stations` por `orgId`+`branchId`. `branch.menuId` dice qué menú usa cada sucursal.
- El **QR ya codifica** `org`+`branch`+`table` correctos (`TablesPage.buildQrUrl`).
- El **`customer_web` ya resuelve** el menú por el `branch` del QR (`loadMenu(branchId)` → `branch.menuId` → categorías/productos de ese menú).
- Crear staff **ya funciona con claims correctos**: el Cloud Function `createOperatorUser`
  crea el usuario de Auth, setea *custom claims* (`orgId`, `branchIds`, `role`) y el doc `users/{uid}`.

Entonces la resolución "escaneo QR de la sucursal N → menú de la sucursal N" **ya funcionaría**…
si el QR apuntara a la app correcta y si el dueño tuviera cómo crear sucursales y asignarles menú.

---

## Los huecos reales (verificados en el código)

| # | Hueco | Dónde | Impacto |
|---|---|---|---|
| **1** | **El QR apunta a la app vieja** (`https://aiudalabs.github.io/restaurant/qr/…`), no al `customer_web` (`restaurant-os-pedir.web.app`). | `apps/admin_app/src/features/tables/TablesPage.tsx` `buildQrUrl` | 🔴 Crítico: el QR impreso no abre la app que funciona. |
| **2** | **No hay UI para crear organización ni sucursales.** `branch.service` solo tiene `fetch`/`update`; no hay `createBranch`/`createOrganization`; el router no tiene página de Sucursales/Settings. | `services/branch.service.ts`, `router/index.tsx` | 🔴 Un dueño con 20 restaurantes no puede darlos de alta. |
| **3** | **No hay UI para asignar un menú a una sucursal** (`branch.menuId`). Los menús son por `orgId`, pero nada en el panel conecta "sucursal N usa menú M". | admin (falta pantalla) | 🔴 Sin esto, todas las sucursales comparten (o no tienen) menú. |
| **4** | **No hay onboarding de tenant nuevo** (crear org + usuario dueño-admin + 1ª sucursal + 1er menú). Hoy solo por seed manual en la BD. | falta (Cloud Function / BFF) | 🔴 No es self-serve. |
| **5** | **El BFF es single-tenant**: `org_id`/`branch_id` hardcodeados en `config.py`; el login asigna **a todos** el mismo org/branch sin importar quién sea. | `apps/fastapi_bff/app/config.py`, `auth/service.py`, `catalog/service.py` | 🟠 Auth de staff no distingue tenant; el catálogo/Odoo apunta a uno solo. |
| **6** | **Aislamiento de lectura débil (cross-tenant).** `orders`, `order_items`, `menus`, `products`, `branches`, `organizations`, `tables` tienen `allow read: if isAuthed()` → **cualquier** usuario autenticado (incluido un cliente o staff de otra org) puede leer datos de **cualquier** tenant. | `firestore.rules` | 🟠 Privacidad/seguridad de un SaaS pago. |
| **7** | **Higiene de datos**: categorías/productos duplicados bajo el mismo `menuId` (doble seed) → "dos menús, mismas categorías, unos apagados y otros no". Sin guardas contra nombres duplicados. | data + `MenuPage` | 🟡 Confusión visible hoy. |

---

## Plan de cambios (priorizado)

### P0 — Hacer que el QR funcione por-restaurante *(pequeño, desbloquea el caso central)*
- **Corregir `buildQrUrl`** para apuntar al `customer_web`:
  `https://restaurant-os-pedir.web.app/?org={orgId}&branch={branchId}&table={tableId}`,
  tomando la base de una env (`VITE_CUSTOMER_APP_URL`) y no hardcodeada.
- Re-generar el `qrData` de las mesas existentes (script) para que los QR ya impresos/nuevos apunten bien.
- *(Decisión)* dine-in vs pickup: hoy `customer_web` ignora `table` y usa número de retiro.
  Si quieres servicio a mesa, que use el `table` del QR como `tableId`/`tableNumber` real.
  → **Con solo esto, "escaneo QR de sucursal N → menú de sucursal N" ya queda funcionando.**

### P1 — Panel: gestión de sucursales y asignación de menú *(el "agregar todo desde el panel")*
- `branch.service`: agregar `createBranch(org, {name, address, timezone, taxPercent, menuId})` y listar por `orgId` (no solo por `branchIds` del usuario).
- **Nueva página "Sucursales/Settings"** en el admin: crear/editar sucursales, ver su QR base, y **elegir su menú** (`branch.menuId`) de entre los menús de la org.
- En `MenuPage`: mostrar "usado por: sucursal X, Y" y permitir crear menús claramente separados (y evitar el solapamiento visual del punto 7).
- Al crear usuario: permitir elegir **qué sucursales** (hoy hereda `branchIds` del admin actual).

### P2 — Onboarding de tenant + aislamiento
- **Cloud Function `createOrganization`** (callable, con privilegio elevado) que, para un cliente nuevo:
  crea `organizations/{orgId}`, el **usuario dueño** (role `admin`, claims org), 1ª sucursal y 1er menú vacío.
  (Crear org + admin necesita Admin SDK; no puede hacerlo un cliente normal.)
- **Reglas de Firestore por org** (con *custom claims*, que ya seteamos en `createOperatorUser`):
  - `orders`/`order_items`/`reports`/`users`/`tables`/`stations`: **lectura solo del mismo `orgId`**.
  - Cliente lee **solo su propia orden**: guardar el `uid` anónimo en la orden (`createdByUid`) y permitir
    `read` si `uid()==createdByUid` o es staff de la org. (Hoy cualquiera puede leer cualquier orden.)
  - `menus`/`categories`/`products`/`branches`: lectura pública sigue OK (el cliente anónimo necesita el menú),
    pero conviene leer por `branchId`/`menuId` puntual, no listar todo.
- Poner `orgId`/`branchIds` en el **token** (custom claims) y que las reglas lean del token (más barato que `get()` del doc, y sirve para el cliente anónimo scopeado por branch).

### P3 — BFF multi-tenant
- Que `auth/service.py` derive `orgId`/`branchId` del **empleado autenticado** (de Odoo / del user), no de `config`.
- Odoo por-org: el esquema ya prevé `organizations/{orgId}.odoo_url/db/api_key` → el BFF elige la conexión de Odoo según la org de la orden. *(Interino: un deploy de BFF por tenant, como está hoy — funciona pero no es self-serve.)*

### P4 — Limpieza de datos
- Script para **deduplicar** categorías/productos por `menuId` (dejar un set coherente) y borrar los huérfanos.
- Guarda en el panel: no permitir dos categorías con el mismo nombre en un menú.
- Seed **por tenant** parametrizado (no el seed demo global).

---

## Flujo objetivo (cuando P0–P2 estén)

```
Dueño paga → createOrganization() crea org + usuario dueño(admin) + sucursal #1 + menú #1
Dueño (admin panel):
  · crea menú(s) → categorías → productos            (ya funciona, scopeado por org)
  · crea sucursales (P1) y a cada una le asigna un menú (branch.menuId)   ← nuevo
  · crea mesas por sucursal → cada mesa emite un QR a customer_web?org&branch&table  (P0)
  · crea staff asignado a sucursales                 (ya funciona, con claims)
Cliente escanea el QR de una mesa en la sucursal N:
  customer_web lee branch N → branch.menuId → categorías/productos de ese menú  ✅
```

**Con 20 restaurantes:** son 20 `branches` bajo la misma `organization`, cada uno con su
`menuId` (pueden compartir un menú o tener el suyo). El QR de cada mesa lleva su `branch`,
así que el cliente siempre ve el menú correcto — sin nada hardcodeado.

---

## Recomendación de orden de ejecución

1. **P0** (1 archivo + script) — arregla el QR ya. *Alto impacto, bajo costo.*
2. **P1** (servicios + 1 página nueva) — gestión de sucursales + asignar menú. *Desbloquea "20 restaurantes".*
3. **P4** (limpieza de datos) — quita la confusión de menús duplicados.
4. **P2** (onboarding + reglas de aislamiento) — para vender de verdad como SaaS.
5. **P3** (BFF multi-tenant) — cuando el auth/Odoo por-tenant sea necesario.

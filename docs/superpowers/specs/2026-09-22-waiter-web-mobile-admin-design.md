# Mesero web + rol waiter + admin mobile — diseño

Fecha: 2026-09-22 · Aprobado en chat · Rama: `feat/waiter-web-mobile-admin`

## Objetivo

Un restaurante (sin mesas) debe operar desde mañana:
el mesero toma el pedido con el **nombre del cliente** → llega al KDS → cocina lo prepara →
el mesero **cobra en persona** (efectivo / tarjeta / Yappy) y lo registra. El dueño administra
desde el celular.

## Alcance

### 1. `apps/waiter_web` (nuevo)
React 18 + TS + Vite + Tailwind 3 + Firebase Web SDK (mismo patrón y deps que `kitchen_web`).
Mobile-first. Hosting target `waiter` → sitio `restaurant-os-mesero`.

- **Login** email/contraseña Firebase. Solo `users/{uid}.role == 'waiter'` (o admin/manager, útil
  para probar). Sucursal = `branchIds[0]`; selector si tiene más de una.
- **Nuevo pedido:** nombre del cliente (obligatorio) → menú de la sucursal (`branch.menuId`,
  categorías/productos activos) → carrito con cantidad y nota por ítem → Enviar.
- **Forma del pedido** (igual a `customer_web`, salvo): `source: 'waiter'`, `tableId: ''`,
  `tableNumber = customerName`, `customerName`, `createdByUid = uid del mesero`,
  `status: 'pending'`, `payment: {method: null, status: 'pending'}`. Ítems con `stationId: ''`.
  `onOrderCreated` los rutea y los manda al KDS al instante (`source === 'waiter'`).
  Impuesto: `branch.taxPercent` (fracción).
- **Pedidos activos:** `orders` con `orgId`, `branchId`, `status in [pending, confirmed,
  in_preparation, ready]`, `orderBy createdAt desc` (misma query que el admin). Muestra nombre,
  ítems, total, estado de cocina y estado de pago.
- **Acciones:**
  - No cobrado → **Cobrar** → método → `payment = {method, status:'paid', paidAt}`.
    El estado del pedido **no** cambia (lo mueve cocina; `onOrderItemUpdated` sobrescribe a `ready`).
  - Cobrado y `ready` → **Entregado** → `status: 'closed'`, `completedAt`. Sale de la lista.

### 2. Rol `waiter`
- `functions/src/users/create-operator-user.ts`: acepta `waiter`.
- Admin: `UserRole`, formulario de Usuarios (crear/editar), servicios.
- `FIREBASE_SCHEMA.md`: `AppUser.role` incluye `waiter` (aprobado por el usuario).
- Reglas de Firestore: **sin cambios** (el mesero lee menú, crea pedidos y actualiza pedidos
  de su org con las reglas actuales). El admin ya rechaza roles distintos de admin/manager.

### 3. Admin mobile
Pase responsive sin cambios funcionales: tablas → tarjetas bajo `md`, diálogos a pantalla
completa en móvil, cabeceras/botones que no desborden a 375px.

### 4. KDS
Sin cambios. `TicketCard` ya muestra `tableNumber` (= nombre del cliente) en grande.

## Fuera de alcance
Mesas, propinas, modificadores, pagos online, cancelaciones desde el mesero, reportes nuevos.

## Verificación
`npm run build` en `waiter_web`, `admin_app`, `functions`. Flujo real contra Firebase con una
org de prueba: crear mesero → pedido → aparece en KDS (RTDB) → ítems done → `ready` → cobrar →
entregar → `closed`. Limpiar datos de prueba.

# RestaurantOS — Arquitectura y Jerarquia del Sistema

**Ultima actualizacion:** 2026-11-05 (solo web; Flutter archivado)

---

## Jerarquia de datos

```
Organization (restaurante o cadena)
│
├── Branch (sucursal)
│   ├── menuId → Menu
│   ├── Tables (mesas, con zone opcional)
│   │   └── currentOrderId → Order (null = libre)
│   └── Stations (estaciones: cocina, bar, postres...)
│       └── categoryIds[] → Categories del menu que prepara
│
├── Menu (puede asignarse a multiples branches)
│   └── Categories (Entradas, Carnes, Bebidas...)
│       └── Products
│           └── ModifierGroups[] (embebidos)
│
├── Users (admin, manager, operator)
│   ├── branchIds[] → acceso a sucursales
│   └── stationId? → solo operadores
│
├── Orders → OrderItems
│   └── Cada item tiene stationId (routing a estacion)
│
└── Integrations (credenciales de pago por branch)
```

### Relaciones clave

| Entidad | Pertenece a | Se identifica por |
|---|---|---|
| Branch | Organization (orgId) | branchId |
| Menu | Organization (orgId) | menuId |
| Category | Menu (menuId) | categoryId |
| Product | Category (categoryId) + Menu (menuId) | productId |
| Table | Branch (branchId) | tableId |
| Station | Branch (branchId) | stationId |
| Order | Branch (branchId) + Table (tableId) | orderId |
| OrderItem | Order (orderId) + Station (stationId) | itemId |
| User | Organization (orgId) | userId (= Firebase Auth UID) |

### Diseño plano (no anidado)

Todas las colecciones estan al nivel raiz de Firestore con `orgId` y `branchId` como campos.
Esto permite:
- Queries cruzados entre sucursales de una misma cadena
- Security rules simples basadas en orgId
- Dashboard super-admin que puede ver todos los clientes

Ver `FIREBASE_SCHEMA.md` para detalle completo de cada documento.

---

## Como se conecta la mesa con el menu

```
Table → branchId → Branch → menuId → Menu → Categories → Products
```

La mesa **no tiene menuId directo**. Hereda el menu del branch al que pertenece.
Cuando el cliente escanea el QR:
1. Se valida que la mesa existe y esta activa
2. Se obtiene el branch de la mesa
3. Se lee `branch.menuId`
4. Se crea una `TableSession(orgId, branchId, tableId, menuId)`
5. El menu se filtra por ese menuId

### Limitacion actual

Un branch solo puede tener **un menuId**. Esto impide:
- Menus diferentes por zona (terraza solo bebidas, salon completo)
- Menus por horario (almuerzo vs cena)
- Menus estacionales

Ver `docs/ROADMAP.md` Fase 4 para la solucion propuesta.

---

## Routing de items a estaciones

Cada **Station** tiene `categoryIds[]` — las categorias del menu que esa estacion prepara.

Cuando se crea una orden, la Cloud Function `onOrderCreated`:
1. Lee cada OrderItem
2. Busca el `categoryId` del producto
3. Encuentra la Station cuyo `categoryIds` incluye esa categoria
4. Escribe el item en RTDB bajo `/order_items/{stationId}/{orderId}_{itemId}`

Cada KDS solo escucha su nodo de RTDB = solo ve sus items.

---

## Roles y permisos

| Rol | Que puede hacer | Donde trabaja |
|---|---|---|
| **admin** | Todo: CRUD menu, mesas, estaciones, usuarios, ordenes, reportes | Admin web app |
| **manager** | Gestionar menu, ordenes, reportes (sin crear usuarios) | Admin web app |
| **operator** | Ver y avanzar tickets de su estacion | `kitchen_web` (KDS) |
| **cliente** | Ver menu, ordenar, tracking | `customer_web` (anonimo) |

### Autenticacion

- **Admin/Manager/Operator**: Email + password (Firebase Auth) → documento en coleccion `users`
- **Cliente**: Anonymous auth (Firebase) → no tiene documento de usuario, solo sesion temporal

---

## Apps del sistema

| App | Tecnologia | Plataforma | Usuarios |
|---|---|---|---|
| `admin_app` | React + TypeScript + Vite + TailwindCSS | Web (browser) | Duenos, managers |
| `customer_web` | React + TypeScript + Vite | Web (movil, QR/link) | Clientes del restaurante |
| `waiter_web` | React + TypeScript + Vite | Web (movil/tablet) | Meseros y caja |
| `kitchen_web` | React + TypeScript + Vite | Web (tablet) | Operadores de cocina/bar (KDS) |
| `landing` | React + Vite | Web | Marketing, planes y alta de organizaciones |
| `functions/` | TypeScript (Cloud Functions) | Firebase | Motor operacional (rutea pedidos, pagos, fidelidad) |
| `fastapi_bff` | Python + FastAPI | Cloud Run | Integraciones: fiscal (Digifact), pagos, IA, Zaveli |

> Las apps nativas Flutter (`client_app`, `waiter_app`, `kitchen_app`, `packages/core`) se archivaron en el tag git `archive/flutter-2026-11` (2026-11-05). Si hace falta app nativa se envuelve `customer_web` con Capacitor.

### Cloud Functions

| Funcion | Trigger | Que hace |
|---|---|---|
| `onOrderCreated` | Firestore onCreate en `orders` | Rutea items a RTDB por estacion, marca mesa ocupada |
| `onOrderItemUpdated` | Firestore onDocumentUpdated en `order_items` | Item in_progress → orden "in_preparation". Todos done → orden "ready" + libera mesa |
| `createOperatorUser` | HTTPS Callable | Crea usuario en Auth + Firestore (solo admins) |
| `yappyWebhook` | HTTPS | Webhook para pagos Yappy (futuro) |
| `getOrderReports` | HTTPS Callable | Reportes de ventas |

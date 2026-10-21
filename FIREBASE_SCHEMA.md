# FIREBASE_SCHEMA.md — Schema v2
# Diseño plano multi-tenant. Fuente de verdad de la base de datos.
# Nadie crea colecciones fuera de este archivo.

---

## Por qué es plano (no anidado)

El schema anterior anidaba todo bajo `organizations/{orgId}/branches/{branchId}/...`
Esto crea 4 niveles de profundidad y rompe:
- Queries entre sucursales de una misma cadena
- Security Rules que se vuelven exponencialmente complejas
- Dashboard de super-admin que necesita ver todos los clientes

**Solución:** colecciones al nivel raíz con `orgId` y `branchId` como campos.
Firestore maneja esto perfectamente con índices compuestos.

---

## Colecciones (todas al nivel raíz)

```
organizations
branches
menus
categories
products
tables
stations
orders
order_items
users
integrations
audit_log
kds_pins        ← server-only: PIN hasheado por estación (KDS)
staff_pins      ← server-only: PIN hasheado por mesero (waiter_web)
```

`kds_pins/{stationId}` y `staff_pins/{userId}` los escriben y leen solo Cloud Functions
(`setStationPin`/`kdsLogin`, `setWaiterPin`/`waiterLogin`). Forma común:
`{ orgId, salt, pinHash, failedAttempts, lockLevel, lockedUntil, updatedAt }` más
`branchId, stationId, operatorUid` (kds_pins) o `userId` (staff_pins). PIN de 6 dígitos,
pbkdf2-sha256, bloqueo creciente 5 min → 30 min → 24 h tras 5 intentos fallidos.

---

## Tipos de documento

### Organization
```typescript
// Subcolección SOLO-SERVIDOR: organizations/{orgId}/private/{doc}
//   private/odoo     { odooUrl, odooDb, odooUser, odooPassword }   ← BFF (app/core/odoo.py)
//   private/digifact { username, password, token?, tokenExpiresAt? } ← BFF (app/fiscal)
// Ningún cliente puede leerla ni escribirla (firestore.rules); el admin la configura
// vía callables. Nunca guardar credenciales en el doc de la organización.
{
  id: string                    // auto-ID Firestore
  name: string                  // "Cadena El Fogón"
  slug: string                  // "el-fogon" — único
  logoUrl?: string
  plan: "starter" | "growth" | "chain"
  planExpiresAt?: Timestamp
  defaultCurrency: string       // "USD"
  defaultTaxPercent: number     // 0.07 = 7%
  defaultTipOptions: number[]   // [0.10, 0.15, 0.20]
  timezone: string              // "America/Panama"
  isActive: boolean
  createdAt: Timestamp
  ownerId: string               // Firebase Auth UID del dueño
}
```

### Branch
```typescript
{
  id: string
  orgId: string                 // ← siempre presente
  name: string                  // "Sucursal Marbella"
  address: string
  phone?: string
  menuId: string                // ← qué menú usa esta sucursal
  taxPercent?: number           // override del org si es diferente
  tipOptions?: number[]
  isActive: boolean
  showProductImagesToWaiters?: boolean  // app del mesero muestra fotos de productos (default false)
  yappyHandle?: string          // Yappy (número o @usuario) al que pagan los pedidos por link — Yappy manual
  allowPayAtPickup?: boolean    // los pedidos por link pueden pagarse al retirar (van directo a cocina)
  businessHours: {
    monday?: { open: string, close: string }   // "08:00", "22:00"
    tuesday?: { open: string, close: string }
    // ... resto de días
  }
  createdAt: Timestamp
}
```

### Menu
```typescript
// Un menú puede asignarse a múltiples sucursales.
// Permite cadenas con menú compartido O menú diferente por local.
{
  id: string
  orgId: string
  name: string                  // "Menú principal", "Menú terraza"
  isActive: boolean
  createdAt: Timestamp
}
```

### Category
```typescript
{
  id: string
  orgId: string
  menuId: string
  name: string                  // "Entradas", "Carnes", "Bebidas"
  imageUrl?: string
  sortOrder: number
  isActive: boolean
  availableFrom?: string        // "11:00" — null = siempre
  availableTo?: string
  availableDays?: number[]      // [1,2,3,4,5] = lun-vie. null = todos
}
```

### Product
```typescript
{
  id: string
  orgId: string
  menuId: string
  categoryId: string
  name: string
  description?: string
  waiterNote?: string           // observaciones solo para el mesero (letra chica bajo el nombre)
  imageUrl?: string
  price: number
  isActive: boolean
  sortOrder: number
  tags: string[]                // ["vegetariano", "sin_gluten", "picante"]
  modifierGroups: ModifierGroup[]   // embebido — rara vez cambia
  preparationMinutes?: number
}

// Tipos embebidos en Product:
ModifierGroup {
  id: string
  name: string                  // "Término de cocción"
  required: boolean
  multiSelect: boolean
  minSelect: number
  maxSelect: number
  options: ModifierOption[]
}

ModifierOption {
  id: string
  name: string                  // "Término medio"
  extraPrice: number            // 0 si no tiene costo adicional
  isDefault: boolean
}
```

### Table
```typescript
{
  id: string
  orgId: string
  branchId: string
  number: string                // "7", "T-3", "VIP-1" — lo que quiera el restaurante
  zone?: string                 // "Terraza", "Salón principal"
  capacity: number
  qrData: string                // URL completa que codifica el QR
  isActive: boolean
  currentOrderId?: string       // null = mesa libre
}
```

### Station
```typescript
{
  id: string
  orgId: string
  branchId: string
  name: string                  // "Cocina", "Bar", "Postres"
  categoryIds: string[]         // qué categorías de menú enruta a esta estación
  fcmTokens: string[]           // tokens de los tablets de esta estación
  color: string                 // "#FF5722" — identificación visual
  isActive: boolean
}
```

### Order
```typescript
{
  id: string
  orgId: string                 // ← índice de seguridad principal
  branchId: string
  tableId: string
  tableNumber: string           // desnormalizado para mostrar sin join
  status: OrderStatus
  subtotal: number
  taxAmount: number
  taxPercent: number
  tipAmount: number
  total: number
  notes?: string
  source: "qr" | "waiter" | "zaveli"   // quién creó el pedido (customer_web, waiter_web, BFF Zaveli)
  createdByUid: string          // uid (anónimo o staff) que lo creó; el cliente solo lee sus pedidos
  customerName?: string         // pedidos por link / mesero: para quién es
  pickupCode?: string           // "P-ABCD": número de retiro (pedidos por link); "Z-…" en Zaveli
  payment: {
    method: "cash" | "card" | "yappy" | "transfer" | null
    status: "pending" | "paid" | "failed" | null
    yappyOrderId?: string
    confirmationNumber?: string // tarjeta en línea: codOper de PagueloFácil
    cardType?: string           // tarjeta en línea: tipo reportado por PagueloFácil
    paidAt?: Timestamp
    recordedBy?: string         // uid del personal que cobró (recordPayment) o "bff" (callback de tarjeta)
    payTo?: string              // Yappy manual: handle al que el cliente debe pagar (copiado de la sucursal)
    reviewedBy?: string         // Yappy manual: uid del personal que confirmó / rechazó el pago
  }
  invoiceRequest?: {            // factura con RUC pedida por el cliente / capturada por el mesero
    receiverType: "01" | "02"   // 01 contribuyente (RUC), 02 consumidor final
    taxId: string               // RUC, o "CF"
    dv?: string
    name: string
    email?: string
  }
  fiscal?: {                    // factura electrónica (solo servidor: BFF app/fiscal vía onOrderPaid)
    status: "pending" | "issuing" | "issued" | "error" | "skipped"
    numeroDF?: string           // 10 dígitos, correlativo por punto de facturación
    billingPoint?: string       // "001"
    codigoSeguridad?: string
    cufe?: string
    qrUrl?: string              // consulta en la DGI
    pdfPath?: string            // Storage: orgs/{orgId}/invoices/{cufe}.pdf
    xmlPath?: string
    docGuid?: string
    issuedAt?: Timestamp
    attempts: number
    lastError?: string
  }
  zaveli?: { operationId, businessId, conversationId, reply }   // solo pedidos source "zaveli"
  itemCount: number             // desnormalizado — para mostrar sin leer items
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}

// Quién escribe qué (firestore.rules lo impone):
// - Clientes (anónimo / mesero) solo CREAN pedidos en estado pending | pending_payment,
//   con su propio createdByUid y sin payment.status "paid" ni fiscal. Los totales que
//   mandan son solo para mostrar: onOrderCreated los recalcula desde products.
// - payment.* lo escriben solo las Cloud Functions (recordPayment, confirmManualPayment)
//   y el BFF (callback de tarjeta). Al pasar payment.status a "paid" se dispara onOrderPaid:
//   libera a cocina (si estaba en pending_payment), escribe audit_log y pide la factura.
// - El staff (admin/manager/waiter) solo actualiza status, notes, customerName,
//   tableNumber, invoiceRequest, updatedAt, completedAt.

// OrderStatus valores:
// "pending_payment"→ pedido del cliente esperando su pago: no va a cocina. Con
//                    payment.method "yappy" es Yappy manual y lo confirma el personal
//                    (callable confirmManualPayment); con method null es pago en línea (BFF).
//                    También se puede cobrar en persona (recordPayment) y pasa a confirmed.
// "payment_failed" → el pago en línea fue rechazado; el cliente puede reintentar
// "pending"        → recibido, aún no confirmado
// "confirmed"      → confirmado y enrutado a estaciones
// "in_preparation" → al menos un ítem en progreso
// "ready"          → todos los ítems listos
// "delivered"      → entregado al cliente
// "cancelled"      → también lo pone onOrderCreated si un ítem trae un productId inexistente
// "closed"         → cuenta cerrada
```

### OrderItem
```typescript
// COLECCIÓN SEPARADA de orders.
// Razón: el KDS necesita query "todos los ítems pendientes de station X"
// sin tener que leer todos los pedidos completos.
{
  id: string
  orgId: string
  branchId: string
  orderId: string
  stationId: string             // ← índice clave para el KDS
  tableNumber: string           // desnormalizado
  createdByUid: string          // igual que en el pedido (el cliente lee solo sus ítems)
  productId: string             // obligatorio: onOrderCreated toma el precio de products/{productId}
  productName: string           // desnormalizado — el menú puede cambiar
  categoryId: string
  quantity: number
  unitPrice: number
  totalPrice: number            // unitPrice * quantity
  modifiers: {
    name: string
    value: string
    extraPrice: number
  }[]
  specialInstructions?: string
  status: ItemStatus
  sentToStationAt: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
}

// ItemStatus valores:
// "queued"      → en cola de la estación
// "in_progress" → siendo preparado
// "done"        → listo
// "cancelled"
```

### AppUser
```typescript
// id == Firebase Auth UID
{
  id: string
  orgId: string
  branchIds: string[]           // sucursales con acceso
  email: string
  displayName: string
  role: "admin" | "manager" | "operator" | "waiter"   // waiter: solo waiter_web (toma pedidos y cobra)
  stationId?: string            // solo para operadores de cocina/bar
  isActive: boolean
  createdAt: Timestamp
  lastLoginAt?: Timestamp
}
```

### Integration
```typescript
// Credenciales de pago por sucursal.
// REGLA: nunca accesible desde el cliente. Solo Cloud Functions (Admin SDK).
// id = "{branchId}_{provider}"
{
  id: string
  orgId: string
  branchId: string
  provider: "yappy" | "bac" | "banistmo"
  merchantId: string            // encriptado
  secretKey: string             // encriptado — solo Cloud Functions lo lee
  domain: string
  environment: "sandbox" | "production"
  isActive: boolean
  createdAt: Timestamp
}
```

---

## Realtime Database — Estados en tiempo real

```
/order_items/{stationId}/{orderId}_{itemId}/
  status: string           // mirror de ItemStatus
  updatedAt: number        // timestamp unix ms
  tableNumber: string      // para mostrar en KDS sin query adicional
```

Por qué separar por `stationId`: cada KDS solo escucha su nodo.
El KDS de cocina no recibe eventos del bar y viceversa.

---

## FirestorePaths — Dart (packages/core)

```dart
// packages/core/lib/utils/firestore_paths.dart
// ESTE ARCHIVO ES LA ÚNICA FUENTE DE RUTAS.
// Nadie construye strings de ruta manualmente.

abstract class FirestorePaths {
  static const organizations = 'organizations';
  static const branches      = 'branches';
  static const menus         = 'menus';
  static const categories    = 'categories';
  static const products      = 'products';
  static const tables        = 'tables';
  static const stations      = 'stations';
  static const orders        = 'orders';
  static const orderItems    = 'order_items';
  static const users         = 'users';
  static const integrations  = 'integrations';

  // Documentos individuales
  static String org(String orgId) => '$organizations/$orgId';
  static String branch(String orgId, String branchId) => '$branches/$branchId';
  static String order(String orderId) => '$orders/$orderId';
  static String orderItem(String itemId) => '$orderItems/$itemId';
  static String product(String productId) => '$products/$productId';
  static String table(String tableId) => '$tables/$tableId';
  static String station(String stationId) => '$stations/$stationId';
  static String user(String userId) => '$users/$userId';
}
```

## FirestorePaths — TypeScript (admin_app)

```typescript
// admin_app/src/lib/firestore-paths.ts
export const paths = {
  organizations: 'organizations',
  branches:      'branches',
  menus:         'menus',
  categories:    'categories',
  products:      'products',
  tables:        'tables',
  stations:      'stations',
  orders:        'orders',
  orderItems:    'order_items',
  users:         'users',
  integrations:  'integrations',
} as const;
```

---

## Índices compuestos requeridos

```json
[
  {
    "collectionGroup": "orders",
    "fields": [
      {"fieldPath": "branchId", "order": "ASCENDING"},
      {"fieldPath": "status", "order": "ASCENDING"},
      {"fieldPath": "createdAt", "order": "DESCENDING"}
    ]
  },
  {
    "collectionGroup": "orders",
    "fields": [
      {"fieldPath": "orgId", "order": "ASCENDING"},
      {"fieldPath": "createdAt", "order": "DESCENDING"}
    ]
  },
  {
    "collectionGroup": "order_items",
    "fields": [
      {"fieldPath": "stationId", "order": "ASCENDING"},
      {"fieldPath": "status", "order": "ASCENDING"},
      {"fieldPath": "sentToStationAt", "order": "ASCENDING"}
    ]
  },
  {
    "collectionGroup": "order_items",
    "fields": [
      {"fieldPath": "orderId", "order": "ASCENDING"},
      {"fieldPath": "status", "order": "ASCENDING"}
    ]
  },
  {
    "collectionGroup": "products",
    "fields": [
      {"fieldPath": "categoryId", "order": "ASCENDING"},
      {"fieldPath": "isActive", "order": "ASCENDING"},
      {"fieldPath": "sortOrder", "order": "ASCENDING"}
    ]
  },
  {
    "collectionGroup": "users",
    "fields": [
      {"fieldPath": "orgId", "order": "ASCENDING"},
      {"fieldPath": "isActive", "order": "ASCENDING"}
    ]
  }
]
```

---

## Security Rules (esqueleto)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function uid() { return request.auth.uid; }
    function isAuthed() { return request.auth != null; }

    function userDoc() {
      return get(/databases/$(db)/documents/users/$(uid())).data;
    }
    function myOrgId() { return userDoc().orgId; }
    function myRole() { return userDoc().role; }
    function myBranches() { return userDoc().branchIds; }

    function isAdmin() { return isAuthed() && myRole() == 'admin'; }
    function isManager() { return isAuthed() && myRole() in ['admin','manager']; }
    function isOperator() { return isAuthed() && myRole() in ['admin','manager','operator']; }
    function belongsToMyOrg(orgId) { return isAuthed() && myOrgId() == orgId; }
    function belongsToMyBranch(branchId) { return branchId in myBranches(); }

    // Organizations
    match /organizations/{orgId} {
      allow read: if belongsToMyOrg(orgId);
      allow write: if isAdmin() && belongsToMyOrg(orgId);
    }
    // Branches
    match /branches/{branchId} {
      allow read: if belongsToMyOrg(resource.data.orgId)
                  && belongsToMyBranch(branchId);
      allow write: if isAdmin() && belongsToMyOrg(resource.data.orgId);
    }
    // Menu (lectura pública para clientes anónimos que necesitan el menú)
    match /categories/{id} { allow read: if isAuthed(); allow write: if isManager() && belongsToMyOrg(resource.data.orgId); }
    match /products/{id}   { allow read: if isAuthed(); allow write: if isManager() && belongsToMyOrg(resource.data.orgId); }

    // Orders — clientes pueden crear, operadores pueden leer y actualizar
    match /orders/{orderId} {
      allow read:   if belongsToMyOrg(resource.data.orgId);
      allow create: if isAuthed(); // anon auth del cliente
      allow update: if belongsToMyOrg(resource.data.orgId);
    }
    // Order items
    match /order_items/{itemId} {
      allow read:   if belongsToMyOrg(resource.data.orgId);
      allow create: if isAuthed();
      allow update: if belongsToMyOrg(resource.data.orgId)
                    && (isManager()
                        || userDoc().stationId == resource.data.stationId);
    }
    // Users — solo admins gestionan usuarios
    match /users/{userId} {
      allow read:  if uid() == userId || (isManager() && belongsToMyOrg(resource.data.orgId));
      allow write: if isAdmin() && belongsToMyOrg(resource.data.orgId);
    }
    // Integrations — NUNCA desde cliente
    match /integrations/{id} {
      allow read, write: if false;
    }
  }
}
```

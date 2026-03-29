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
```

---

## Tipos de documento

### Organization
```typescript
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
  payment: {
    method: "cash" | "card" | "yappy" | null
    status: "pending" | "paid" | "failed" | null
    yappyOrderId?: string
    confirmationNumber?: string
    paidAt?: Timestamp
  }
  itemCount: number             // desnormalizado — para mostrar sin leer items
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}

// OrderStatus valores:
// "pending"        → recibido, aún no confirmado
// "confirmed"      → confirmado y enrutado a estaciones
// "in_preparation" → al menos un ítem en progreso
// "ready"          → todos los ítems listos
// "delivered"      → entregado al cliente
// "cancelled"
// "closed"         → cuenta cerrada / pagado
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
  productId: string
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
  role: "admin" | "manager" | "operator"
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

# RestaurantOS + Odoo — Integration Architecture

## Stack overview

```
Flutter apps (Client · Waiter · KDS)
        │  ↕ login/orders              │ SDK directo
        │                              ↓
   FastAPI BFF  ←——————————→   Firebase
        │  ↕ catalog sync              (Auth · Firestore · FCM)
        │  ↕ ERP register
        ↓
     Odoo ERP
  (Products · HR · Accounting)
        
PagueloFácil/Yappy ——webhook——→ FastAPI BFF
```

**Regla de oro:**
- Odoo = fuente de verdad para catálogo, empleados, contabilidad
- Firebase = capa operacional en tiempo real (órdenes, mesas, KDS)
- FastAPI = el único puente entre los dos mundos
- Las apps Flutter hablan con Firebase para todo lo operacional; con FastAPI solo para auth y pagos

---

## 1. Authentication

### Flujo completo

```
Flutter (login screen)
  → POST /auth/login  { username, password }
  → FastAPI valida contra Odoo JSON-RPC:
      common.authenticate(db, username, password, {})
  → Si uid válido: leer employee via models.execute_kw('hr.employee', ...)
  → FastAPI genera Firebase Custom Token con claims:
      { odoo_uid, role, branch_id, org_id, employee_name }
  → Flutter recibe token → auth.signInWithCustomToken(token)
  → Firebase session activa con todos los claims
```

### FastAPI endpoint

```python
POST /auth/login
Body: { "username": "carlos@resto.com", "password": "1234" }

Response:
{
  "firebase_token": "eyJ...",
  "employee": {
    "id": 42,
    "name": "Carlos Martínez",
    "role": "waiter",     # waiter | kitchen | manager | admin
    "branch_id": 3,
    "org_id": 1
  }
}
```

### Firebase Custom Token claims

```json
{
  "odoo_uid": 42,
  "odoo_employee_id": 7,
  "role": "waiter",
  "branch_id": 3,
  "org_id": 1,
  "restaurant_name": "La Parrilla del Centro"
}
```

### Firestore Security Rules (auth-aware)

```javascript
// Solo el rol 'kitchen' puede escribir order_item status
match /order_items/{itemId} {
  allow read: if isAuthenticated();
  allow update: if hasRole('kitchen') || hasRole('manager');
  allow create: if hasRole('waiter') || hasRole('client');
}

function hasRole(r) {
  return request.auth.token.role == r;
}
function isAuthenticated() {
  return request.auth != null;
}
```

### Revocación al despedir un empleado

Odoo webhook `hr.employee` → `write` → FastAPI:
```python
POST /webhooks/odoo/employee
# Si employee.active == False → revocar Firebase token
await firebase_admin.auth.revoke_refresh_tokens(firebase_uid)
```

---

## 2. Catalog Sync (Odoo → Firebase)

### Estrategia: Odoo es source of truth, Firebase es cache

El menú nunca se edita en Firebase directamente. El admin lo edita en Odoo y el sync lo propaga automáticamente.

### Trigger de sync

**Con webhook (Odoo.sh / on-premise):**
```
Admin actualiza precio en Odoo POS
  → Odoo trigger automation → POST /webhooks/odoo/product
  → FastAPI lee el producto actualizado via JSON-RPC
  → FastAPI escribe en Firestore: orgs/{orgId}/branches/{branchId}/menu/{productId}
  → onSnapshot en Flutter → menú actualizado en <1 seg
```

**Sin webhook (Odoo SaaS):**
```
Cloud Scheduler (cada 5 min)
  → POST /jobs/sync-catalog
  → FastAPI lee todos los productos POS desde Odoo
  → Diff contra Firestore
  → Solo escribe los cambios
```

### FastAPI endpoint de sync manual

```
POST /admin/sync-catalog
Headers: Authorization: Bearer {admin_firebase_token}

Response: { "synced": 24, "created": 2, "updated": 1, "deleted": 0 }
```

### Firestore schema del catálogo

```
orgs/{orgId}/
  branches/{branchId}/
    menu_categories/{catId}
      name: string
      pos_category_id: number      # ID de pos.category en Odoo
      sort_order: number
      emoji: string                # 🍕 🍺 — solo en Firebase, no en Odoo

    menu_products/{productId}
      odoo_product_id: number      # product.product ID en Odoo
      name: string
      description: string
      price: number
      category_id: string          # ref a menu_categories
      station_id: string           # ref a stations (cocina/bar)
      available: boolean
      tags: string[]               # ["popular", "sin gluten"]
      sort_order: number
      updated_at: timestamp
```

### Lógica de station_id en el sync

```python
# FastAPI: al sincronizar producto, inferir estación por categoría POS
def resolve_station(product, stations):
    cat_id = product.get('pos_category_id')
    for station in stations:
        if cat_id in station['category_ids']:
            return station['id']
    return stations[0]['id']  # fallback: primera estación
```

---

## 3. Order Flow (Firebase first → Odoo on payment)

### Por qué Firebase primero

- Latencia operacional: el mesero toca "enviar" → KDS lo ve en <500ms
- Offline: funciona sin conexión a Odoo
- Odoo no recibe traffic durante la operación — solo al cerrar la orden

### Flujo completo

```
Mesero/Cliente crea orden en Flutter
  → Flutter escribe directamente en Firestore:
      orders/{orderId} { status: 'queued', source: 'waiter'|'qr', ... }
      order_items/{itemId} × N { orderId, stationId, status: 'queued', ... }

KDS escucha onSnapshot en order_items filtrado por stationId
  → Ticket aparece en pantalla en <500ms

Cocina despacha → KDS marca item status: 'ready'
  → Flutter (mesero/cliente) ve el cambio en tiempo real

Mesero cobra → Flutter llama POST /payments/charge
  → FastAPI procesa pago con PagueloFácil
  → PagueloFácil confirma
  → FastAPI actualiza Firestore: order.status = 'paid'
  → FastAPI registra en Odoo vía JSON-RPC (async, en background):
      pos.order.create({ lines, amount_paid, payment_method_id })
  → Si Odoo falla: encola en Firestore /sync_queue/{orderId}
      Cloud Function reintenta cada 2 min × 10 veces
```

### Firestore schema de órdenes

```
orders/{orderId}
  id: string
  org_id: string
  branch_id: string
  table_id: string | null        # null = order por nombre (demo mode)
  customer_name: string          # "Ana" | "Mesa 5"
  source: 'qr' | 'waiter'
  waiter_id: string | null       # Firebase UID del mesero
  status: OrderStatus
  subtotal: number
  total: number
  item_count: number
  payment_method: string | null  # 'cash' | 'card' | 'yappy' | 'paguelofacil'
  paid_at: timestamp | null
  odoo_order_id: number | null   # pos.order ID en Odoo (null hasta sync)
  bill_requested_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp

order_items/{itemId}
  id: string
  org_id: string
  branch_id: string
  order_id: string
  station_id: string
  table_number: string
  product_id: string             # ref a menu_products en Firestore
  odoo_product_id: number        # para el sync a Odoo
  product_name: string
  category_id: string
  quantity: number
  unit_price: number
  total_price: number
  modifiers: Modifier[]
  special_instructions: string | null
  status: ItemStatus
  sent_to_station_at: timestamp
  ready_at: timestamp | null
  delivered_at: timestamp | null
```

### OrderStatus values

```
queued       → recibido, esperando cocina
preparing    → cocina tomó el ticket
ready        → listo para entregar
delivered    → entregado al cliente
bill_requested → cliente pidió la cuenta
paid         → cobrado
closed       → cerrado (orden archivada)
cancelled    → cancelado
```

### ItemStatus values

```
queued → preparing → ready → delivered
```

### Sync a Odoo al pagar

```python
# FastAPI: registrar orden en Odoo cuando se confirma el pago
async def sync_order_to_odoo(order: Order, payment_method: str):
    odoo = OdooClient()
    
    # Encontrar sesión POS activa
    session_id = await odoo.find_active_session(branch_id=order.branch_id)
    
    # Crear orden
    order_id = await odoo.create(
        'pos.order',
        {
            'session_id': session_id,
            'lines': [
                (0, 0, {
                    'product_id': item.odoo_product_id,
                    'qty': item.quantity,
                    'price_unit': item.unit_price,
                    'price_subtotal': item.total_price,
                    'price_subtotal_incl': item.total_price,
                })
                for item in order.items
            ],
            'amount_total': order.total,
            'amount_tax': 0,
            'amount_paid': order.total,
            'amount_return': 0,
        }
    )
    
    # Registrar pago
    payment_method_id = await odoo.get_payment_method_id(payment_method)
    await odoo.call(
        'pos.order', 'add_payment',
        [order_id, {'payment_method_id': payment_method_id, 'amount': order.total}]
    )
    
    # Actualizar Firestore con el odoo_order_id
    await firestore.update(f'orders/{order.id}', {'odoo_order_id': order_id})
    
    return order_id
```

---

## 4. Payment Flow (PagueloFácil / Yappy)

### PagueloFácil (tarjeta, Clave)

```
Cliente/Mesero toca "Pagar"
  → Flutter POST /payments/charge
      { order_id, amount, method: 'paguelofacil' }
  → FastAPI llama PagueloFácil API:
      POST https://sandbox.paguelofacil.com/rest/main/charge/sale
      { CCLW, amount, email, description }
  → PagueloFácil redirige a checkout (hosted) o procesa en API
  → Webhook POST /webhooks/paguelofacil/confirmation
      { transaction_id, status, amount }
  → FastAPI verifica firma HMAC
  → FastAPI update Firestore: order.status = 'paid'
  → FastAPI sync a Odoo (async)
  → Flutter recibe push notification (FCM): "Pago confirmado ✓"
```

### Yappy (via QR / deep link)

```
Cliente toca "Pagar con Yappy"
  → Flutter POST /payments/yappy/init
      { order_id, amount }
  → FastAPI genera Yappy QR o deep link vía Banistmo API
  → Flutter muestra QR o abre app de Yappy
  → Webhook Yappy confirma pago → mismo flujo de sync
```

### Variables de entorno requeridas

```env
PAGUELOFACIL_CCLW=xxx
PAGUELOFACIL_TOKEN=xxx
PAGUELOFACIL_ENV=sandbox|production
PAGUELOFACIL_WEBHOOK_SECRET=xxx

YAPPY_MERCHANT_ID=xxx
YAPPY_SECRET_KEY=xxx
```

---

## 5. FastAPI BFF — Endpoints completos

### Auth

```
POST   /auth/login              Valida Odoo → devuelve Firebase Custom Token
POST   /auth/logout             Revoca refresh tokens Firebase
GET    /auth/me                 Info del empleado autenticado
```

### Catalog

```
GET    /catalog/products        Lista productos del branch (desde Firestore cache)
GET    /catalog/categories      Lista categorías POS
POST   /admin/sync-catalog      Fuerza sync Odoo → Firebase (role: manager)
GET    /admin/sync-status       Estado del último sync
```

### Orders

```
POST   /orders                  Crea orden (escribe en Firestore)
GET    /orders/{orderId}        Obtiene orden
PATCH  /orders/{orderId}/status Actualiza status (bill_requested, closed)
POST   /orders/{orderId}/add-items  Agrega ítems a orden existente (happy hour)
```

### Payments

```
POST   /payments/charge         Inicia pago (PagueloFácil o Yappy)
GET    /payments/{orderId}      Estado del pago
POST   /webhooks/paguelofacil   Webhook de confirmación PagueloFácil
POST   /webhooks/yappy          Webhook de confirmación Yappy
```

### Webhooks Odoo

```
POST   /webhooks/odoo/product   Producto actualizado en Odoo → sync Firebase
POST   /webhooks/odoo/employee  Empleado modificado → revocar token si inactive
POST   /webhooks/odoo/session   Sesión POS abierta/cerrada
```

### Admin

```
GET    /health                  Health check completo (Odoo + Firebase + Pagos)
GET    /admin/odoo/products     Proxy a Odoo: lista productos POS raw
GET    /admin/odoo/employees    Proxy a Odoo: lista empleados activos
POST   /admin/seed/odoo         Ejecuta seed de datos en Odoo (dev/staging only)
POST   /admin/seed/firebase     Ejecuta seed de datos en Firebase (dev/staging only)
```

---

## 6. Firestore schema completo

```
orgs/{orgId}
  name: string
  plan: 'community' | 'enterprise'
  odoo_url: string
  odoo_db: string
  odoo_api_key: string           # encrypted at rest
  created_at: timestamp

  branches/{branchId}
    name: string
    address: string
    timezone: string
    odoo_branch_id: number       # ID de branch/warehouse en Odoo
    active_session_id: string | null
    
    stations/{stationId}
      name: string               # "Cocina" | "Bar"
      type: 'kitchen' | 'bar' | 'prep'
      odoo_station_id: number
      active: boolean
      category_ids: string[]     # categorías que ve esta estación
    
    floors/{floorId}
      name: string               # "Interior" | "Terraza"
      odoo_floor_id: number
      
      tables/{tableId}
        name: string             # "Mesa 1" | "T-01"
        seats: number
        odoo_table_id: number
        status: 'free' | 'occupied' | 'bill_requested' | 'reserved'
        active_order_id: string | null
    
    menu_categories/{catId}
      name: string
      pos_category_id: number
      sort_order: number
      emoji: string
    
    menu_products/{productId}
      [ver sección 2]
    
    orders/{orderId}
      [ver sección 3]
    
    order_items/{itemId}
      [ver sección 3]
    
    sync_queue/{orderId}
      order_id: string
      attempt: number
      last_attempt: timestamp
      error: string
      
    sessions/{sessionId}
      odoo_session_id: number
      opened_at: timestamp
      closed_at: timestamp | null
      cashier_id: string
```

---

## 7. Estructura del FastAPI BFF

```
fastapi_bff/
  app/
    main.py                  # FastAPI app, routers, CORS, middleware
    config.py                # Settings from env vars
    
    auth/
      router.py              # /auth endpoints
      service.py             # Odoo auth + Firebase token generation
      models.py
    
    catalog/
      router.py              # /catalog + /admin/sync-catalog
      service.py             # Odoo → Firebase sync logic
      models.py
    
    orders/
      router.py              # /orders endpoints
      service.py             # Firestore writes + Odoo sync
      models.py
    
    payments/
      router.py              # /payments + /webhooks
      paguelofacil.py        # PagueloFácil API client
      yappy.py               # Yappy API client
      service.py             # Payment orchestration
      models.py
    
    webhooks/
      router.py              # /webhooks/odoo/*
      odoo_handler.py        # Handle Odoo automation webhooks
    
    core/
      odoo.py                # Odoo JSON-RPC client (reusable)
      firebase.py            # Firebase Admin SDK setup
      firestore.py           # Firestore helpers
      security.py            # JWT validation, HMAC verification
      exceptions.py
  
  tests/
    test_auth.py
    test_catalog_sync.py
    test_order_sync.py
    test_payments.py
  
  scripts/
    seed_odoo.py             # Seed data en Odoo
    seed_firebase.py         # Seed data en Firebase
  
  .env.example
  requirements.txt
  Dockerfile
```

---

## 8. Decisiones arquitectónicas documentadas

| # | Decisión | Alternativa descartada | Razón |
|---|---|---|---|
| D1 | Firebase Custom Token desde Odoo auth | Firebase Auth nativo independiente | Odoo es source of truth para empleados (nómina, HR) |
| D2 | Firebase first para órdenes | Odoo first | Latencia, offline, Odoo no recibe load operacional |
| D3 | Sync Odoo→Firebase para catálogo | Leer Odoo directo desde Flutter | Performance, offline, 1 request vs N requests |
| D4 | PagueloFácil en FastAPI, no en Odoo | Módulo PagueloFácil en Odoo | Independiente de modalidad Odoo (SaaS/on-premise) |
| D5 | Sync async a Odoo al pagar | Write-through simultáneo | Si Odoo cae, los pagos no se interrumpen |
| D6 | Cola de reintentos en Firestore | Redis/BullMQ | Mismo stack, sin infra adicional |
| D7 | Odoo JSON-RPC (XML-RPC fallback) | REST/OCA | JSON-RPC funciona en todas las versiones y modalidades |
| D8 | Un FastAPI por organización | Multi-tenant en un solo BFF | Aislamiento, simplicidad, deploy por cliente |

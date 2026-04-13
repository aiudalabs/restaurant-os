# RestaurantOS — Flujos del Sistema

**Ultima actualizacion:** 2026-03-30

---

## Flujo End-to-End (estado actual - funcionando)

```
                    CLIENT APP                          BACKEND                         KITCHEN APP
                    ──────────                          ───────                         ───────────
 1. Escanear QR ──────────────┐
                               │
 2. Deep link abre app         │
    (o browser via link)       │
                               │
 3. Anonymous auth ───────────────→ Firebase Auth
                               │   (signInAnonymously)
                               │
 4. Validar mesa ─────────────────→ Firestore: tables/{id}
    (existe, activa,           │   (valida orgId, branchId)
     pertenece al branch)     │
                               │
 5. Cargar menu ──────────────────→ Firestore: categories + products
    (filtrado por              │   (where menuId == branch.menuId)
     branch.menuId)            │
                               │
 6. Agregar al carrito         │
    (estado local en app)      │
                               │
 7. Enviar orden ─────────────────→ Firestore: crear Order + OrderItems
                               │
                               │   Cloud Function: onOrderCreated
                               │   ├── Lee cada item
                               │   ├── Busca station por categoryId
                               │   ├── Escribe en RTDB /order_items/{stationId}/
                               │   └── Marca mesa: currentOrderId = orderId
                               │                                        │
                               │                                        ▼
 8. Tracking screen            │                              KDS recibe ticket
    (escucha Order.status) ◄───│                              (RTDB streaming)
                               │                                        │
                               │                              Operator tap:
                               │                              queued → in_progress → done
                               │                                        │
                               │   Cloud Function: onOrderItemUpdated   │
                               │   ├── Algun item in_progress →        │
                               │   │   Order = "in_preparation"        │
                               │   └── Todos items done →              │
                               │       Order = "ready" + libera mesa   │
                               │                                        │
 9. Cliente ve "Listo"  ◄──────│                                        │
                               │
                               │   Admin: marca "entregado" → "cerrado"
                               │
10. FIN                        │
```

---

## Flujo del Cliente (detalle)

### Entrada via QR
```
QR impreso en mesa
  → URL: https://aiudalabs.github.io/restaurant/qr/?org=X&branch=Y&table=Z
  → Deep link (Android intent filter) o browser fallback
  → Router detecta /restaurant/qr → redirect a /?org=X&branch=Y&table=Z
  → SplashScreen recibe params
```

### Inicializacion (SplashScreen)
```
1. Anonymous auth (reutiliza sesion existente si hay)
2. Fetch tabla por tableId
3. Validar: tabla activa + orgId/branchId coinciden
4. Fetch branch → obtener menuId + branchName
5. Crear TableSession(orgId, branchId, tableId, tableNumber, menuId, branchName, zone)
6. Navegar a /menu
```

### Menu → Carrito → Orden
```
MenuScreen:
  - Hero con nombre restaurante + mesa + badge "Abierto"
  - Search bar + category chips (horizontal scroll)
  - Product grid 2 columnas
  - Cart FAB con contador

ProductDetailScreen:
  - Imagen + info del producto
  - Modifier groups (radio/checkbox)
  - Quantity selector
  - "Agregar al carrito"

CartScreen:
  - Lista de items con qty +/-
  - Notas para cocina (texto libre)
  - Summary: subtotal + ITBMS (tax) + total
  - "Enviar orden" → crea Order + OrderItems en Firestore

TrackingScreen:
  - Stepper: Recibido → Preparando → Listo → Entregado
  - ETA card (tiempo estimado)
  - Items con status individual
  - Boton "Agregar mas items"
```

### Que pasa cuando cierra la app
- La sesion anonymous se mantiene (Firebase la persiste)
- Pero NO hay forma de volver al tracking si cierra y no escanea de nuevo
- No hay historial, favoritos, ni perfil

---

## Flujo del Admin

### Login
```
Email + password → Firebase Auth
  → Fetch user doc → validar role == "admin" o "manager"
  → Obtener orgId, branchIds
  → BranchContext: selector de sucursal activa
```

### Gestion de menu
```
Seleccionar branch → cargar menus del org
  → Si branch no tiene menuId: boton "Vincular menu"
  → CRUD categorias dentro del menu
  → CRUD productos dentro de categoria
  → Cada producto: nombre, precio, descripcion, modifiers, tags
```

### Gestion de ordenes
```
Lista de ordenes (filtradas por branch)
  → Click en orden → OrderDetailDialog
  → Botones segun status:
    - pending → "Confirmar"
    - ready → "Marcar entregado"
    - cualquiera → "Cancelar"
    - delivered → "Cerrar"
```

### Gestion de mesas
```
Lista de mesas del branch seleccionado
  → Crear mesa: numero, zona, capacidad
  → QR se genera automaticamente (URL con org+branch+table)
  → Descargar QR (actualmente baja resolucion)
  → Indicador visual: libre (verde) / ocupada (rojo)
```

### Gestion de estaciones
```
Lista de estaciones del branch
  → Crear estacion: nombre, color, categoryIds
  → categoryIds = que categorias del menu prepara esta estacion
  → Asignar operadores (users con stationId)
```

---

## Flujo del KDS (Kitchen Display System)

### Login
```
Email + password → Firebase Auth
  → Fetch user doc → obtener stationId
  → SessionNotifier: orgId, branchId, stationId
```

### Pantalla principal
```
Escucha RTDB: /order_items/{stationId}/
  → Agrupa items por orderId
  → Filtra: solo queued + in_progress (no done/cancelled)
  → Ordena por receivedAt (FIFO)
  → Muestra tickets con colores de urgencia:
    - Verde: < 10 min
    - Amarillo: 10-15 min
    - Rojo: > 15 min
```

### Avanzar items
```
Tap en item:
  queued → in_progress (aparece llama)
  in_progress → done (desaparece del board)

Cada tap:
  1. Update RTDB (velocidad, <50ms para KDS)
  2. Update Firestore (source of truth, triggers Cloud Function)
```

### Recall drawer
```
Deslizar para abrir
  → Muestra ultimos 10 tickets completados (2 horas)
  → Permite verificar ordenes recientes
```

---

## Flujos futuros (no implementados)

### Pagos
```
CartScreen → TipScreen → PaymentMethodScreen → Confirmar
  → Efectivo: "Pagar en mesa" → admin marca pagado
  → Tarjeta: integracion directa (futuro)
  → Yappy: redirect a Yappy → webhook confirma → Cloud Function actualiza orden
```

### Registro de cliente (propuesto)
```
Momento: al pagar o al querer ver historial
  → "Registrate con tu telefono para guardar tu pedido"
  → Phone auth (OTP SMS) o Google Sign-In
  → Firebase: linkWithCredential (convierte anonymous → cuenta real)
  → Crear documento en coleccion "customers"
  → Beneficios: historial, favoritos, re-order, loyalty points
```

### Cancelacion completa
```
Admin cancela orden →
  Cloud Function →
    Update Firestore items → cancelled
    Update RTDB items → cancelled
    KDS muestra notificacion
    Client tracking → "Orden cancelada"
    Liberar mesa
```

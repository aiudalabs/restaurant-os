# RestaurantOS — Flujo Completo de Pedido

## Diagrama de Flujo End-to-End

```mermaid
flowchart TD
    subgraph ADMIN["🖥️ ADMIN APP (React)"]
        A1[Crear Org + Branch]
        A2[Crear Menu + Categorias + Productos]
        A3[Crear Mesas + Generar QR]
        A4[Crear Estaciones de cocina]
        A5[Crear Usuarios operadores]
        A6[Ver ordenes entrantes]
        A7{Confirmar orden?}
        A8[Marcar entregado]
        A9[Cerrar orden]
        A10[Dashboard + Reportes]
    end

    subgraph CLIENT["📱 CLIENT APP (Flutter)"]
        C1[Escanear QR de mesa]
        C2[Auth anonimo Firebase]
        C3[Ver menu del restaurante]
        C4[Detalle producto + Modificadores]
        C5[Agregar al carrito]
        C6[Revisar carrito + Notas cocina]
        C7[Enviar pedido]
        C8[Pantalla tracking en vivo]
        C9[Pedido listo!]
    end

    subgraph KITCHEN["🍳 KITCHEN APP (Flutter)"]
        K1[Login operador]
        K2[KDS: tickets en tiempo real]
        K3[Tap item → in_progress]
        K4[Tap item → done]
        K5[Bump-all: todo listo]
        K6[Recall: ver completados]
    end

    subgraph FIREBASE["☁️ FIREBASE BACKEND"]
        F1[(Firestore: orders)]
        F2[(Firestore: order_items)]
        F3[(RTDB: kds_tickets)]
        F4[Cloud Function: onOrderCreated]
        F5[Cloud Function: onOrderItemUpdated]
    end

    %% === SETUP (Admin) ===
    A1 -->|Firestore| A2
    A2 -->|Firestore| A3
    A3 -->|Firestore| A4
    A4 -->|Firestore| A5

    %% === CLIENTE ORDENA ===
    C1 -->|Deep link / Scanner| C2
    C2 -->|Lee menu de Firestore| C3
    C3 --> C4
    C4 --> C5
    C5 --> C6
    C6 -->|addDoc orders + order_items| C7

    %% === BACKEND PROCESA ===
    C7 -->|Trigger| F1
    C7 -->|Trigger| F2
    F1 -->|onOrderCreated| F4
    F4 -->|Escribe kds_tickets en RTDB| F3

    %% === COCINA PREPARA ===
    F3 -->|Realtime stream| K2
    K1 --> K2
    K2 --> K3
    K3 -->|updateDoc order_items| F2
    K4 -->|updateDoc order_items| F2
    K5 -->|updateDoc todos los items| F2

    %% === AUTO-UPDATE STATUS ===
    F2 -->|onOrderItemUpdated| F5
    F5 -->|"Todos done → order.status = ready"| F1
    F5 -->|"Alguno in_progress → order.status = in_preparation"| F1

    %% === TRACKING CLIENTE ===
    F1 -->|onSnapshot realtime| C8
    C8 -->|"status == ready"| C9

    %% === ADMIN GESTIONA ===
    F1 -->|onSnapshot realtime| A6
    A6 --> A7
    A7 -->|Si| A8
    A8 -->|updateDoc status=delivered| F1
    A8 --> A9
    A9 -->|updateDoc status=closed| F1
    A7 -->|Cancelar| A9
    A9 --> A10

    %% === ESTILOS ===
    classDef done fill:#E8F5EE,stroke:#2D7A4F,color:#1A1008
    classDef pending fill:#FEF3C7,stroke:#92400E,color:#1A1008
    classDef blocked fill:#FEF2F2,stroke:#991B1B,color:#1A1008

    class A1,A2,A3,A4,A5,A6,A7,A8,A9 done
    class C2,C3,C4,C5,C6,C7,C8 done
    class K1,K2,K3,K4,K5,K6 done
    class F1,F2,F3,F4,F5 done
    class C1 pending
    class A10 pending
    class C9 done
```

## Diagrama de Secuencia — Flujo de un Pedido

```mermaid
sequenceDiagram
    actor Cliente
    participant ClientApp as Client App<br/>(Flutter)
    participant Firestore as Firestore<br/>(orders + items)
    participant Functions as Cloud Functions
    participant RTDB as Realtime DB<br/>(kds_tickets)
    participant KitchenApp as Kitchen App<br/>(Flutter KDS)
    participant AdminApp as Admin App<br/>(React)

    Note over Cliente,AdminApp: 🟢 FASE 1: Cliente escanea QR y ordena

    Cliente->>ClientApp: Escanea QR de mesa
    ClientApp->>ClientApp: Auth anonimo Firebase
    ClientApp->>Firestore: Lee menu (productos, categorias)
    ClientApp-->>Cliente: Muestra menu con diseño mockup
    Cliente->>ClientApp: Selecciona productos + modificadores
    Cliente->>ClientApp: Revisa carrito + notas
    ClientApp->>Firestore: addDoc(orders) + addDoc(order_items)

    Note over Cliente,AdminApp: 🟢 FASE 2: Backend procesa y notifica cocina

    Firestore->>Functions: Trigger onOrderCreated
    Functions->>RTDB: Escribe kds_ticket con items por estacion
    Functions->>Firestore: order.status = "confirmed"

    Note over Cliente,AdminApp: 🟢 FASE 3: Cocina prepara

    RTDB-->>KitchenApp: Stream realtime (onValue)
    KitchenApp-->>KitchenApp: Muestra ticket con timer + urgencia
    KitchenApp->>Firestore: Tap item → status = "in_progress"
    Firestore->>Functions: Trigger onOrderItemUpdated
    Functions->>Firestore: order.status = "in_preparation"
    Firestore-->>ClientApp: onSnapshot → tracking actualiza
    ClientApp-->>Cliente: "Preparando tu pedido..."

    KitchenApp->>Firestore: Tap item → status = "done"
    KitchenApp->>Firestore: (o Bump-all → todos done)
    Firestore->>Functions: Trigger onOrderItemUpdated
    Functions->>Firestore: order.status = "ready"
    Firestore-->>ClientApp: onSnapshot → tracking actualiza
    ClientApp-->>Cliente: "¡Tu pedido esta listo!"

    Note over Cliente,AdminApp: 🟢 FASE 4: Admin entrega y cierra

    Firestore-->>AdminApp: onSnapshot → orden "ready"
    AdminApp->>Firestore: status = "delivered"
    Firestore-->>ClientApp: onSnapshot → "Entregado"
    AdminApp->>Firestore: status = "closed"
```

## Estado por Componente

```mermaid
block-beta
    columns 4

    block:header:4
        title["RestaurantOS — Estado de Implementación (Marzo 2026)"]
    end

    block:admin:1
        admin_title["🖥️ Admin App"]
        admin_list["
        ✅ Login / Auth
        ✅ CRUD Menu
        ✅ CRUD Categorias
        ✅ CRUD Productos
        ✅ CRUD Mesas + QR
        ✅ CRUD Estaciones
        ✅ CRUD Usuarios
        ✅ Ordenes (ver + gestionar)
        🟡 Dashboard / Reportes
        🟡 Settings (tax, tips)
        🔴 Upload imagenes
        🔴 Export CSV/PDF
        🔴 Onboarding wizard
        "]
    end

    block:client:1
        client_title["📱 Client App"]
        client_list["
        ✅ Auth anonimo
        ✅ Menu (diseño mockup)
        ✅ Detalle + Modificadores
        ✅ Carrito + Notas
        ✅ Enviar pedido
        ✅ Tracking en vivo
        ✅ i18n (es/en)
        ✅ Design system
        🟡 Deep links (QR→app)
        🟡 QR scanner in-app
        🔴 Pagos (efectivo/Yappy)
        🔴 Propinas
        🔴 Historial + Re-order
        🔴 Push notifications
        "]
    end

    block:kitchen:1
        kitchen_title["🍳 Kitchen App"]
        kitchen_list["
        ✅ Login operador
        ✅ KDS tickets realtime
        ✅ Tap-to-advance items
        ✅ Colores de urgencia
        ✅ Timer por ticket
        ✅ Bump-all
        ✅ Recall completados
        ✅ Audio alerta
        ✅ Multi-estacion
        🟡 Void items
        🔴 Auto-priorizacion
        🔴 Timing de cursos
        "]
    end

    block:backend:1
        backend_title["☁️ Firebase"]
        backend_list["
        ✅ Firestore schema
        ✅ Security rules
        ✅ onOrderCreated
        ✅ onOrderItemUpdated
        ✅ createOperatorUser
        ✅ RTDB kds_tickets
        🟡 Deploy functions
        🔴 Cancelacion cascade
        🔴 Push notifications
        🔴 Inventario
        "]
    end

    style admin_title fill:#1A1008,color:#fff
    style client_title fill:#C8392B,color:#fff
    style kitchen_title fill:#0D0D0F,color:#F0EFE8
    style backend_title fill:#F59E0B,color:#1A1008
```

## Leyenda

| Simbolo | Significado |
|---------|-------------|
| ✅ | Implementado y funcionando |
| 🟡 | Parcialmente implementado o pendiente de deploy |
| 🔴 | No implementado aun |

## Comunicacion entre Apps

| De → A | Mecanismo | Datos |
|--------|-----------|-------|
| Client → Firestore | `addDoc()` | Crea orders + order_items |
| Firestore → Cloud Functions | Triggers `onWrite` | onOrderCreated, onOrderItemUpdated |
| Cloud Functions → RTDB | Admin SDK `set()` | kds_tickets para cocina |
| RTDB → Kitchen | `onValue` stream | Tickets en tiempo real |
| Kitchen → Firestore | `updateDoc()` | Actualiza status de items |
| Firestore → Client | `onSnapshot` listener | Tracking de orden en vivo |
| Firestore → Admin | `onSnapshot` listener | Lista de ordenes en vivo |
| Admin → Firestore | `updateDoc()` | Cambia status de orden |
| QR (impreso) → Client | Deep link / URL | orgId, branchId, tableId |

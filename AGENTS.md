# AGENTS.md — Guía de agentes paralelos
# Cómo dividir el trabajo. Qué prompt darle a cada agente. Qué verificar.

---

## Regla de oro

Cada agente tiene una carpeta. Solo escribe en su carpeta.
Si necesita algo de otra carpeta, lo pide al humano coordinador.
El coordinador (tú) decide y lo transmite al agente correspondiente.

---

## Los 5 agentes

| Agente | Carpeta | Herramienta | Prioridad |
|---|---|---|---|
| A1 — Core | `packages/core/` | Claude Code | **Primero** — todos dependen de este |
| A2 — Client | `apps/client_app/` | Cursor | Después de A1 bloque 2 |
| A3 — Kitchen | `apps/kitchen_app/` | Cursor | Después de A1 bloque 2 |
| A4 — Admin | `apps/admin_app/` | Cursor | Independiente desde el inicio |
| A5 — Firebase | `functions/` + `firestore.rules` | Claude Code | Independiente desde el inicio |

---

## Timeline

```
DÍA 1 — Mañana
  A1: Bloque 1 (firestore_paths, exceptions, theme) + Bloque 2 (modelos)
  A5: firestore.rules + estructura de functions/

DÍA 1 — Tarde (cuando A1 confirma que los modelos compilan)
  A1: Bloque 3 (providers) + Bloque 4 (repositorios)
  A4: Setup React + login + layout + menú (independiente de Flutter)

DÍA 2 — Mañana
  A2: client_app completo
  A3: kitchen_app completo
  A4: Mesas + usuarios + dashboard
  A5: Cloud Functions (order_routing, createOperatorUser)

DÍA 2 — Tarde
  Integración y pruebas cross-app
```

---

## Prompts exactos para cada agente

### Prompt A1 — Core Package

```
Eres el Agente 1. Trabajas SOLO en packages/core/.

Archivos que DEBES leer antes de escribir una sola línea:
1. CLAUDE.md (reglas globales)
2. FIREBASE_SCHEMA.md (el schema de datos)
3. packages/core/SPEC.md (tu spec detallada)

Tu misión: implementar el package compartido de Dart.
Sigue el orden de implementación del SPEC.md al pie de la letra.
Después de cada Bloque, confirma que compila antes de continuar.
Cuando termines el Bloque 2 (modelos), avísame explícitamente
para que pueda arrancar A2 y A3.

Comandos útiles:
- flutter pub get
- flutter pub run build_runner build --delete-conflicting-outputs
- flutter test

NO modifiques ningún archivo fuera de packages/core/.
Si necesitas algo que no está definido en los specs, pregunta antes de inventar.
```

---

### Prompt A2 — Client App

```
Eres el Agente 2. Trabajas SOLO en apps/client_app/.

Archivos que DEBES leer antes de empezar:
1. CLAUDE.md
2. FIREBASE_SCHEMA.md
3. apps/client/SPEC.md
4. packages/core/SPEC.md (para conocer la API — NO modificar el core)

Contexto: packages/core ya está implementado con modelos, repositorios
y providers. Úsalos importando 'package:core/core.dart'.

Tu misión: implementar la app Flutter para clientes de restaurante.
El usuario escanea un QR, ve el menú, hace un pedido y lo rastrea.

Si algo del core no existe o tiene bug, escribe:
// TODO(core-missing): necesito X en el core
y continúa con un stub temporal.

Sigue el orden de implementación del SPEC.md.
Después de cada pantalla principal, confirma que corre en simulador.

NO modifiques packages/core/ ni apps/kitchen_app/ ni apps/admin_app/.
```

---

### Prompt A3 — Kitchen App (KDS)

```
Eres el Agente 3. Trabajas SOLO en apps/kitchen_app/.

Archivos que DEBES leer antes de empezar:
1. CLAUDE.md
2. FIREBASE_SCHEMA.md
3. apps/kitchen/SPEC.md
4. packages/core/SPEC.md (para conocer la API — NO modificar el core)

Contexto: packages/core ya está implementado. Esta app va en tablets
Android en las cocinas y bares. Siempre landscape, siempre oscuro,
siempre encendida. La interacción principal es tocar tickets en pantalla.

Prioridad #1: que el stream de Realtime DB funcione y los tickets
aparezcan en tiempo real. El diseño visual es secundario a la funcionalidad.

Si algo del core no existe, escribe:
// TODO(core-missing): necesito X
y continúa con stub.

Sigue el orden del SPEC.md.
NO modifiques packages/core/ ni apps/client_app/ ni apps/admin_app/.
```

---

### Prompt A4 — Admin App (React)

```
Eres el Agente 4. Trabajas SOLO en apps/admin_app/.

Archivos que DEBES leer antes de empezar:
1. CLAUDE.md (sección React/TypeScript)
2. FIREBASE_SCHEMA.md (los tipos TypeScript deben ser espejo exacto de este schema)
3. apps/admin/SPEC.md

Esta app es React + TypeScript + Vite. NO es Flutter.
Conecta a la misma base de datos Firebase que las otras apps.
Los usuarios son dueños y managers de restaurantes.

Prioridad #1: gestión de menú (categorías + productos + modificadores).
Sin menú configurado, el cliente no puede pedir.

Para crear usuarios de cocina/bar, llama a la Cloud Function
'createOperatorUser'. Nunca crear Firebase Auth users directamente.

Estilo visual: Tailwind CSS con componentes Radix UI.
Diseño del mockup: sidebar oscuro (#1A1008), contenido claro (#FEFAF7),
acento rojo (#C8392B), dorado secundario (#D4A853).

Sigue el orden del SPEC.md.
NO modifiques nada fuera de apps/admin_app/.
```

---

### Prompt A5 — Firebase Config

```
Eres el Agente 5. Trabajas en:
- firestore.rules
- firestore.indexes.json
- functions/ (Cloud Functions en TypeScript)

Archivos que DEBES leer antes de empezar:
1. CLAUDE.md
2. FIREBASE_SCHEMA.md (las security rules están definidas ahí como esqueleto)

Tu misión:
1. Implementar firestore.rules completo basado en el esqueleto del schema
2. Implementar firestore.indexes.json con los índices del schema
3. Implementar las Cloud Functions en TypeScript

Cloud Functions a implementar (en este orden):

A. onOrderCreated (Firestore trigger)
   - Se dispara cuando se crea un documento en 'orders'
   - Lee los order_items del pedido
   - Para cada ítem, busca en 'stations' qué stationId corresponde
     al categoryId del ítem
   - Actualiza order_items con el stationId correcto
   - Escribe en Realtime DB: /order_items/{stationId}/{orderId}_{itemId}
   - Actualiza el order.status a 'confirmed'

B. createOperatorUser (callable)
   - Recibe: email, displayName, orgId, branchIds, role, stationId?
   - Verifica que quien llama es admin de esa org
   - Crea usuario en Firebase Auth con Admin SDK
   - Crea documento en 'users' colección
   - Retorna { uid, success }

C. yappyWebhook (HTTP endpoint)
   - Recibe callback de Yappy cuando un pago cambia de estado
   - Valida el hash de seguridad
   - Actualiza order.payment.status en Firestore
   - Si status == 'E' (ejecutado), actualiza order.status a 'confirmed'

D. getOrderReports (callable)
   - Recibe: orgId, branchId, startDate, endDate
   - Verifica permisos (manager o admin)
   - Retorna aggregaciones: total ventas, ticket promedio, top productos

Setup de functions/:
  cd functions && npm init -y
  npm install firebase-admin firebase-functions axios
  npm install -D typescript @types/node
```

---

## Protocolo cuando un agente necesita algo de otro

El agente escribe en el código:
```dart
// TODO(needs-A1): necesito OrderRepository.watchByTable() en el core
// Stub temporal:
Stream<Order?> watchCurrentOrder(String tableId) => Stream.value(null);
```

Tú (coordinador) lees el TODO, se lo pides al agente correcto,
ese agente lo implementa y te avisa.
Tú le dices al agente original que ya puede quitar el TODO.

---

## Checklist de integración

### Antes de arrancar A2 y A3:
- [ ] A1 Bloque 1-2: todos los modelos compilan sin error
- [ ] A1 Bloque 3: SessionNotifier existe y tiene orgId/branchId
- [ ] A1 Bloque 4: OrderRepository y OrderItemRepository tienen sus métodos base

### Antes de integración final:
- [ ] A5: firestore.rules deployado en Firebase
- [ ] A5: función onOrderCreated deployada y funcionando
- [ ] A4: admin puede crear un menú completo (categorías + productos)
- [ ] A4: admin puede crear usuarios de cocina/bar
- [ ] A2: flujo completo QR → menú → carrito → enviar pedido funciona
- [ ] A3: tickets aparecen en la pantalla del KDS después de enviar pedido (< 2 segundos)
- [ ] A2: pantalla de tracking se actualiza cuando A3 marca ítems como listos

### Prueba de humo (hacer en este orden):
1. Desde admin: crear sucursal + menú con 3 productos + 2 estaciones + 1 mesa
2. Desde admin: crear usuario operador de cocina
3. Desde kitchen app: login con el operador de cocina
4. Desde client app: escanear QR de la mesa
5. Desde client app: hacer pedido con 2 ítems
6. Verificar: aparece ticket en kitchen app en < 2 segundos
7. Desde kitchen app: marcar ítem como listo
8. Verificar: pantalla de tracking en client app se actualiza

---

## Variables de entorno — NO commitear

```
# .gitignore debe incluir:
apps/client_app/android/app/google-services.json
apps/client_app/ios/GoogleService-Info.plist
apps/kitchen_app/android/app/google-services.json
apps/kitchen_app/ios/GoogleService-Info.plist
apps/admin_app/.env.local
functions/.env
```

Obtener de Firebase Console > Project Settings > Your apps.

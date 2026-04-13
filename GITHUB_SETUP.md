# GITHUB_SETUP.md
# Instrucciones para Claude Code — Crear sprint planning en GitHub
#
# AGENTE: Lee este archivo completo antes de ejecutar cualquier acción.
# REPO:   aiudalabs/restaurant-os
# TOOL:   GitHub MCP (debe estar conectado)
#
# ORDEN DE EJECUCIÓN:
#   1. Crear todos los labels
#   2. Crear todos los milestones
#   3. Crear todos los issues (en el orden del array)
#
# NO crear issues en paralelo — hacerlo secuencialmente para respetar el rate limit.
# Si un label o milestone ya existe, ignorar el error y continuar.

---

## JSON de configuración completa

```json
{
  "repo": "aiudalabs/restaurant-os",

  "labels": [
    { "name": "app:core",     "color": "7F77DD", "description": "Dart shared package" },
    { "name": "app:client",   "color": "C8392B", "description": "Flutter client app" },
    { "name": "app:kitchen",  "color": "D4A853", "description": "Flutter KDS app" },
    { "name": "app:admin",    "color": "1D9E75", "description": "React admin app" },
    { "name": "app:firebase", "color": "378ADD", "description": "Cloud Functions & rules" },
    { "name": "type:setup",   "color": "D3D1C7", "description": "Project setup" },
    { "name": "type:model",   "color": "D3D1C7", "description": "Data models" },
    { "name": "type:repo",    "color": "D3D1C7", "description": "Repository layer" },
    { "name": "type:provider","color": "D3D1C7", "description": "Riverpod providers" },
    { "name": "type:service", "color": "D3D1C7", "description": "Business services" },
    { "name": "type:feature", "color": "9FE1CB", "description": "New feature" },
    { "name": "type:ui",      "color": "9FE1CB", "description": "UI component" },
    { "name": "type:auth",    "color": "9FE1CB", "description": "Authentication" },
    { "name": "type:realtime","color": "9FE1CB", "description": "Realtime / streams" },
    { "name": "type:form",    "color": "9FE1CB", "description": "Form / validation" },
    { "name": "type:test",    "color": "FAC775", "description": "Tests" },
    { "name": "type:rules",   "color": "FAC775", "description": "Security rules" },
    { "name": "type:trigger", "color": "FAC775", "description": "Cloud Function trigger" },
    { "name": "blocker",      "color": "E24B4A", "description": "Other issues depend on this" },
    { "name": "priority:high","color": "E24B4A", "description": "High priority" }
  ],

  "milestones": [
    { "title": "Core — Sprint 1: Fundamentos",        "description": "utils, modelos, enums",                             "due_on": null },
    { "title": "Core — Sprint 2: Repositorios",       "description": "providers base + repositorios Firebase",             "due_on": null },
    { "title": "Core — Sprint 3: Servicios",          "description": "servicios, tema, barrel export, tests",              "due_on": null },
    { "title": "Firebase — Sprint 1: Rules & Setup",  "description": "security rules, indexes, setup functions/",          "due_on": null },
    { "title": "Firebase — Sprint 2: onOrderCreated", "description": "la cloud function más crítica del sistema",           "due_on": null },
    { "title": "Firebase — Sprint 3: Callables",      "description": "createOperatorUser, yappyWebhook, getReports",        "due_on": null },
    { "title": "Client — Sprint 1: Menú",             "description": "splash, sesión de mesa, navegación del menú",         "due_on": null },
    { "title": "Client — Sprint 2: Carrito",          "description": "carrito, confirmación, envío del pedido",             "due_on": null },
    { "title": "Client — Sprint 3: Tracking",         "description": "seguimiento en tiempo real del pedido",               "due_on": null },
    { "title": "Kitchen — Sprint 1: KDS Base",        "description": "setup landscape, login, ticket card",                 "due_on": null },
    { "title": "Kitchen — Sprint 2: Realtime",        "description": "stream Realtime DB, actualización de estados",        "due_on": null },
    { "title": "Kitchen — Sprint 3: Polish",          "description": "sonidos, recall, settings",                           "due_on": null },
    { "title": "Admin — Sprint 1: Setup",             "description": "Vite + React + auth + layout",                       "due_on": null },
    { "title": "Admin — Sprint 2: Menú",              "description": "gestión completa del menú — PRIORIDAD 1",             "due_on": null },
    { "title": "Admin — Sprint 3: Mesas y Usuarios",  "description": "mesas, QR, usuarios, estaciones",                    "due_on": null },
    { "title": "Admin — Sprint 4: Dashboard",         "description": "dashboard en tiempo real + historial de pedidos",     "due_on": null },
    { "title": "Admin — Sprint 5: Reportes",          "description": "reportes, configuración, integración Yappy",          "due_on": null }
  ],

  "issues": [

    {
      "title": "[Core S1] Setup pubspec.yaml + estructura de carpetas",
      "body": "## Tarea\nCrear `packages/core/pubspec.yaml` con todas las dependencias de `CLAUDE.md`.\nCrear la estructura de carpetas completa vacía según `packages/core/SPEC.md`.\n\n## Criterio de aceptación\n- `flutter pub get` corre sin errores\n- Estructura de carpetas creada\n\n## Puntos: 1\n## Agente: A1 — Core",
      "labels": ["app:core", "type:setup"],
      "milestone": "Core — Sprint 1: Fundamentos"
    },
    {
      "title": "[Core S1] firestore_paths.dart + app_exceptions.dart",
      "body": "## Tarea\nImplementar `FirestorePaths` con todas las constantes del schema (ver `FIREBASE_SCHEMA.md`).\nImplementar `AppException` sealed class con `fromFirebase` factory.\n\n## Criterio de aceptación\n- Todas las rutas del schema están en FirestorePaths\n- AppException cubre permission-denied, not-found, unavailable, already-exists\n- Compila sin errores\n\n## Notas\n⚠️ Este archivo es crítico — nadie más puede construir strings de ruta sin él.\n\n## Puntos: 1\n## Agente: A1 — Core",
      "labels": ["app:core", "type:setup", "blocker"],
      "milestone": "Core — Sprint 1: Fundamentos"
    },
    {
      "title": "[Core S1] Modelos Freezed: AppUser, OrderItem, Order",
      "body": "## Tarea\nImplementar con Freezed + `fromFirestore`/`toFirestore`:\n- `AppUser` + enum `UserRole`\n- `OrderItem` + enum `ItemStatus`\n- `Order` + enum `OrderStatus` + `PaymentInfo`\n\n## Criterio de aceptación\n- Enums tienen conversión `snake_case ↔ camelCase` correcta\n- `fromFirestore` maneja Timestamps correctamente\n- `build_runner` corre sin errores\n- Los 3 modelos serializan/deserializan correctamente\n\n## Código de referencia\nVer ejemplos completos en `packages/core/SPEC.md`\n\n## Puntos: 2\n## Agente: A1 — Core",
      "labels": ["app:core", "type:model"],
      "milestone": "Core — Sprint 1: Fundamentos"
    },
    {
      "title": "[Core S1] Modelos Freezed: Product, Category, Menu, Branch, Organization, Station, Table",
      "body": "## Tarea\nImplementar el resto de modelos con Freezed:\n- `Product` (con `ModifierGroup` y `ModifierOption` embebidos)\n- `Category`\n- `Menu`\n- `Branch`\n- `Organization`\n- `Station`\n- `TableModel` (llamar `table_model.dart` para no chocar con `Table` de Dart)\n\n## Criterio de aceptación\n- Todos compilan\n- Todos tienen `fromFirestore` y `toFirestore`\n- `build_runner build` sin errores\n\n## Puntos: 2\n## Agente: A1 — Core",
      "labels": ["app:core", "type:model"],
      "milestone": "Core — Sprint 1: Fundamentos"
    },

    {
      "title": "[Core S2] firebase_providers.dart + session_provider.dart + auth_provider.dart",
      "body": "## Tarea\nProviders Riverpod base:\n- `firebaseProviders.dart`: instancias de Firestore, Auth, RealtimeDB con `keepAlive: true`\n- `sessionProvider.dart`: `UserSession` freezed + `SessionNotifier` con helpers `orgId`, `branchId`, `isAdmin`\n- `authProvider.dart`: stream de `FirebaseAuth.authStateChanges()`\n\n## Criterio de aceptación\n- SessionNotifier tiene setSession() y clearSession()\n- authProvider expone AsyncValue<User?>\n- build_runner genera el código correctamente\n\n## Notas\n⚠️ Desbloquea que A2 (client) y A3 (kitchen) puedan arrancar.\n\n## Puntos: 1\n## Agente: A1 — Core",
      "labels": ["app:core", "type:provider", "blocker"],
      "milestone": "Core — Sprint 2: Repositorios"
    },
    {
      "title": "[Core S2] OrderRepository + OrderItemRepository",
      "body": "## Tarea\n**OrderRepository:**\n- `watchActive({orgId, branchId})` → Stream de pedidos con status confirmed/in_preparation/ready\n- `create(order)` → String (ID del nuevo pedido)\n- `updateStatus(orderId, status)`\n\n**OrderItemRepository:**\n- `watchByStation({stationId, orgId, branchId})` → Stream de ítems de una estación\n- `updateItemStatus(itemId, status)`\n- `getByOrder(orderId)` → Future<List<OrderItem>>\n\n## Criterio de aceptación\n- Usar `withConverter` para tipado\n- Atrapar `FirebaseException` → `AppException`\n- Tests con `fake_cloud_firestore`\n\n## Puntos: 2\n## Agente: A1 — Core",
      "labels": ["app:core", "type:repo", "blocker"],
      "milestone": "Core — Sprint 2: Repositorios"
    },
    {
      "title": "[Core S2] MenuRepository",
      "body": "## Tarea\n- `watchCategories(menuId)` → Stream ordenado por sortOrder\n- `watchProducts(categoryId)` → Stream ordenado por sortOrder\n- `createCategory(data)`, `updateCategory(id, data)`\n- `createProduct(data)`, `updateProduct(id, data)`, `toggleProduct(id, isActive)`\n- `getMenuByBranch(branchId)` → Future<Menu?>\n\n## Criterio de aceptación\n- Filtros por `isActive` donde corresponda\n- withConverter en todas las queries\n\n## Puntos: 2\n## Agente: A1 — Core",
      "labels": ["app:core", "type:repo"],
      "milestone": "Core — Sprint 2: Repositorios"
    },
    {
      "title": "[Core S2] TableRepository + StationRepository + UserRepository",
      "body": "## Tarea\n**TableRepository:** `watchByBranch(branchId)`, `create`, `update`, `setCurrentOrder(tableId, orderId?)`\n\n**StationRepository:** `watchByBranch(branchId)`, `create`, `update`, `updateFcmTokens(stationId, tokens)`\n\n**UserRepository:** `getUser(uid)`, `createUser(data)`, `updateUser(uid, data)`, `watchByOrg(orgId)`, `setActive(uid, isActive)`\n\n## Criterio de aceptación\n- Todos con withConverter\n- UserRepository NO crea usuarios en Firebase Auth (eso es Cloud Function)\n\n## Puntos: 2\n## Agente: A1 — Core",
      "labels": ["app:core", "type:repo"],
      "milestone": "Core — Sprint 2: Repositorios"
    },

    {
      "title": "[Core S3] app_theme.dart + app_colors.dart + extensions.dart",
      "body": "## Tarea\n- `AppTheme.light()` y `AppTheme.dark()` con `colorSchemeSeed: Color(0xFFC8392B)` y `MaterialTapTargetSize.padded`\n- `app_colors.dart`: constantes de color de la marca\n- `extensions.dart`: formateo de precios (`$12.50`), formateo de fechas, `Duration.display()`\n\n## Puntos: 1\n## Agente: A1 — Core",
      "labels": ["app:core", "type:ui"],
      "milestone": "Core — Sprint 3: Servicios"
    },
    {
      "title": "[Core S3] OrderRoutingService + RealtimeSyncService + core.dart barrel",
      "body": "## Tarea\n**OrderRoutingService:** dado un `categoryId` y lista de estaciones, retorna el `stationId` correcto.\n\n**RealtimeSyncService:** \n- `writeItemStatus(stationId, orderId, itemId, status)` → escribe en Realtime DB\n- `watchStationItems(stationId)` → Stream desde Realtime DB\n\n**core.dart:** barrel export de todos los archivos públicos del package.\n\n## Puntos: 1\n## Agente: A1 — Core",
      "labels": ["app:core", "type:service"],
      "milestone": "Core — Sprint 3: Servicios"
    },
    {
      "title": "[Core S3] Tests unitarios mínimos del core",
      "body": "## Tarea\nEscribir tests con `fake_cloud_firestore` y `mocktail`:\n1. `OrderRepository`: watchActive retorna solo pedidos activos, create asigna un ID\n2. `OrderStatus` enum: conversión a/desde snake_case correcta\n3. `AppException.fromFirebase`: cubre los 4 casos principales\n\n## Criterio de aceptación\n- `flutter test` pasa sin errores\n\n## Puntos: 1\n## Agente: A1 — Core",
      "labels": ["app:core", "type:test"],
      "milestone": "Core — Sprint 3: Servicios"
    },

    {
      "title": "[Firebase S1] firestore.rules completo",
      "body": "## Tarea\nImplementar `firestore.rules` basado en el esqueleto de `FIREBASE_SCHEMA.md`.\n\n## Reglas a cubrir\n- `organizations`: solo miembros de la org\n- `branches`: miembros con acceso a esa sucursal\n- `categories`, `products`: read para cualquier autenticado, write para manager+\n- `orders`: clientes pueden crear (anon auth), operadores leen su sucursal\n- `order_items`: operador puede actualizar solo los ítems de su estación\n- `users`: solo admins gestionan, el usuario puede leer el suyo propio\n- `integrations`: SIEMPRE `allow read, write: if false;`\n\n## Criterio de aceptación\n- Deploy exitoso a Firebase (`firebase deploy --only firestore:rules`)\n- Tests con Firebase Rules Playground\n\n## Puntos: 2\n## Agente: A5 — Firebase",
      "labels": ["app:firebase", "type:rules"],
      "milestone": "Firebase — Sprint 1: Rules & Setup"
    },
    {
      "title": "[Firebase S1] firestore.indexes.json + Setup functions/",
      "body": "## Tarea\n**Indexes:** crear `firestore.indexes.json` con todos los índices de `FIREBASE_SCHEMA.md`.\n\n**Functions setup:**\n```bash\ncd functions\nnpm init -y\nnpm install firebase-admin firebase-functions axios\nnpm install -D typescript @types/node ts-node\n```\nConfigurar `tsconfig.json` para compilar a `lib/`.\nCrear estructura: `functions/src/index.ts` como entry point.\n\n## Criterio de aceptación\n- `firebase deploy --only firestore:indexes` exitoso\n- `cd functions && npm run build` compila sin errores\n\n## Puntos: 2\n## Agente: A5 — Firebase",
      "labels": ["app:firebase", "type:setup"],
      "milestone": "Firebase — Sprint 1: Rules & Setup"
    },

    {
      "title": "[Firebase S2] onOrderCreated — asignación de stationId",
      "body": "## Tarea\nCloud Function Firestore trigger en `orders/{orderId}`.\n\n**Lógica:**\n1. Leer todos los `order_items` del `orderId` recién creado\n2. Leer las `stations` de la sucursal (`branchId`)\n3. Para cada `order_item`: encontrar la estación cuyo `categoryIds` contiene el `categoryId` del ítem\n4. Actualizar el `order_item` con el `stationId` correcto\n5. Si ninguna estación coincide: asignar a la primera estación activa como fallback\n\n## Criterio de aceptación\n- Después de crear un pedido, todos los order_items tienen stationId asignado\n- Batch update (no N updates individuales)\n\n## Puntos: 3\n## Agente: A5 — Firebase",
      "labels": ["app:firebase", "type:trigger", "blocker"],
      "milestone": "Firebase — Sprint 2: onOrderCreated"
    },
    {
      "title": "[Firebase S2] onOrderCreated — escritura en Realtime DB + FCM",
      "body": "## Tarea\nContinuación de la Cloud Function `onOrderCreated` después de asignar stationIds.\n\n**Lógica:**\n1. Para cada order_item ya con stationId: escribir en Realtime DB:\n   ```\n   /order_items/{stationId}/{orderId}_{itemId} = {\n     status: 'queued',\n     tableNumber: string,\n     productName: string,\n     quantity: number,\n     modifiersSummary: string[],\n     sentToStationAt: ServerValue.TIMESTAMP\n   }\n   ```\n2. Actualizar `order.status` a `'confirmed'` en Firestore\n3. Enviar notificación FCM a los tokens de cada estación afectada\n\n## Criterio de aceptación\n- El KDS (kitchen_app) recibe el ticket en < 2 segundos\n- order.status cambia a 'confirmed'\n\n## Puntos: 3\n## Agente: A5 — Firebase",
      "labels": ["app:firebase", "type:trigger", "blocker"],
      "milestone": "Firebase — Sprint 2: onOrderCreated"
    },

    {
      "title": "[Firebase S3] createOperatorUser — callable function",
      "body": "## Tarea\nCloud Function callable que crea usuarios de cocina/bar.\n\n**Input:** `{ email, displayName, orgId, branchIds, role, stationId? }`\n\n**Lógica:**\n1. Verificar que el caller es `admin` de esa org (leer su AppUser)\n2. Crear usuario en Firebase Auth con Admin SDK: `admin.auth().createUser({email, displayName, password: auto-generated})`\n3. Enviar email de verificación/bienvenida\n4. Crear documento en colección `users` con todos los campos\n5. Retornar `{ uid, success: true }`\n\n**Manejo de errores:** si el email ya existe, retornar error descriptivo.\n\n## Puntos: 2\n## Agente: A5 — Firebase",
      "labels": ["app:firebase", "type:trigger"],
      "milestone": "Firebase — Sprint 3: Callables"
    },
    {
      "title": "[Firebase S3] yappyWebhook + getOrderReports",
      "body": "## Tarea\n**yappyWebhook** (HTTP endpoint):\n1. Recibir callback de Yappy con `{ orderId, status, confirmationNumber, hash }`\n2. Validar hash HMAC-SHA256 con la secretKey de la sucursal (leer de `integrations/`)\n3. Actualizar `order.payment.status` en Firestore según status: E=paid, R=rejected, C=cancelled\n4. Si status='E': actualizar `order.status` a 'closed'\n5. Retornar 200 OK\n\n**getOrderReports** (callable):\n- Input: `{ orgId, branchId, startDate, endDate }`\n- Verificar que caller es manager+ de la org\n- Retornar: total ventas, count pedidos, ticket promedio, top 10 productos\n\n## Puntos: 2\n## Agente: A5 — Firebase",
      "labels": ["app:firebase", "type:trigger"],
      "milestone": "Firebase — Sprint 3: Callables"
    },

    {
      "title": "[Client S1] Setup pubspec + main.dart + app.dart + router.dart",
      "body": "## Tarea\n- `pubspec.yaml` con dependencias de `apps/client/SPEC.md`\n- `resolution: workspace` en pubspec\n- Bundle ID: `com.aiudalabs.restaurantos.client`\n- `main.dart`: Firebase init + ProviderScope\n- `app.dart`: MaterialApp.router con AppTheme del core\n- `router.dart`: GoRouter con todas las rutas (pantallas vacías están bien)\n\n## Rutas a definir\n`/` → SplashScreen, `/error` → ErrorScreen, `/menu` → MenuScreen,\n`/category/:id`, `/product/:id`, `/cart`, `/tracking/:orderId`\n\n## Puntos: 1\n## Agente: A2 — Client",
      "labels": ["app:client", "type:setup"],
      "milestone": "Client — Sprint 1: Menú"
    },
    {
      "title": "[Client S1] Anon Auth + TableSession + SplashScreen",
      "body": "## Tarea\n**anon_auth.dart:** Firebase `signInAnonymously()` al iniciar (reutilizar sesión existente).\n\n**table_session.dart:** Provider `TableSessionNotifier` con `{ orgId, branchId, tableId, tableNumber, menuId }`\n\n**SplashScreen:** \n1. Parsear `?org=&branch=&table=` de la URL de entrada\n2. Validar mesa en Firestore (doc existe y `isActive == true`)\n3. Si inválida → `/error?msg=mesa_inactiva`\n4. Si válida → cargar Branch para obtener `menuId` → setear TableSession → navegar a `/menu`\n\n## Puntos: 2\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature", "type:auth"],
      "milestone": "Client — Sprint 1: Menú"
    },
    {
      "title": "[Client S1] MenuScreen + CategoryScreen + ProductDetailScreen",
      "body": "## Tarea\n**MenuScreen:** Hero con nombre del restaurante y número de mesa. Grid 2 columnas de `CategoryCard` con `CachedNetworkImage`. CartFAB sticky (total + contador).\n\n**CategoryScreen:** Lista de `ProductCard` con foto, nombre, descripción corta, precio. Badge 'Agotado' si `isActive == false`.\n\n**ProductDetailScreen:**\n- Hero animation desde card\n- `ModifierSelector`: radio para `multiSelect=false`, checkboxes para `true`\n- Validación: grupos `required` deben tener selección antes de agregar\n- Precio calculado en tiempo real con modificadores\n- Campo de instrucciones especiales (máx 200 chars)\n- Botón 'Agregar al carrito' sticky\n\n## Criterio de aceptación\n- Imágenes SIEMPRE con `CachedNetworkImage` + placeholder\n- Nunca `Image.network` directo\n\n## Puntos: 3\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature", "type:ui"],
      "milestone": "Client — Sprint 1: Menú"
    },

    {
      "title": "[Client S2] CartNotifier — lógica completa del carrito",
      "body": "## Tarea\nImplementar `CartNotifier` con `CartState` (Freezed):\n- `addItem()`: si mismo producto + mismos modificadores → incrementar cantidad\n- `removeItem(index)`\n- `updateQuantity(index, qty)`: si qty <= 0, remover\n- `setNotes(notes)`\n- `clear()`\n\n`CartFAB` visible en MenuScreen y CategoryScreen mostrando total y conteo.\n\n## Criterio de aceptación\n- El carrito persiste durante la sesión (desaparece si cierran la app — es correcto)\n- `keepAlive: false` en el provider\n\n## Puntos: 2\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature"],
      "milestone": "Client — Sprint 2: Carrito"
    },
    {
      "title": "[Client S2] CartScreen — resumen y confirmación",
      "body": "## Tarea\n- Lista de ítems con swipe to delete\n- Cada ítem: foto emoji, nombre, modificadores seleccionados, qty controls, precio\n- Nota general del pedido (textarea opcional)\n- Resumen: subtotal, ITBMS (7%), total\n- AlertDialog de confirmación antes de enviar\n- Botón 'Enviar pedido' se deshabilita durante el submit y muestra `CircularProgressIndicator`\n\n## Puntos: 2\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature", "type:ui"],
      "milestone": "Client — Sprint 2: Carrito"
    },
    {
      "title": "[Client S2] Batch write: Order + OrderItems en Firestore",
      "body": "## Tarea\nImplementar `submitOrder()` con `WriteBatch`:\n1. Crear documento `Order` con todos los campos del schema\n2. Crear N documentos `OrderItem` (uno por ítem del carrito)\n3. `stationId` queda vacío string — la Cloud Function `onOrderCreated` lo rellena\n4. Commit atómico del batch\n5. Al éxito: `cartNotifier.clear()` + navegar a `/tracking/{orderId}`\n6. Al error: mostrar SnackBar con mensaje y re-habilitar botón\n\n## Dependencia\n⚠️ Requiere que Firebase S2 (onOrderCreated) esté deployado para que los tickets lleguen al KDS.\n\n## Puntos: 3\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature"],
      "milestone": "Client — Sprint 2: Carrito"
    },
    {
      "title": "[Client S2] Banner offline + manejo de errores",
      "body": "## Tarea\n- Detectar conectividad y mostrar banner amarillo 'Sin conexión' en el top\n- Firestore offline cache funciona automáticamente (no hacer nada especial)\n- ErrorScreen con mensaje descriptivo para: mesa inválida, error de red, error de Firebase\n- Manejar caso de QR sin parámetros válidos en la URL\n\n## Puntos: 1\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature"],
      "milestone": "Client — Sprint 2: Carrito"
    },

    {
      "title": "[Client S3] TrackingScreen — Realtime DB stream",
      "body": "## Tarea\nEscuchar `/order_items/{stationId}/` en Realtime DB y filtrar por `orderId`.\n\n**UI:**\n- Stepper horizontal: Recibido → Preparando → Listo → Entregado\n- Lista de ítems con estado individual: ⏳ En preparación / ✅ Listo\n- ETA estimada (tiempo desde que se envió el pedido)\n- Actualización automática sin pull-to-refresh\n- El stream debe cancelarse en `dispose`\n\n## Criterio de aceptación\n- El estado se actualiza cuando el operador de cocina toca el ítem en kitchen_app\n- Sin delay perceptible (< 1 segundo)\n\n## Puntos: 2\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature", "type:realtime"],
      "milestone": "Client — Sprint 3: Tracking"
    },
    {
      "title": "[Client S3] Animación 'pedido listo' + botón agregar más ítems",
      "body": "## Tarea\n- Cuando TODOS los ítems del pedido están en `status: 'done'`: mostrar vista de celebración (confetti o animación de check)\n- Botón 'Agregar más ítems': navega a `/menu` manteniendo el `orderId` activo en la sesión\n- Al volver al menú con un pedido abierto: indicar en el FAB que hay un pedido activo ('Agregar a pedido #047')\n- Deshabilitar enviar nuevo pedido si `table.currentOrderId != null`\n\n## Puntos: 2\n## Agente: A2 — Client",
      "labels": ["app:client", "type:feature"],
      "milestone": "Client — Sprint 3: Tracking"
    },

    {
      "title": "[Kitchen S1] Setup + main.dart con landscape permanente y WakeLock",
      "body": "## Tarea\n- `pubspec.yaml` con dependencias de `apps/kitchen/SPEC.md`\n- `resolution: workspace`\n- Bundle ID: `com.aiudalabs.restaurantos.kitchen`\n- `main.dart`:\n  ```dart\n  await SystemChrome.setPreferredOrientations([landscapeLeft, landscapeRight]);\n  await WakelockPlus.enable();\n  ```\n- Tema oscuro por defecto\n- Router con rutas: `/login` y `/kds`\n\n## Puntos: 1\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:setup"],
      "milestone": "Kitchen — Sprint 1: KDS Base"
    },
    {
      "title": "[Kitchen S1] LoginScreen + AuthNotifier",
      "body": "## Tarea\n**LoginScreen:** email + password. Sin registro. Diseño oscuro.\n\n**AuthNotifier:**\n1. Firebase Auth signInWithEmailAndPassword\n2. Al éxito: leer AppUser de Firestore por UID\n3. Si `stationId == null`: mostrar error 'Cuenta no configurada. Contacte al administrador'\n4. Si `stationId` existe: setear SessionNotifier + navegar a `/kds`\n5. Persistir sesión (Firebase Auth la mantiene automáticamente)\n\n## Puntos: 1\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature", "type:auth"],
      "milestone": "Kitchen — Sprint 1: KDS Base"
    },
    {
      "title": "[Kitchen S1] KdsTicket model + TicketCard + TicketItemRow",
      "body": "## Tarea\n**KdsTicket** (modelo LOCAL, no en Firestore):\n```dart\nKdsTicket { orderId, tableNumber, displayNumber, receivedAt, items }\n// computed: isAllDone, elapsed, urgency (normal/warning/critical)\n```\n\n**TicketCard:**\n- Header con mesa, número y `TicketTimerBadge`\n- Borde superior de color: verde (<8min) / ámbar (8-15min) / rojo (>15min)\n- Footer con conteo y botón de acción\n\n**TicketItemRow:**\n- Tap: queued → in_progress → done\n- Long press: done → in_progress (corrección de error)\n- Tap target MÍNIMO 64×64dp\n- Icono de estado a la derecha\n\n## Puntos: 3\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature", "type:ui"],
      "milestone": "Kitchen — Sprint 1: KDS Base"
    },

    {
      "title": "[Kitchen S2] kdsProvider — stream de Realtime DB",
      "body": "## Tarea\nEscuchar `/order_items/{stationId}/` en Realtime DB.\n\n**Transformación:**\n1. Filtrar: solo ítems con status `queued` o `in_progress`\n2. Agrupar por `orderId` para construir `KdsTicket`\n3. Ordenar: más antiguo primero (`receivedAt` ASC)\n4. Emitir lista de `KdsTicket` actualizada en tiempo real\n\n## Criterio de aceptación\n- Nuevos tickets aparecen en < 2 segundos\n- El stream se reconecta automáticamente si se pierde la conexión\n- Cancelado en dispose\n\n## Puntos: 3\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature", "type:realtime", "blocker"],
      "milestone": "Kitchen — Sprint 2: Realtime"
    },
    {
      "title": "[Kitchen S2] ItemStatusUpdater — Realtime DB + Firestore en paralelo",
      "body": "## Tarea\nAl tocar un ítem:\n1. Actualizar Realtime DB PRIMERO (velocidad ~50ms, el KDS lo refleja inmediatamente)\n2. Actualizar Firestore (fuente de verdad, ~200-300ms)\n3. Ambos con `Future.wait()` para paralelizarlos\n4. Si Realtime DB falla: mostrar error visual brevemente\n5. Si Firestore falla: retry automático 1 vez\n\nCampos a actualizar en Firestore según estado:\n- → in_progress: `startedAt: serverTimestamp()`\n- → done: `completedAt: serverTimestamp()`\n\n## Puntos: 2\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature"],
      "milestone": "Kitchen — Sprint 2: Realtime"
    },
    {
      "title": "[Kitchen S2] KdsScreen — grid de tickets landscape",
      "body": "## Tarea\n- Grid de `TicketCard`: 4 columnas en tablet 10\"\n- Si hay más de 4 tickets: scroll horizontal\n- `KdsAppBar`: nombre de estación, contador activos/pendientes/completados hoy, reloj en tiempo real\n- `TicketTimerBadge`: `Timer.periodic(60s)` recalcula `urgency` de todos los tickets\n- Estado vacío: mensaje 'Sin pedidos activos' centrado\n\n## Puntos: 2\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature", "type:ui"],
      "milestone": "Kitchen — Sprint 2: Realtime"
    },

    {
      "title": "[Kitchen S3] Alerta de nuevo ticket — visual y sonido",
      "body": "## Tarea\n- Detectar cuando el stream añade un ticket que no estaba antes (comparar longitud de lista)\n- Flash verde semitransparente de 500ms sobre toda la pantalla\n- Reproducir sonido de alerta con `just_audio` (archivo WAV en `assets/sounds/alert.wav`)\n- Volumen configurable (leer de SharedPreferences, default 80%)\n- Si el dispositivo está en silencio: solo flash visual\n\n## Puntos: 1\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature"],
      "milestone": "Kitchen — Sprint 3: Polish"
    },
    {
      "title": "[Kitchen S3] RecallDrawer — tickets completados recientes",
      "body": "## Tarea\nDrawer lateral derecho con los últimos 10 tickets completados (últimas 2 horas).\n\n**Query:** `order_items` donde `stationId == current` AND `status == done` AND `completedAt > now-2h`, ordenados por `completedAt` DESC.\n\n**Al tocar un ticket completado:**\n1. Cambiar todos sus ítems a `status: in_progress` en Realtime DB y Firestore\n2. Cerrar el drawer\n3. El ticket reaparece en la pantalla principal\n\n## Puntos: 1\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature"],
      "milestone": "Kitchen — Sprint 3: Polish"
    },
    {
      "title": "[Kitchen S3] SettingsScreen + Cerrar sesión",
      "body": "## Tarea\n**SettingsScreen** (accesible desde ícono en AppBar):\n- Slider volumen de alerta (0-100%)\n- Toggle modo oscuro/claro\n- Slider tiempo para marcar urgente (10-20 min, default 15)\n- Botón 'Cerrar sesión': `FirebaseAuth.signOut()` + limpiar SessionNotifier + navegar a login\n\nTodos los ajustes se guardan en `SharedPreferences`.\n\n## Puntos: 1\n## Agente: A3 — Kitchen",
      "labels": ["app:kitchen", "type:feature"],
      "milestone": "Kitchen — Sprint 3: Polish"
    },

    {
      "title": "[Admin S1] Vite + Tailwind + Firebase + estructura de carpetas",
      "body": "## Tarea\nSetup completo según `apps/admin/SPEC.md`:\n```bash\nnpm create vite@latest admin_app -- --template react-ts\nnpm install firebase @tanstack/react-query @tanstack/react-router\nnpm install react-hook-form zod @hookform/resolvers\nnpm install tailwindcss @tailwindcss/vite\nnpm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast\nnpm install recharts lucide-react clsx tailwind-merge date-fns\n```\n\nCrear:\n- `src/lib/firebase.ts` con variables `VITE_`\n- `src/lib/firestore-paths.ts` (espejo de FIREBASE_SCHEMA.md)\n- `src/types/` con todos los tipos TypeScript\n- `.env.local` en `.gitignore`\n\n## Puntos: 1\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:setup"],
      "milestone": "Admin — Sprint 1: Setup"
    },
    {
      "title": "[Admin S1] LoginPage + use-auth.ts",
      "body": "## Tarea\n**LoginPage:** form email + password. Redirect a `/` si ya autenticado.\n\n**use-auth.ts:**\n1. `onAuthStateChanged` de Firebase\n2. Al detectar usuario: leer AppUser de Firestore\n3. Guardar `{ uid, orgId, branchId, role }` en contexto/store de sesión\n4. Exponer: `user`, `loading`, `error`, `signOut()`\n\n## Criterio de aceptación\n- Redirect automático a `/login` si no autenticado\n- Loading state durante la verificación inicial\n\n## Puntos: 1\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature", "type:auth"],
      "milestone": "Admin — Sprint 1: Setup"
    },
    {
      "title": "[Admin S1] AdminLayout — sidebar responsive + TanStack Router",
      "body": "## Tarea\n**AdminLayout:**\n- Sidebar oscuro (#1A1008) con logo, nav items, footer con usuario\n- Desktop: sidebar expandido (220px)\n- Tablet/mobile: colapsa a iconos (56px)\n- `useNavigate` de TanStack Router para navegación activa\n\n**Router:** todas las rutas definidas (páginas vacías son ok):\n`/` → Dashboard, `/menu`, `/tables`, `/stations`, `/users`, `/orders`, `/reports`, `/settings`\n\n**Protección:** redirect a `/login` si no autenticado.\n\n## Puntos: 1\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature"],
      "milestone": "Admin — Sprint 1: Setup"
    },

    {
      "title": "[Admin S2] menu.service.ts + use-menu.ts",
      "body": "## Tarea\n**menu.service.ts:**\n- `watchCategories(menuId, cb)` → retorna unsubscribe\n- `watchProducts(categoryId, cb)` → retorna unsubscribe\n- `createCategory(data)`, `updateCategory(id, data)`\n- `createProduct(data)`, `updateProduct(id, data)`, `toggleProduct(id, isActive)`\n- `uploadProductImage(file)` → sube a Firebase Storage, retorna URL\n\n**use-menu.ts:** hooks que usan los services con cleanup en useEffect.\n\n## Criterio de aceptación\n- Los listeners se cancelan al desmontar el componente\n- Sin memory leaks\n\n## Puntos: 2\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:service"],
      "milestone": "Admin — Sprint 2: Menú"
    },
    {
      "title": "[Admin S2] MenuPage — panel dividido categorías / productos",
      "body": "## Tarea\nLayout split (ver mockup en `mockup_admin_app.html`):\n- **Izquierda (200px):** lista de categorías con emoji, nombre y conteo de productos. Item activo resaltado.\n- **Derecha:** header con nombre de categoría + botón '+ Nuevo producto'. Lista de `ProductRow`.\n\n**ProductRow:** foto/emoji, nombre, descripción, toggle activo/inactivo, precio, botones editar/eliminar.\n\n**Toggle:** actualiza `isActive` en Firestore en tiempo real.\n\n## Puntos: 2\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature", "type:ui"],
      "milestone": "Admin — Sprint 2: Menú"
    },
    {
      "title": "[Admin S2] ProductFormDialog + ModifierGroupEditor",
      "body": "## Tarea\n**ProductFormDialog** (react-hook-form + zod):\n- Nombre, descripción, precio (number), imagen (upload), tags (chips multiselect), tiempo prep\n- Validación: nombre requerido, precio > 0\n\n**ModifierGroupEditor** (dentro del form):\n- Agregar/eliminar grupos\n- Cada grupo: nombre, required (switch), multiSelect (switch)\n- Dentro de cada grupo: agregar/eliminar opciones con nombre y precio extra\n- Validación: si `required = true`, debe tener al menos 1 opción\n\n## Puntos: 2\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature", "type:form"],
      "milestone": "Admin — Sprint 2: Menú"
    },

    {
      "title": "[Admin S3] TablesPage + QrPreviewDialog",
      "body": "## Tarea\n**TablesPage:** grid de cards de mesas. Cada card: número, zona, capacidad, estado (libre/ocupada), botones ver QR y descargar.\n\n**QrPreviewDialog:**\n- Generar QR con la URL: `https://restaurantos.app/qr?org={orgId}&branch={branchId}&table={tableId}`\n- Mostrar QR grande en el dialog\n- Botón 'Descargar PNG': usar canvas para exportar\n- Botón 'Imprimir': `window.print()` con CSS `@media print`\n- Filtro por zona (tabs o dropdown)\n\n## Puntos: 2\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature"],
      "milestone": "Admin — Sprint 3: Mesas y Usuarios"
    },
    {
      "title": "[Admin S3] UsersPage + UserFormDialog",
      "body": "## Tarea\n**UsersPage:** tabla de operadores con nombre, email, rol, estación asignada, estado.\n\n**UserFormDialog:**\n- Campos: email, displayName, rol (operator/manager), sucursales (multiselect), estación (visible solo si rol=operator)\n- Al guardar: llamar Cloud Function `createOperatorUser` (NO crear Firebase Auth directamente)\n- Modo edición: solo permite cambiar rol, sucursales, estación, estado activo\n- Toggle activo/inactivo (no borra el usuario)\n\n## Dependencia\n⚠️ Requiere Firebase S3 (createOperatorUser deployada)\n\n## Puntos: 2\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature"],
      "milestone": "Admin — Sprint 3: Mesas y Usuarios"
    },
    {
      "title": "[Admin S3] StationsPage — gestión de estaciones de producción",
      "body": "## Tarea\nLista de estaciones de la sucursal. Formulario:\n- Nombre (ej: 'Cocina caliente', 'Bar', 'Postres')\n- Color (color picker — se usa en el KDS para identificación visual)\n- Categorías asignadas (multiselect de las categorías del menú)\n\n**Lógica de enrutamiento:** las categorías aquí seleccionadas determinan qué ítems llegan a esta estación en `onOrderCreated`.\n\n## Puntos: 1\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature"],
      "milestone": "Admin — Sprint 3: Mesas y Usuarios"
    },

    {
      "title": "[Admin S4] DashboardPage — stats en tiempo real + pedidos activos",
      "body": "## Tarea\n**Stat cards (fila superior):**\n- Pedidos hoy (count)\n- Ventas hoy (sum total)\n- Ticket promedio (ventas/pedidos)\n- Tiempo prep promedio (minutos)\n\n**Lista pedidos activos:** `onSnapshot` de orders con status activo. Ordenados por tiempo de espera. Columnas: mesa, ítems (resumen), estado, tiempo.\n\n**Gráfica barras (Recharts):** ventas por hora del día actual.\n\n## Criterio de aceptación\n- La lista de pedidos se actualiza sin recargar la página\n- Las stats se recalculan cuando llega un nuevo pedido\n\n## Puntos: 2\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature", "type:realtime"],
      "milestone": "Admin — Sprint 4: Dashboard"
    },
    {
      "title": "[Admin S4] OrdersPage — historial con filtros y detalle",
      "body": "## Tarea\n**OrdersPage:** tabla de pedidos con:\n- Filtros: rango de fechas, mesa, estado\n- Columnas: #, mesa, total, estado, fecha, tiempo\n- Paginación: 25 por página\n\n**OrderDetailDialog:**\n- Todos los ítems del pedido con modificadores\n- Estado de cada ítem\n- Información de pago\n- Timestamps: creado, confirmado, completado\n\n## Puntos: 1\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature"],
      "milestone": "Admin — Sprint 4: Dashboard"
    },

    {
      "title": "[Admin S5] ReportsPage — ventas y productos top",
      "body": "## Tarea\nLlamar Cloud Function `getOrderReports` con selector de rango de fechas.\n\n**Gráficas (Recharts):**\n- Barras: ventas por día del período seleccionado\n- Pie chart: distribución por categoría\n\n**Tabla top 10 productos:** nombre, cantidad vendida, ingresos totales.\n\n**Exportar CSV:** generar y descargar CSV con los datos del período.\n\n## Puntos: 1\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature"],
      "milestone": "Admin — Sprint 5: Reportes"
    },
    {
      "title": "[Admin S5] SettingsPage — sucursal, impuestos e integración Yappy",
      "body": "## Tarea\n**Sección sucursal:** nombre, dirección, teléfono, timezone, horarios de operación.\n\n**Sección fiscal:** porcentaje ITBMS, opciones de propina.\n\n**Sección Yappy:**\n- Inputs para Merchant ID y Secret Key (tipo password, no se muestra en claro)\n- Toggle sandbox/producción\n- Al guardar: escritura en colección `integrations/{branchId}_yappy`\n- Advertencia: 'Estas credenciales son confidenciales. Solo Cloud Functions las lee.'\n\n## Puntos: 1\n## Agente: A4 — Admin",
      "labels": ["app:admin", "type:feature"],
      "milestone": "Admin — Sprint 5: Reportes"
    }

  ]
}
```

---

## Prompt para Claude Code

Cuando abras Claude Code en este proyecto, dale exactamente este prompt:

```
Tienes acceso al GitHub MCP. Tu tarea es configurar el sprint planning
en el repo aiudalabs/restaurant-os.

Lee el archivo GITHUB_SETUP.md y extrae el JSON de configuración.

Ejecuta en este orden exacto — NO paralelices:

PASO 1 — Crear labels:
Por cada objeto en el array "labels", crear el label en GitHub.
Si ya existe, ignorar el error y continuar.

PASO 2 — Crear milestones:
Por cada objeto en "milestones", crear el milestone en GitHub.
Guarda un mapa de { title → milestone_number } porque lo necesitas en el paso 3.

PASO 3 — Crear issues:
Por cada objeto en "issues" (en el orden del array):
- Usar los labels del array "labels" del issue
- Buscar el milestone_number correspondiente al string "milestone" del issue
- Crear el issue con title, body, labels y milestone
- Esperar 1 segundo entre cada issue para no exceder el rate limit

Al terminar, reporta cuántos issues se crearon exitosamente.
```

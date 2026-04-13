# SPEC — apps/client_app
# Flutter app para clientes. iOS + Android.
# Lee CLAUDE.md y FIREBASE_SCHEMA.md antes de empezar.
# NO modificar packages/core. Si falta algo ahí, reportarlo.

---

## Identidad

- Usuarios: clientes sentados en una mesa del restaurante
- El cliente NO hace login. Usa Firebase Anonymous Auth.
- Punto de entrada: escaneo de QR que contiene la URL de la mesa

---

## QR Data format

El QR de cada mesa codifica esta URL:
```
https://restaurantos.app/qr?org={orgId}&branch={branchId}&table={tableId}
```

El `SplashScreen` parsea estos parámetros.

---

## Flujo completo

```
QR escaneado (URL con params)
  → SplashScreen: valida mesa en Firestore
  → Si mesa inválida: ErrorScreen
  → Si válida: guarda TableSession en provider
  → MenuScreen: carga categorías del menuId de la sucursal
  → CategoryScreen: lista productos de la categoría
  → ProductDetailScreen: selección de modificadores
  → CartScreen: resumen + confirmación
  → [se envía a Firestore + Cloud Function enruta a estaciones]
  → TrackingScreen: escucha Realtime DB en tiempo real
```

---

## pubspec.yaml

```yaml
name: client_app
description: RestaurantOS — App del cliente
publish_to: none
resolution: workspace

environment:
  sdk: '>=3.5.0 <4.0.0'
  flutter: '>=3.24.0'

dependencies:
  flutter:
    sdk: flutter
  core:
    path: ../../packages/core
  firebase_core: ^3.6.0
  firebase_auth: ^5.3.0
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  go_router: ^14.0.0
  mobile_scanner: ^5.2.0
  cached_network_image: ^3.4.0
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  riverpod_generator: ^2.4.0
  freezed: ^2.5.0
  freezed_annotation: ^2.4.0
  build_runner: ^2.4.0
  mocktail: ^1.0.0
```

---

## Estructura de archivos

```
lib/
├── main.dart
├── app.dart                         ← MaterialApp.router + ProviderScope
├── router.dart                      ← GoRouter
├── core_client/
│   ├── table_session.dart           ← provider: orgId, branchId, tableId
│   └── anon_auth.dart               ← Firebase anonymous auth
├── features/
│   ├── splash/
│   │   └── splash_screen.dart
│   ├── menu/
│   │   ├── providers/
│   │   │   ├── menu_providers.dart  ← carga menú del menuId de la branch
│   │   │   └── cart_notifier.dart   ← estado del carrito (local)
│   │   ├── models/
│   │   │   └── cart_item.dart       ← modelo local, NO en Firestore
│   │   └── screens/
│   │       ├── menu_screen.dart
│   │       ├── category_screen.dart
│   │       ├── product_detail_screen.dart
│   │       └── widgets/
│   │           ├── category_card.dart
│   │           ├── product_card.dart
│   │           ├── modifier_selector.dart
│   │           └── cart_fab.dart
│   ├── cart/
│   │   └── screens/
│   │       ├── cart_screen.dart
│   │       └── widgets/
│   │           ├── cart_item_tile.dart
│   │           └── order_summary.dart
│   └── tracking/
│       ├── providers/
│       │   └── tracking_provider.dart ← escucha Realtime DB
│       └── screens/
│           ├── tracking_screen.dart
│           └── widgets/
│               ├── status_stepper.dart
│               ├── item_status_tile.dart
│               └── order_complete_view.dart
└── shared/
    └── error_screen.dart
```

---

## Rutas (GoRouter)

```dart
// router.dart
// GoRouter lee los parámetros del QR desde el initialLocation

GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, s) => SplashScreen(
      orgId: s.uri.queryParameters['org'],
      branchId: s.uri.queryParameters['branch'],
      tableId: s.uri.queryParameters['table'],
    )),
    GoRoute(path: '/error', builder: (_, s) => ErrorScreen(
      message: s.uri.queryParameters['msg'] ?? 'Error desconocido',
    )),
    GoRoute(path: '/menu', builder: (_, __) => const MenuScreen()),
    GoRoute(path: '/category/:id', builder: (_, s) => CategoryScreen(
      categoryId: s.pathParameters['id']!,
    )),
    GoRoute(path: '/product/:id', builder: (_, s) => ProductDetailScreen(
      productId: s.pathParameters['id']!,
    )),
    GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),
    GoRoute(path: '/tracking/:orderId', builder: (_, s) => TrackingScreen(
      orderId: s.pathParameters['orderId']!,
    )),
  ],
);
```

---

## TableSession provider

```dart
// core_client/table_session.dart
@freezed
class TableSession with _$TableSession {
  const factory TableSession({
    required String orgId,
    required String branchId,
    required String tableId,
    required String tableNumber,  // para mostrar en UI
    required String menuId,       // del Branch document
  }) = _TableSession;
}

@Riverpod(keepAlive: true)
class TableSessionNotifier extends _$TableSessionNotifier {
  @override
  TableSession? build() => null;
  void setSession(TableSession s) => state = s;
}
```

---

## CartNotifier

```dart
// features/menu/providers/cart_notifier.dart

@freezed
class CartItem with _$CartItem {
  const factory CartItem({
    required String productId,
    required String productName,
    required String categoryId,
    required double unitPrice,
    @Default(1) int quantity,
    @Default([]) List<SelectedModifier> modifiers,
    String? specialInstructions,
  }) = _CartItem;

  const CartItem._();
  double get lineTotal => unitPrice * quantity +
      modifiers.fold(0.0, (s, m) => s + m.extraPrice) * quantity;
}

@freezed
class SelectedModifier with _$SelectedModifier {
  const factory SelectedModifier({
    required String groupId,
    required String optionId,
    required String name,
    required double extraPrice,
  }) = _SelectedModifier;
}

@freezed
class CartState with _$CartState {
  const factory CartState({
    @Default([]) List<CartItem> items,
    String? notes,
  }) = _CartState;

  const CartState._();
  int get itemCount => items.fold(0, (s, i) => s + i.quantity);
  double get subtotal => items.fold(0.0, (s, i) => s + i.lineTotal);
}

@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  CartState build() => const CartState();

  void addItem(CartItem item) {
    // Si ya existe el mismo producto con los mismos modificadores, incrementar
    final idx = state.items.indexWhere((i) =>
        i.productId == item.productId &&
        i.modifiers == item.modifiers);
    if (idx >= 0) {
      final updated = state.items[idx]
          .copyWith(quantity: state.items[idx].quantity + item.quantity);
      state = state.copyWith(
          items: [...state.items]..[idx] = updated);
    } else {
      state = state.copyWith(items: [...state.items, item]);
    }
  }

  void removeItem(int index) =>
      state = state.copyWith(items: [...state.items]..removeAt(index));

  void updateQuantity(int index, int qty) {
    if (qty <= 0) { removeItem(index); return; }
    final updated = state.items[index].copyWith(quantity: qty);
    state = state.copyWith(items: [...state.items]..[index] = updated);
  }

  void setNotes(String notes) => state = state.copyWith(notes: notes);

  void clear() => state = const CartState();
}
```

---

## Envío del pedido (batch write)

```dart
// En CartScreen, al confirmar:
// Se usa un batch para que Order + OrderItems se creen atómicamente.

Future<void> submitOrder(
  WidgetRef ref,
  TableSession session,
  CartState cart,
  Organization org,
) async {
  final db = FirebaseFirestore.instance;
  final batch = db.batch();

  // 1. Crear el Order document
  final orderRef = db.collection(FirestorePaths.orders).doc();
  final subtotal = cart.subtotal;
  final taxAmount = subtotal * org.defaultTaxPercent;

  batch.set(orderRef, Order(
    id: orderRef.id,
    orgId: session.orgId,
    branchId: session.branchId,
    tableId: session.tableId,
    tableNumber: session.tableNumber,
    status: OrderStatus.pending,
    subtotal: subtotal,
    taxAmount: taxAmount,
    taxPercent: org.defaultTaxPercent,
    tipAmount: 0,
    total: subtotal + taxAmount,
    notes: cart.notes,
    itemCount: cart.itemCount,
    payment: PaymentInfo.empty(),
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  ).toFirestore());

  // 2. Crear cada OrderItem
  // NOTA: el stationId lo asigna la Cloud Function order_routing
  // aquí se envía categoryId y la function determina la estación
  for (final item in cart.items) {
    final itemRef = db.collection(FirestorePaths.orderItems).doc();
    batch.set(itemRef, {
      'id': itemRef.id,
      'orgId': session.orgId,
      'branchId': session.branchId,
      'orderId': orderRef.id,
      'stationId': '',  // Cloud Function lo rellena
      'tableNumber': session.tableNumber,
      'productId': item.productId,
      'productName': item.productName,
      'categoryId': item.categoryId,
      'quantity': item.quantity,
      'unitPrice': item.unitPrice,
      'totalPrice': item.lineTotal,
      'modifiers': item.modifiers.map((m) => m.toJson()).toList(),
      'specialInstructions': item.specialInstructions,
      'status': 'queued',
      'sentToStationAt': FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  // La Cloud Function `onOrderCreated` se dispara automáticamente
  // y rellena el stationId de cada item + actualiza Realtime DB

  ref.read(cartNotifierProvider.notifier).clear();
}
```

---

## TrackingScreen — Realtime DB

```dart
// features/tracking/providers/tracking_provider.dart

@riverpod
Stream<List<ItemTrackingState>> trackItems(
  TrackItemsRef ref, {
  required String stationId,
  required String orderId,
}) {
  // Escucha el nodo de la estación en Realtime DB
  // filtra los ítems de este pedido
  final db = FirebaseDatabase.instance;
  return db
      .ref('/order_items/$stationId')
      .orderByKey()
      .startAt('${orderId}_')
      .endAt('${orderId}_\uf8ff')
      .onValue
      .map((event) {
        final data = event.snapshot.value as Map<dynamic, dynamic>? ?? {};
        return data.entries.map((e) => ItemTrackingState(
          key: e.key as String,
          status: ItemStatus.fromString((e.value as Map)['status'] as String),
          tableNumber: (e.value as Map)['tableNumber'] as String? ?? '',
        )).toList();
      });
}
```

---

## Reglas específicas de esta app

- Usar `FirebaseAuth.instance.signInAnonymously()` al iniciar. Si ya hay sesión anónima activa, reutilizarla.
- La mesa debe validarse contra Firestore antes de mostrar el menú. Si `isActive == false` → ir a `/error?msg=mesa_inactiva`.
- El carrito vive solo en memoria (Riverpod). Si cierran la app, se pierde. Es el comportamiento correcto.
- Mostrar banner "Sin conexión" pero NO bloquear la navegación del menú (Firestore offline cache).
- El botón "Enviar pedido" debe deshabilitar durante el commit y mostrar `CircularProgressIndicator`.
- Imagen de producto: siempre usar `CachedNetworkImage` con placeholder. Nunca `Image.network`.

---

## Orden de implementación

1. pubspec.yaml + estructura de carpetas
2. main.dart y app.dart (con ProviderScope y MaterialApp.router)
3. router.dart (todas las rutas aunque las pantallas estén vacías)
4. core_client/anon_auth.dart + core_client/table_session.dart
5. features/splash/splash_screen.dart (parseo de URL + validación de mesa)
6. features/menu/providers/menu_providers.dart
7. features/menu/models/cart_item.dart + providers/cart_notifier.dart
8. features/menu/screens/ (MenuScreen → CategoryScreen → ProductDetailScreen)
9. features/cart/screens/cart_screen.dart
10. features/tracking/providers/tracking_provider.dart
11. features/tracking/screens/tracking_screen.dart
12. Tests

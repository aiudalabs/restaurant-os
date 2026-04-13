# SPEC — apps/kitchen_app (KDS)
# Flutter app para cocina, bar y cualquier estación de producción.
# Una sola app, configuración por login.
# Lee CLAUDE.md y FIREBASE_SCHEMA.md antes de empezar.

---

## Identidad

- Usuarios: operadores (cocineros, bartenders, etc.)
- Plataforma: Android tablet, siempre landscape, modo oscuro
- Login: email + password asignado por el admin
- Una sola app sirve para TODAS las estaciones

---

## Cómo funciona la configuración por estación

Al hacer login el operador ve su `AppUser.stationId`.
Ese stationId determina:
1. El nombre que aparece en el header ("Cocina caliente", "Bar", etc.)
2. Qué nodo de Realtime DB escucha
3. Qué ítems puede actualizar

No hay configuración manual en la app. Todo viene del perfil del usuario.

---

## pubspec.yaml

```yaml
name: kitchen_app
description: RestaurantOS — KDS
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
  firebase_database: ^11.1.0
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  go_router: ^14.0.0
  shared_preferences: ^2.3.0
  wakelock_plus: ^1.2.0
  just_audio: ^0.9.0
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
├── main.dart                    ← forza landscape + WakeLock
├── app.dart
├── router.dart
└── features/
    ├── auth/
    │   ├── providers/
    │   │   └── auth_notifier.dart
    │   └── screens/
    │       └── login_screen.dart
    ├── kds/
    │   ├── models/
    │   │   └── kds_ticket.dart      ← modelo LOCAL (no en Firestore)
    │   ├── providers/
    │   │   ├── kds_provider.dart    ← stream Realtime DB → lista de tickets
    │   │   ├── station_provider.dart ← info de la estación activa
    │   │   └── kds_settings_provider.dart ← volumen, timer alert, etc.
    │   └── screens/
    │       ├── kds_screen.dart      ← pantalla principal
    │       └── widgets/
    │           ├── ticket_card.dart
    │           ├── ticket_item_row.dart
    │           ├── ticket_timer_badge.dart
    │           ├── recall_drawer.dart
    │           ├── new_order_flash.dart
    │           └── kds_app_bar.dart
    └── settings/
        └── screens/
            └── settings_screen.dart
```

---

## main.dart — configuración crítica

```dart
// main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Forza landscape permanente
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Pantalla siempre encendida
  await WakelockPlus.enable();

  runApp(const ProviderScope(child: KitchenApp()));
}
```

---

## Modelo KdsTicket (LOCAL — no va a Firestore)

```dart
// features/kds/models/kds_ticket.dart

@freezed
class KdsTicket with _$KdsTicket {
  const factory KdsTicket({
    required String orderId,
    required String tableNumber,
    required String displayNumber,   // "#0047" — correlativo corto
    required DateTime receivedAt,
    required List<KdsItem> items,
  }) = _KdsTicket;

  const KdsTicket._();

  bool get isAllDone => items.every((i) => i.status == ItemStatus.done);
  Duration get elapsed => DateTime.now().difference(receivedAt);

  TicketUrgency get urgency {
    final mins = elapsed.inMinutes;
    if (mins >= 15) return TicketUrgency.critical;
    if (mins >= 8)  return TicketUrgency.warning;
    return TicketUrgency.normal;
  }
}

enum TicketUrgency { normal, warning, critical }

@freezed
class KdsItem with _$KdsItem {
  const factory KdsItem({
    required String itemId,
    required String productName,
    required int quantity,
    required List<String> modifiersSummary,   // "Bien cocido", "Sin sal"
    String? specialInstructions,
    required ItemStatus status,
  }) = _KdsItem;
}
```

---

## KDS Provider — Realtime DB stream

```dart
// features/kds/providers/kds_provider.dart

@riverpod
Stream<List<KdsTicket>> kdsTickets(KdsTicketsRef ref) {
  final session = ref.watch(sessionNotifierProvider);
  if (session?.stationId == null) return Stream.value([]);

  final db = ref.watch(realtimeDatabaseProvider);
  final stationId = session!.stationId!;

  return db
      .ref('/order_items/$stationId')
      .onValue
      .map((event) {
        if (event.snapshot.value == null) return <KdsTicket>[];

        final raw = Map<String, dynamic>.from(
            event.snapshot.value as Map<dynamic, dynamic>);

        // Agrupar por orderId
        final Map<String, List<MapEntry<String, dynamic>>> byOrder = {};
        for (final entry in raw.entries) {
          final data = Map<String, dynamic>.from(entry.value as Map);
          // Solo ítems activos (queued o in_progress)
          if (data['status'] == 'done' || data['status'] == 'cancelled') continue;
          final orderId = (entry.key as String).split('_').first;
          byOrder.putIfAbsent(orderId, () => []).add(MapEntry(entry.key, data));
        }

        return byOrder.entries.map((order) {
          final items = order.value.map((e) {
            final data = e.value;
            return KdsItem(
              itemId: e.key,
              productName: data['productName'] as String,
              quantity: data['quantity'] as int? ?? 1,
              modifiersSummary: List<String>.from(data['modifiersSummary'] ?? []),
              specialInstructions: data['specialInstructions'] as String?,
              status: ItemStatus.fromString(data['status'] as String),
            );
          }).toList();

          return KdsTicket(
            orderId: order.key,
            tableNumber: order.value.first.value['tableNumber'] as String? ?? '?',
            displayNumber: '#${order.key.substring(0, 4).toUpperCase()}',
            receivedAt: DateTime.fromMillisecondsSinceEpoch(
                order.value.first.value['sentToStationAt'] as int? ??
                    DateTime.now().millisecondsSinceEpoch),
            items: items,
          );
        }).toList()
          ..sort((a, b) => a.receivedAt.compareTo(b.receivedAt));
      });
}

// Actualizar estado de un ítem (Realtime DB + Firestore en paralelo)
@riverpod
class ItemStatusUpdater extends _$ItemStatusUpdater {
  @override
  void build() {}

  Future<void> update({
    required String stationId,
    required String orderId,
    required String itemId,
    required ItemStatus newStatus,
  }) async {
    final db = ref.read(realtimeDatabaseProvider);
    final firestore = ref.read(firestoreProvider);
    final key = '${orderId}_$itemId';

    // Primero Realtime DB (velocidad — los KDS lo ven en <50ms)
    await db.ref('/order_items/$stationId/$key').update({
      'status': newStatus.toFirestore(),
      'updatedAt': ServerValue.timestamp,
    });

    // Luego Firestore (fuente de verdad)
    await firestore.doc(FirestorePaths.orderItem(itemId)).update({
      'status': newStatus.toFirestore(),
      'updatedAt': FieldValue.serverTimestamp(),
      if (newStatus == ItemStatus.inProgress)
        'startedAt': FieldValue.serverTimestamp(),
      if (newStatus == ItemStatus.done)
        'completedAt': FieldValue.serverTimestamp(),
    });
  }
}
```

---

## TicketCard — comportamiento de tap

```dart
// Un tap en un item avanza su estado:
// queued → in_progress → done
// Un long press retrocede (para corregir errores):
// done → in_progress

void onItemTap(KdsItem item, String orderId, String stationId) {
  final next = switch (item.status) {
    ItemStatus.queued      => ItemStatus.inProgress,
    ItemStatus.inProgress  => ItemStatus.done,
    ItemStatus.done        => ItemStatus.done, // no avanza más
    _                      => item.status,
  };
  if (next != item.status) {
    ref.read(itemStatusUpdaterProvider.notifier).update(
      stationId: stationId,
      orderId: orderId,
      itemId: item.itemId,
      newStatus: next,
    );
  }
}

void onItemLongPress(KdsItem item, String orderId, String stationId) {
  if (item.status == ItemStatus.done) {
    ref.read(itemStatusUpdaterProvider.notifier).update(
      stationId: stationId,
      orderId: orderId,
      itemId: item.itemId,
      newStatus: ItemStatus.inProgress,
    );
  }
}
```

---

## Código de colores por tiempo

```dart
// features/kds/screens/widgets/ticket_timer_badge.dart

Color timerColor(TicketUrgency urgency, BuildContext context) =>
    switch (urgency) {
      TicketUrgency.normal   => Theme.of(context).colorScheme.tertiary,
      TicketUrgency.warning  => Colors.amber,
      TicketUrgency.critical => Theme.of(context).colorScheme.error,
    };
```

---

## Reglas específicas de esta app

- WakeLock activado desde main.dart. La pantalla nunca se apaga.
- Landscape permanente. No permitir rotación.
- Modo oscuro por defecto. El usuario puede cambiarlo en settings.
- Sonido al llegar nuevo ticket: usar `just_audio` con un archivo local en assets.
- Reconexión automática: el stream de Realtime DB se reconecta solo. No hacer nada extra.
- La app NO accede al menú ni a precios. Solo ve nombres de ítems y estados.
- Recall: mostrar los últimos 10 tickets completados de las últimas 2 horas.
- Tap target mínimo 64×64 (operación con guantes).

---

## Orden de implementación

1. pubspec.yaml + main.dart (landscape + WakeLock)
2. router.dart
3. features/auth/login_screen.dart
4. features/auth/providers/auth_notifier.dart
5. features/kds/models/kds_ticket.dart
6. features/kds/providers/station_provider.dart
7. features/kds/providers/kds_provider.dart ← stream Realtime DB
8. features/kds/screens/widgets/ticket_timer_badge.dart
9. features/kds/screens/widgets/ticket_item_row.dart
10. features/kds/screens/widgets/ticket_card.dart
11. features/kds/screens/kds_screen.dart
12. features/kds/screens/widgets/new_order_flash.dart + sonido
13. features/kds/screens/widgets/recall_drawer.dart
14. features/settings/settings_screen.dart
15. Tests

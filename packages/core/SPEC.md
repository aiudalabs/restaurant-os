# SPEC — packages/core
# Dart package compartido entre client_app y kitchen_app.
# Este agente trabaja primero. Los otros agentes dependen de este.

---

## Responsabilidad

Contiene: modelos Freezed, repositorios Firebase, providers Riverpod base,
tema visual, utilidades y tipos de error. NO contiene widgets visuales.

---

## Estructura exacta a crear

```
packages/core/
├── pubspec.yaml
├── lib/
│   ├── core.dart                     ← barrel export de todo
│   │
│   ├── models/
│   │   ├── organization.dart
│   │   ├── branch.dart
│   │   ├── menu.dart
│   │   ├── category.dart
│   │   ├── product.dart              ← incluye ModifierGroup y ModifierOption
│   │   ├── table_model.dart          ← llamar table_model para no chocar con Table de Dart
│   │   ├── station.dart
│   │   ├── order.dart                ← incluye OrderStatus, PaymentInfo
│   │   ├── order_item.dart           ← incluye ItemStatus
│   │   └── app_user.dart             ← incluye UserRole
│   │
│   ├── repositories/
│   │   ├── menu_repository.dart
│   │   ├── order_repository.dart
│   │   ├── order_item_repository.dart
│   │   ├── table_repository.dart
│   │   ├── station_repository.dart
│   │   └── user_repository.dart
│   │
│   ├── providers/
│   │   ├── firebase_providers.dart   ← instancias de Firebase
│   │   ├── auth_provider.dart        ← estado de autenticación
│   │   ├── session_provider.dart     ← orgId, branchId, role del usuario activo
│   │   └── repository_providers.dart ← providers de cada repositorio
│   │
│   ├── services/
│   │   ├── order_routing_service.dart ← determina qué station recibe cada ítem
│   │   └── realtime_sync_service.dart ← sincroniza estados con Realtime DB
│   │
│   └── utils/
│       ├── firestore_paths.dart      ← CRÍTICO — ver FIREBASE_SCHEMA.md
│       ├── app_theme.dart            ← ThemeData Material 3
│       ├── app_colors.dart
│       ├── app_exceptions.dart
│       └── extensions.dart
│
└── test/
    ├── models/order_test.dart
    ├── repositories/order_repository_test.dart
    └── services/order_routing_service_test.dart
```

---

## pubspec.yaml exacto

```yaml
name: core
description: RestaurantOS shared package
publish_to: none
resolution: workspace

environment:
  sdk: '>=3.5.0 <4.0.0'
  flutter: '>=3.24.0'

dependencies:
  flutter:
    sdk: flutter
  cloud_firestore: ^5.4.0
  firebase_auth: ^5.3.0
  firebase_database: ^11.1.0
  firebase_storage: ^12.3.0
  firebase_messaging: ^15.1.0
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  freezed_annotation: ^2.4.0
  json_annotation: ^4.9.0
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  freezed: ^2.5.0
  json_serializable: ^6.8.0
  riverpod_generator: ^2.4.0
  build_runner: ^2.4.0
  fake_cloud_firestore: ^3.0.0
  firebase_auth_mocks: ^0.14.0
  mocktail: ^1.0.0
```

---

## Código base — patrones exactos a seguir

### Modelo con Freezed (ejemplo: Order)

```dart
// lib/models/order.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'order.freezed.dart';
part 'order.g.dart';

enum OrderStatus {
  pending, confirmed, inPreparation, ready, delivered, cancelled, closed;

  static OrderStatus fromString(String v) => OrderStatus.values
      .firstWhere((e) => e.name == _toCamel(v), orElse: () => pending);

  // Convierte "in_preparation" → "inPreparation"
  static String _toCamel(String s) => s.replaceAllMapped(
    RegExp(r'_([a-z])'), (m) => m[1]!.toUpperCase());

  String toFirestore() => name.replaceAllMapped(
    RegExp(r'[A-Z]'), (m) => '_${m[0]!.toLowerCase()}');
}

@freezed
class Order with _$Order {
  const factory Order({
    required String id,
    required String orgId,
    required String branchId,
    required String tableId,
    required String tableNumber,
    required OrderStatus status,
    required double subtotal,
    required double taxAmount,
    required double taxPercent,
    required double tipAmount,
    required double total,
    String? notes,
    required int itemCount,
    required PaymentInfo payment,
    required DateTime createdAt,
    required DateTime updatedAt,
    DateTime? completedAt,
  }) = _Order;

  factory Order.fromJson(Map<String, dynamic> json) => _$OrderFromJson(json);

  factory Order.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Order.fromJson({
      ...data,
      'id': doc.id,
      'status': data['status'] as String,
      'createdAt': (data['createdAt'] as Timestamp).toDate().toIso8601String(),
      'updatedAt': (data['updatedAt'] as Timestamp).toDate().toIso8601String(),
      'completedAt': data['completedAt'] != null
          ? (data['completedAt'] as Timestamp).toDate().toIso8601String()
          : null,
    });
  }

  const Order._();

  Map<String, dynamic> toFirestore() => {
    ...toJson()..remove('id'),
    'status': status.toFirestore(),
    'createdAt': Timestamp.fromDate(createdAt),
    'updatedAt': Timestamp.fromDate(updatedAt),
    if (completedAt != null) 'completedAt': Timestamp.fromDate(completedAt!),
  };
}

@freezed
class PaymentInfo with _$PaymentInfo {
  const factory PaymentInfo({
    String? method,
    String? status,
    String? yappyOrderId,
    String? confirmationNumber,
    DateTime? paidAt,
  }) = _PaymentInfo;

  factory PaymentInfo.fromJson(Map<String, dynamic> json) =>
      _$PaymentInfoFromJson(json);

  static PaymentInfo empty() => const PaymentInfo();
}
```

### Repositorio (ejemplo: OrderRepository)

```dart
// lib/repositories/order_repository.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/order.dart';
import '../utils/firestore_paths.dart';
import '../utils/app_exceptions.dart';

part 'order_repository.g.dart';

@riverpod
OrderRepository orderRepository(OrderRepositoryRef ref) =>
    OrderRepository(ref.watch(firestoreProvider));

class OrderRepository {
  OrderRepository(this._db);
  final FirebaseFirestore _db;

  // SIEMPRE usar withConverter para tipado
  CollectionReference<Order> get _col => _db
      .collection(FirestorePaths.orders)
      .withConverter(
        fromFirestore: Order.fromFirestore,
        toFirestore: (o, _) => o.toFirestore(),
      );

  // Stream de pedidos activos de una sucursal
  Stream<List<Order>> watchActive({
    required String orgId,
    required String branchId,
  }) {
    try {
      return _col
          .where('orgId', isEqualTo: orgId)
          .where('branchId', isEqualTo: branchId)
          .where('status', whereIn: [
            OrderStatus.confirmed.toFirestore(),
            OrderStatus.inPreparation.toFirestore(),
            OrderStatus.ready.toFirestore(),
          ])
          .orderBy('createdAt')
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  // Crea pedido — retorna el ID asignado
  Future<String> create(Order order) async {
    try {
      final doc = _col.doc();
      await doc.set(order.copyWith(id: doc.id));
      return doc.id;
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  // Actualiza solo el estado
  Future<void> updateStatus(String orderId, OrderStatus status) async {
    try {
      await _db.doc(FirestorePaths.order(orderId)).update({
        'status': status.toFirestore(),
        'updatedAt': FieldValue.serverTimestamp(),
        if (status == OrderStatus.closed)
          'completedAt': FieldValue.serverTimestamp(),
      });
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }
}
```

### Session Provider

```dart
// lib/providers/session_provider.dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/app_user.dart';

part 'session_provider.freezed.dart';
part 'session_provider.g.dart';

@freezed
class UserSession with _$UserSession {
  const factory UserSession({
    required String userId,
    required String orgId,
    required String branchId,
    required UserRole role,
    String? stationId,
  }) = _UserSession;
}

@Riverpod(keepAlive: true)
class SessionNotifier extends _$SessionNotifier {
  @override
  UserSession? build() => null;

  void setSession(UserSession session) => state = session;
  void clearSession() => state = null;

  // Helpers
  String get orgId => state!.orgId;
  String get branchId => state!.branchId;
  bool get isAdmin => state?.role == UserRole.admin;
}
```

### Firebase Providers

```dart
// lib/providers/firebase_providers.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'firebase_providers.g.dart';

@Riverpod(keepAlive: true)
FirebaseFirestore firestore(FirestoreRef ref) => FirebaseFirestore.instance;

@Riverpod(keepAlive: true)
FirebaseAuth firebaseAuth(FirebaseAuthRef ref) => FirebaseAuth.instance;

@Riverpod(keepAlive: true)
FirebaseDatabase realtimeDatabase(RealtimeDatabaseRef ref) =>
    FirebaseDatabase.instance;
```

### AppExceptions

```dart
// lib/utils/app_exceptions.dart
sealed class AppException implements Exception {
  const AppException(this.message, {this.code});
  final String message;
  final String? code;

  factory AppException.fromFirebase(FirebaseException e) =>
    switch (e.code) {
      'permission-denied' => const PermissionDeniedException(),
      'not-found'         => const NotFoundException(),
      'unavailable'       => const NetworkException(),
      'already-exists'    => const AlreadyExistsException(),
      _                   => UnknownException(e.message ?? 'Error desconocido'),
    };

  @override
  String toString() => 'AppException($code): $message';
}

final class PermissionDeniedException extends AppException {
  const PermissionDeniedException()
      : super('Sin permisos para esta operación', code: 'permission-denied');
}
final class NotFoundException extends AppException {
  const NotFoundException() : super('Recurso no encontrado', code: 'not-found');
}
final class NetworkException extends AppException {
  const NetworkException() : super('Sin conexión', code: 'unavailable');
}
final class AlreadyExistsException extends AppException {
  const AlreadyExistsException() : super('Ya existe', code: 'already-exists');
}
final class UnknownException extends AppException {
  const UnknownException(super.message);
}
```

### AppTheme

```dart
// lib/utils/app_theme.dart
import 'package:flutter/material.dart';

abstract class AppTheme {
  static const Color brandRed = Color(0xFFC8392B);
  static const Color brandGold = Color(0xFFD4A853);

  static ThemeData light() => ThemeData(
    useMaterial3: true,
    colorSchemeSeed: brandRed,
    brightness: Brightness.light,
    materialTapTargetSize: MaterialTapTargetSize.padded, // mínimo 48x48
  );

  static ThemeData dark() => ThemeData(
    useMaterial3: true,
    colorSchemeSeed: brandRed,
    brightness: Brightness.dark,
    materialTapTargetSize: MaterialTapTargetSize.padded,
  );
}
```

---

## Barrel export (core.dart)

```dart
// lib/core.dart
// Models
export 'models/organization.dart';
export 'models/branch.dart';
export 'models/menu.dart';
export 'models/category.dart';
export 'models/product.dart';
export 'models/table_model.dart';
export 'models/station.dart';
export 'models/order.dart';
export 'models/order_item.dart';
export 'models/app_user.dart';
// Repositories
export 'repositories/menu_repository.dart';
export 'repositories/order_repository.dart';
export 'repositories/order_item_repository.dart';
export 'repositories/table_repository.dart';
export 'repositories/station_repository.dart';
export 'repositories/user_repository.dart';
// Providers
export 'providers/firebase_providers.dart';
export 'providers/auth_provider.dart';
export 'providers/session_provider.dart';
export 'providers/repository_providers.dart';
// Utils
export 'utils/firestore_paths.dart';
export 'utils/app_theme.dart';
export 'utils/app_colors.dart';
export 'utils/app_exceptions.dart';
export 'utils/extensions.dart';
```

---

## Orden de implementación — seguir exactamente

### Bloque 1 (desbloquea todo lo demás)
1. `pubspec.yaml`
2. `utils/firestore_paths.dart`
3. `utils/app_exceptions.dart`
4. `utils/app_theme.dart`
5. Correr `flutter pub get`

### Bloque 2 (modelos — en este orden)
6. `models/app_user.dart` (enum UserRole primero)
7. `models/order_item.dart` (enum ItemStatus)
8. `models/order.dart` (enum OrderStatus, PaymentInfo)
9. `models/product.dart` (ModifierGroup, ModifierOption embebidos)
10. `models/category.dart`
11. `models/menu.dart`
12. `models/branch.dart`
13. `models/organization.dart`
14. `models/station.dart`
15. `models/table_model.dart`
16. Correr `flutter pub run build_runner build --delete-conflicting-outputs`
17. Verificar que NO hay errores de compilación antes de continuar

### Bloque 3 (providers base)
18. `providers/firebase_providers.dart`
19. `providers/session_provider.dart`
20. `providers/auth_provider.dart`
21. Correr build_runner de nuevo

### Bloque 4 (repositorios)
22. `repositories/order_repository.dart`
23. `repositories/order_item_repository.dart`
24. `repositories/menu_repository.dart`
25. `repositories/table_repository.dart`
26. `repositories/station_repository.dart`
27. `repositories/user_repository.dart`
28. `providers/repository_providers.dart`

### Bloque 5 (servicios y barrel)
29. `services/order_routing_service.dart`
30. `services/realtime_sync_service.dart`
31. `utils/extensions.dart`
32. `core.dart` (barrel export)
33. Correr `flutter test` — deben pasar todos los tests

**REGLA:** Si un bloque no compila, NO avanzar al siguiente.

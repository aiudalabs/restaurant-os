import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:core/models/order.dart';
import 'package:core/repositories/order_repository.dart';
import 'package:core/utils/firestore_paths.dart';

Order _makeOrder({
  String id = '',
  String orgId = 'org-1',
  String branchId = 'branch-1',
  OrderStatus status = OrderStatus.pending,
}) {
  final now = DateTime(2026, 3, 29, 12, 0);
  return Order(
    id: id,
    orgId: orgId,
    branchId: branchId,
    tableId: 'table-1',
    tableNumber: '7',
    status: status,
    subtotal: 20.0,
    taxAmount: 1.40,
    taxPercent: 0.07,
    tipAmount: 3.0,
    total: 24.40,
    itemCount: 2,
    payment: PaymentInfo.empty(),
    createdAt: now,
    updatedAt: now,
  );
}

void main() {
  late FakeFirebaseFirestore fakeDb;
  late OrderRepository repo;

  setUp(() {
    fakeDb = FakeFirebaseFirestore();
    repo = OrderRepository(fakeDb);
  });

  group('OrderRepository', () {
    test('create asigna ID y persiste el pedido', () async {
      final order = _makeOrder();
      final id = await repo.create(order);

      expect(id, isNotEmpty);

      final doc =
          await fakeDb.collection(FirestorePaths.orders).doc(id).get();
      expect(doc.exists, isTrue);
      expect(doc.data()!['orgId'], 'org-1');
      expect(doc.data()!['status'], 'pending');
    });

    test('getById retorna el pedido creado', () async {
      final order = _makeOrder();
      final id = await repo.create(order);

      final result = await repo.getById(id);
      expect(result, isNotNull);
      expect(result!.id, id);
      expect(result.orgId, 'org-1');
      expect(result.status, OrderStatus.pending);
    });

    test('getById retorna null si no existe', () async {
      final result = await repo.getById('nonexistent');
      expect(result, isNull);
    });

    test('updateStatus cambia el estado en Firestore', () async {
      final order = _makeOrder();
      final id = await repo.create(order);

      await repo.updateStatus(id, OrderStatus.confirmed);

      final doc =
          await fakeDb.collection(FirestorePaths.orders).doc(id).get();
      expect(doc.data()!['status'], 'confirmed');
    });

    test('updatePayment persiste la info de pago', () async {
      final order = _makeOrder();
      final id = await repo.create(order);

      final payment = PaymentInfo(
        method: 'card',
        status: 'paid',
        confirmationNumber: 'CONF-123',
        paidAt: DateTime(2026, 3, 29, 13, 0),
      );
      await repo.updatePayment(id, payment);

      final doc =
          await fakeDb.collection(FirestorePaths.orders).doc(id).get();
      final paymentData = doc.data()!['payment'] as Map<String, dynamic>;
      expect(paymentData['method'], 'card');
      expect(paymentData['status'], 'paid');
      expect(paymentData['confirmationNumber'], 'CONF-123');
    });

    test('watchByBranch emite pedidos de la sucursal', () async {
      await repo.create(_makeOrder(branchId: 'branch-1'));
      await repo.create(_makeOrder(branchId: 'branch-1'));
      await repo.create(_makeOrder(branchId: 'branch-2'));

      final stream = repo.watchByBranch(
        orgId: 'org-1',
        branchId: 'branch-1',
      );

      final orders = await stream.first;
      expect(orders.length, 2);
      expect(orders.every((o) => o.branchId == 'branch-1'), isTrue);
    });

    test('watchActive solo emite pedidos con status activo', () async {
      await repo.create(
          _makeOrder(status: OrderStatus.confirmed));
      await repo.create(
          _makeOrder(status: OrderStatus.inPreparation));
      await repo.create(
          _makeOrder(status: OrderStatus.closed));
      await repo.create(
          _makeOrder(status: OrderStatus.pending));

      final stream = repo.watchActive(
        orgId: 'org-1',
        branchId: 'branch-1',
      );

      final orders = await stream.first;
      expect(orders.length, 2);
      final statuses = orders.map((o) => o.status).toSet();
      expect(statuses, containsAll([
        OrderStatus.confirmed,
        OrderStatus.inPreparation,
      ]));
      expect(statuses.contains(OrderStatus.closed), isFalse);
      expect(statuses.contains(OrderStatus.pending), isFalse);
    });
  });
}

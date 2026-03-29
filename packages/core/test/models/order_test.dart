import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:flutter_test/flutter_test.dart';
import 'package:core/models/order.dart';

void main() {
  group('OrderStatus', () {
    test('toFirestore convierte camelCase a snake_case', () {
      expect(OrderStatus.inPreparation.toFirestore(), 'in_preparation');
      expect(OrderStatus.pending.toFirestore(), 'pending');
      expect(OrderStatus.confirmed.toFirestore(), 'confirmed');
      expect(OrderStatus.ready.toFirestore(), 'ready');
      expect(OrderStatus.delivered.toFirestore(), 'delivered');
      expect(OrderStatus.cancelled.toFirestore(), 'cancelled');
      expect(OrderStatus.closed.toFirestore(), 'closed');
    });

    test('fromString convierte snake_case a enum', () {
      expect(OrderStatus.fromString('in_preparation'),
          OrderStatus.inPreparation);
      expect(OrderStatus.fromString('pending'), OrderStatus.pending);
      expect(OrderStatus.fromString('confirmed'), OrderStatus.confirmed);
    });

    test('fromString retorna pending para valor desconocido', () {
      expect(OrderStatus.fromString('unknown'), OrderStatus.pending);
      expect(OrderStatus.fromString(''), OrderStatus.pending);
    });
  });

  group('PaymentInfo', () {
    test('empty() crea instancia sin valores', () {
      final payment = PaymentInfo.empty();
      expect(payment.method, isNull);
      expect(payment.status, isNull);
      expect(payment.yappyOrderId, isNull);
      expect(payment.confirmationNumber, isNull);
      expect(payment.paidAt, isNull);
    });

    test('fromJson/toJson roundtrip', () {
      final payment = PaymentInfo(
        method: 'card',
        status: 'paid',
        confirmationNumber: 'ABC123',
        paidAt: DateTime(2026, 3, 29),
      );
      final json = payment.toJson();
      final restored = PaymentInfo.fromJson(json);
      expect(restored, equals(payment));
    });
  });

  group('Order', () {
    late Order order;
    late DateTime now;

    setUp(() {
      now = DateTime(2026, 3, 29, 12, 0);
      order = Order(
        id: 'order-1',
        orgId: 'org-1',
        branchId: 'branch-1',
        tableId: 'table-1',
        tableNumber: '7',
        status: OrderStatus.confirmed,
        subtotal: 25.0,
        taxAmount: 1.75,
        taxPercent: 0.07,
        tipAmount: 3.75,
        total: 30.50,
        notes: 'Sin cebolla',
        itemCount: 3,
        payment: PaymentInfo.empty(),
        createdAt: now,
        updatedAt: now,
      );
    });

    test('fromJson/toJson roundtrip', () {
      final json = order.toJson();
      final restored = Order.fromJson(json);
      expect(restored, equals(order));
    });

    test('toFirestore excluye id y convierte status a snake_case', () {
      final fs = order.toFirestore();
      expect(fs.containsKey('id'), isFalse);
      expect(fs['status'], 'confirmed');
      expect(fs['createdAt'], isA<Timestamp>());
      expect(fs['updatedAt'], isA<Timestamp>());
    });

    test('toFirestore incluye completedAt solo si no es null', () {
      final fsWithout = order.toFirestore();
      expect(fsWithout.containsKey('completedAt'), isFalse);

      final closed = order.copyWith(
        status: OrderStatus.closed,
        completedAt: now,
      );
      final fsWith = closed.toFirestore();
      expect(fsWith.containsKey('completedAt'), isTrue);
      expect(fsWith['completedAt'], isA<Timestamp>());
    });

    test('copyWith preserva valores no modificados', () {
      final updated = order.copyWith(status: OrderStatus.ready);
      expect(updated.status, OrderStatus.ready);
      expect(updated.id, 'order-1');
      expect(updated.subtotal, 25.0);
      expect(updated.notes, 'Sin cebolla');
    });

    test('toFirestore convierte Timestamps correctamente', () {
      final fs = order.toFirestore();
      final createdAt = fs['createdAt'] as Timestamp;
      expect(createdAt.toDate(), now);
    });
  });
}

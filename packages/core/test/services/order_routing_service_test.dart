import 'package:flutter_test/flutter_test.dart';
import 'package:core/models/order_item.dart';
import 'package:core/models/station.dart';
import 'package:core/services/order_routing_service.dart';

Station _makeStation({
  required String id,
  required String name,
  required List<String> categoryIds,
}) {
  return Station(
    id: id,
    orgId: 'org-1',
    branchId: 'branch-1',
    name: name,
    categoryIds: categoryIds,
    fcmTokens: [],
    color: '#FF5722',
    isActive: true,
  );
}

OrderItem _makeItem({
  required String id,
  required String categoryId,
  String stationId = '',
}) {
  return OrderItem(
    id: id,
    orgId: 'org-1',
    branchId: 'branch-1',
    orderId: 'order-1',
    stationId: stationId,
    tableNumber: '7',
    productId: 'prod-$id',
    productName: 'Producto $id',
    categoryId: categoryId,
    quantity: 1,
    unitPrice: 10.0,
    totalPrice: 10.0,
    modifiers: [],
    status: ItemStatus.queued,
    sentToStationAt: DateTime(2026, 3, 29),
  );
}

void main() {
  late OrderRoutingService service;

  setUp(() {
    service = const OrderRoutingService();
  });

  group('OrderRoutingService.routeItems', () {
    test('asigna stationId correcto basado en categoryId', () {
      final stations = [
        _makeStation(
            id: 'kitchen', name: 'Cocina', categoryIds: ['cat-food']),
        _makeStation(
            id: 'bar', name: 'Bar', categoryIds: ['cat-drinks']),
      ];

      final items = [
        _makeItem(id: '1', categoryId: 'cat-food'),
        _makeItem(id: '2', categoryId: 'cat-drinks'),
        _makeItem(id: '3', categoryId: 'cat-food'),
      ];

      final routed = service.routeItems(items: items, stations: stations);

      expect(routed[0].stationId, 'kitchen');
      expect(routed[1].stationId, 'bar');
      expect(routed[2].stationId, 'kitchen');
    });

    test('estación con múltiples categorías rutea todas correctamente', () {
      final stations = [
        _makeStation(
          id: 'kitchen',
          name: 'Cocina',
          categoryIds: ['cat-entradas', 'cat-carnes', 'cat-postres'],
        ),
      ];

      final items = [
        _makeItem(id: '1', categoryId: 'cat-entradas'),
        _makeItem(id: '2', categoryId: 'cat-carnes'),
        _makeItem(id: '3', categoryId: 'cat-postres'),
      ];

      final routed = service.routeItems(items: items, stations: stations);
      expect(routed.every((i) => i.stationId == 'kitchen'), isTrue);
    });

    test('lanza StateError si categoría no tiene estación', () {
      final stations = [
        _makeStation(
            id: 'kitchen', name: 'Cocina', categoryIds: ['cat-food']),
      ];

      final items = [
        _makeItem(id: '1', categoryId: 'cat-unknown'),
      ];

      expect(
        () => service.routeItems(items: items, stations: stations),
        throwsA(isA<StateError>()),
      );
    });

    test('lista vacía de items retorna lista vacía', () {
      final stations = [
        _makeStation(
            id: 'kitchen', name: 'Cocina', categoryIds: ['cat-food']),
      ];

      final routed = service.routeItems(items: [], stations: stations);
      expect(routed, isEmpty);
    });
  });

  group('OrderRoutingService.groupByStation', () {
    test('agrupa items correctamente por stationId', () {
      final items = [
        _makeItem(id: '1', categoryId: 'c1', stationId: 'kitchen'),
        _makeItem(id: '2', categoryId: 'c2', stationId: 'bar'),
        _makeItem(id: '3', categoryId: 'c3', stationId: 'kitchen'),
        _makeItem(id: '4', categoryId: 'c4', stationId: 'bar'),
      ];

      final grouped = service.groupByStation(items);

      expect(grouped.keys.length, 2);
      expect(grouped['kitchen']!.length, 2);
      expect(grouped['bar']!.length, 2);
    });

    test('lista vacía retorna mapa vacío', () {
      final grouped = service.groupByStation([]);
      expect(grouped, isEmpty);
    });

    test('un solo stationId agrupa todo junto', () {
      final items = [
        _makeItem(id: '1', categoryId: 'c1', stationId: 'kitchen'),
        _makeItem(id: '2', categoryId: 'c2', stationId: 'kitchen'),
      ];

      final grouped = service.groupByStation(items);
      expect(grouped.keys.length, 1);
      expect(grouped['kitchen']!.length, 2);
    });
  });
}

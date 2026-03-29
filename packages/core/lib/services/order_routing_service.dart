import '../models/order_item.dart';
import '../models/station.dart';

/// Determina qué estación recibe cada ítem de un pedido
/// basándose en el categoryId del producto y los categoryIds de cada estación.
class OrderRoutingService {
  const OrderRoutingService();

  /// Asigna un stationId a cada ítem según su categoryId.
  /// Retorna los items con el stationId poblado.
  /// Si no hay estación para una categoría, lanza StateError.
  List<OrderItem> routeItems({
    required List<OrderItem> items,
    required List<Station> stations,
  }) {
    final categoryToStation = <String, String>{};
    for (final station in stations) {
      for (final catId in station.categoryIds) {
        categoryToStation[catId] = station.id;
      }
    }

    return items.map((item) {
      final stationId = categoryToStation[item.categoryId];
      if (stationId == null) {
        throw StateError(
          'No hay estación configurada para la categoría ${item.categoryId}',
        );
      }
      return item.copyWith(stationId: stationId);
    }).toList();
  }

  /// Agrupa items por stationId para envío eficiente.
  Map<String, List<OrderItem>> groupByStation(List<OrderItem> items) {
    final grouped = <String, List<OrderItem>>{};
    for (final item in items) {
      grouped.putIfAbsent(item.stationId, () => []).add(item);
    }
    return grouped;
  }
}

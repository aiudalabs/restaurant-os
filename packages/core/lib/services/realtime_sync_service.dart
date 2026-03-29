import 'package:firebase_database/firebase_database.dart';
import '../models/order_item.dart';

/// Sincroniza estados de order_items con Firebase Realtime Database.
/// Estructura: /order_items/{stationId}/{orderId}_{itemId}/
class RealtimeSyncService {
  RealtimeSyncService(this._rtdb);
  final FirebaseDatabase _rtdb;

  /// Escribe el estado de un item en RTDB para que el KDS lo reciba en tiempo real.
  Future<void> syncItemStatus(OrderItem item) async {
    final path = 'order_items/${item.stationId}/${item.orderId}_${item.id}';
    await _rtdb.ref(path).set({
      'status': item.status.toFirestore(),
      'updatedAt': ServerValue.timestamp,
      'tableNumber': item.tableNumber,
    });
  }

  /// Escribe múltiples items de un pedido al RTDB.
  Future<void> syncNewOrderItems(List<OrderItem> items) async {
    final updates = <String, dynamic>{};
    for (final item in items) {
      final path = 'order_items/${item.stationId}/${item.orderId}_${item.id}';
      updates[path] = {
        'status': item.status.toFirestore(),
        'updatedAt': ServerValue.timestamp,
        'tableNumber': item.tableNumber,
      };
    }
    await _rtdb.ref().update(updates);
  }

  /// Stream de items de una estación específica (para el KDS).
  Stream<DatabaseEvent> watchStation(String stationId) {
    return _rtdb.ref('order_items/$stationId').onValue;
  }

  /// Elimina un item del RTDB cuando ya fue completado o cancelado.
  Future<void> removeItem({
    required String stationId,
    required String orderId,
    required String itemId,
  }) async {
    final path = 'order_items/$stationId/${orderId}_$itemId';
    await _rtdb.ref(path).remove();
  }
}

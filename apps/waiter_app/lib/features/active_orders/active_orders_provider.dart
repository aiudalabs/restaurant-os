import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/session_provider.dart';

/// A lightweight read model for an order as shown in the waiter's
/// "Pedidos activos" list.
class ActiveOrder {
  const ActiveOrder({
    required this.id,
    required this.customerName,
    required this.status,
    required this.total,
    required this.itemCount,
    required this.createdAt,
    required this.items,
  });

  final String id;
  final String customerName;
  final String status;
  final double total;
  final int itemCount;
  final DateTime createdAt;
  final List<ActiveOrderItem> items;
}

class ActiveOrderItem {
  const ActiveOrderItem({
    required this.productName,
    required this.quantity,
    required this.status,
  });

  final String productName;
  final int quantity;
  final String status;
}

/// Stream of active orders placed by this waiter device.
/// We mark waiter orders with `source: 'waiter'` when creating them so they
/// don't mix with client QR orders.
final activeOrdersStreamProvider =
    StreamProvider.autoDispose<List<ActiveOrder>>((ref) async* {
  final session = ref.watch(sessionProvider);
  if (session == null) {
    yield const [];
    return;
  }

  final db = FirebaseFirestore.instance;

  // We cannot do "status not-in [closed, cancelled]" cheaply and still
  // combine with other filters without a composite index. Read by org + branch
  // and filter in memory — the list is small.
  final ordersStream = db
      .collection('orders')
      .where('orgId', isEqualTo: session.orgId)
      .where('branchId', isEqualTo: session.branchId)
      .orderBy('createdAt', descending: true)
      .limit(30)
      .snapshots();

  await for (final snap in ordersStream) {
    final orders = <ActiveOrder>[];
    for (final d in snap.docs) {
      final data = d.data();
      final status = (data['status'] as String?) ?? 'pending';
      if (status == 'closed' || status == 'cancelled') continue;
      final src = data['source'] as String?;
      if (src != 'waiter') continue;

      final createdAt = (data['createdAt'] as Timestamp?)?.toDate() ??
          DateTime.now();

      // Fetch items for this order. Keeping it simple: one read per order.
      // Waiter will have < 30 active orders at once.
      final itemsSnap = await db
          .collection('order_items')
          .where('orderId', isEqualTo: d.id)
          .get();

      final items = itemsSnap.docs.map((doc) {
        final id = doc.data();
        return ActiveOrderItem(
          productName: (id['productName'] as String?) ?? '',
          quantity: (id['quantity'] as num?)?.toInt() ?? 0,
          status: (id['status'] as String?) ?? 'queued',
        );
      }).toList();

      orders.add(ActiveOrder(
        id: d.id,
        customerName:
            (data['customerName'] as String?) ?? (data['tableNumber'] as String? ?? ''),
        status: status,
        total: (data['total'] as num?)?.toDouble() ?? 0.0,
        itemCount: (data['itemCount'] as num?)?.toInt() ?? 0,
        createdAt: createdAt,
        items: items,
      ));
    }
    yield orders;
  }
});

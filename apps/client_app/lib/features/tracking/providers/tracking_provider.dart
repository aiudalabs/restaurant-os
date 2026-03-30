import 'package:core/core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Tracks the overall order status from Firestore.
final orderStreamProvider =
    StreamProvider.family<Order?, String>((ref, orderId) {
  final firestore = ref.watch(firestoreProvider);
  return firestore
      .collection(FirestorePaths.orders)
      .doc(orderId)
      .snapshots()
      .map((doc) {
    if (!doc.exists) return null;
    return Order.fromFirestore(doc);
  });
});

/// Watches order items from Firestore for a given order.
final orderItemsStreamProvider =
    StreamProvider.family<List<OrderItem>, String>((ref, orderId) {
  final firestore = ref.watch(firestoreProvider);
  return firestore
      .collection(FirestorePaths.orderItems)
      .where('orderId', isEqualTo: orderId)
      .snapshots()
      .map((snapshot) =>
          snapshot.docs.map((doc) => OrderItem.fromFirestore(doc)).toList());
});

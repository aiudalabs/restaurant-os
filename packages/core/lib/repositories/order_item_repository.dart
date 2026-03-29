import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/order_item.dart';
import '../utils/firestore_paths.dart';
import '../utils/app_exceptions.dart';

class OrderItemRepository {
  OrderItemRepository(this._db);
  final FirebaseFirestore _db;

  CollectionReference<OrderItem> get _col => _db
      .collection(FirestorePaths.orderItems)
      .withConverter(
        fromFirestore: (doc, _) => OrderItem.fromFirestore(doc),
        toFirestore: (item, _) => item.toFirestore(),
      );

  Stream<List<OrderItem>> watchByStation({
    required String stationId,
    List<ItemStatus> statuses = const [ItemStatus.queued, ItemStatus.inProgress],
  }) {
    try {
      return _col
          .where('stationId', isEqualTo: stationId)
          .where('status',
              whereIn: statuses.map((s) => s.toFirestore()).toList())
          .orderBy('sentToStationAt')
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Stream<List<OrderItem>> watchByOrder(String orderId) {
    try {
      return _col
          .where('orderId', isEqualTo: orderId)
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<String> create(OrderItem item) async {
    try {
      final doc = _col.doc();
      await doc.set(item.copyWith(id: doc.id));
      return doc.id;
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<void> createBatch(List<OrderItem> items) async {
    try {
      final batch = _db.batch();
      for (final item in items) {
        final doc = _col.doc();
        batch.set(doc, item.copyWith(id: doc.id));
      }
      await batch.commit();
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<void> updateStatus(String itemId, ItemStatus status) async {
    try {
      final updates = <String, dynamic>{
        'status': status.toFirestore(),
      };
      if (status == ItemStatus.inProgress) {
        updates['startedAt'] = FieldValue.serverTimestamp();
      } else if (status == ItemStatus.done) {
        updates['completedAt'] = FieldValue.serverTimestamp();
      }
      await _db.doc(FirestorePaths.orderItem(itemId)).update(updates);
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }
}

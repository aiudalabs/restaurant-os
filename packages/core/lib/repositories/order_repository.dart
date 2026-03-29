import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import '../models/order.dart';
import '../utils/firestore_paths.dart';
import '../utils/app_exceptions.dart';

class OrderRepository {
  OrderRepository(this._db);
  final FirebaseFirestore _db;

  CollectionReference<Order> get _col => _db
      .collection(FirestorePaths.orders)
      .withConverter(
        fromFirestore: (doc, _) => Order.fromFirestore(doc),
        toFirestore: (order, _) => order.toFirestore(),
      );

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

  Stream<List<Order>> watchByBranch({
    required String orgId,
    required String branchId,
  }) {
    try {
      return _col
          .where('orgId', isEqualTo: orgId)
          .where('branchId', isEqualTo: branchId)
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<Order?> getById(String orderId) async {
    try {
      final doc = await _col.doc(orderId).get();
      return doc.data();
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<String> create(Order order) async {
    try {
      final doc = _col.doc();
      await doc.set(order.copyWith(id: doc.id));
      return doc.id;
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

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

  Future<void> updatePayment(String orderId, PaymentInfo payment) async {
    try {
      await _db.doc(FirestorePaths.order(orderId)).update({
        'payment': payment.toJson(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }
}

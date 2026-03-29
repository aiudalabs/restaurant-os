import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/table_model.dart';
import '../utils/firestore_paths.dart';
import '../utils/app_exceptions.dart';

class TableRepository {
  TableRepository(this._db);
  final FirebaseFirestore _db;

  CollectionReference<TableModel> get _col => _db
      .collection(FirestorePaths.tables)
      .withConverter(
        fromFirestore: (doc, _) => TableModel.fromFirestore(doc),
        toFirestore: (table, _) => table.toFirestore(),
      );

  Stream<List<TableModel>> watchByBranch({
    required String orgId,
    required String branchId,
  }) {
    try {
      return _col
          .where('orgId', isEqualTo: orgId)
          .where('branchId', isEqualTo: branchId)
          .where('isActive', isEqualTo: true)
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<TableModel?> getById(String tableId) async {
    try {
      final doc = await _col.doc(tableId).get();
      return doc.data();
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<void> setCurrentOrder(String tableId, String? orderId) async {
    try {
      await _db.doc(FirestorePaths.table(tableId)).update({
        'currentOrderId': orderId,
      });
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }
}

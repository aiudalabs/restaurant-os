import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/station.dart';
import '../utils/firestore_paths.dart';
import '../utils/app_exceptions.dart';

class StationRepository {
  StationRepository(this._db);
  final FirebaseFirestore _db;

  CollectionReference<Station> get _col => _db
      .collection(FirestorePaths.stations)
      .withConverter(
        fromFirestore: (doc, _) => Station.fromFirestore(doc),
        toFirestore: (station, _) => station.toFirestore(),
      );

  Stream<List<Station>> watchByBranch({
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

  Future<Station?> getById(String stationId) async {
    try {
      final doc = await _col.doc(stationId).get();
      return doc.data();
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<void> updateFcmTokens(
      String stationId, List<String> fcmTokens) async {
    try {
      await _db.doc(FirestorePaths.station(stationId)).update({
        'fcmTokens': fcmTokens,
      });
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }
}

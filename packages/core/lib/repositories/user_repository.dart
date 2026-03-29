import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/app_user.dart';
import '../utils/firestore_paths.dart';
import '../utils/app_exceptions.dart';

class UserRepository {
  UserRepository(this._db);
  final FirebaseFirestore _db;

  CollectionReference<AppUser> get _col => _db
      .collection(FirestorePaths.users)
      .withConverter(
        fromFirestore: (doc, _) => AppUser.fromFirestore(doc),
        toFirestore: (user, _) => user.toFirestore(),
      );

  Future<AppUser?> getById(String userId) async {
    try {
      final doc = await _col.doc(userId).get();
      return doc.data();
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Stream<List<AppUser>> watchByOrg({required String orgId}) {
    try {
      return _col
          .where('orgId', isEqualTo: orgId)
          .where('isActive', isEqualTo: true)
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<void> updateLastLogin(String userId) async {
    try {
      await _db.doc(FirestorePaths.user(userId)).update({
        'lastLoginAt': FieldValue.serverTimestamp(),
      });
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }
}

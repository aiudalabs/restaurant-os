import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:core/core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'station_provider.g.dart';

@Riverpod(keepAlive: true)
Future<Station?> activeStation(Ref ref) async {
  final session = ref.watch(sessionNotifierProvider);
  if (session?.stationId == null) return null;

  final firestore = ref.read(firestoreProvider);
  try {
    final doc = await firestore
        .collection(FirestorePaths.stations)
        .doc(session!.stationId!) // safe: null check above
        .get();

    if (!doc.exists) return null;
    return Station.fromFirestore(doc);
  } on FirebaseException catch (e) {
    throw AppException.fromFirebase(e);
  }
}

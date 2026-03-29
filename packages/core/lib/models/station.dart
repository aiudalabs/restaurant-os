import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'station.freezed.dart';
part 'station.g.dart';

@freezed
class Station with _$Station {
  const factory Station({
    required String id,
    required String orgId,
    required String branchId,
    required String name,
    required List<String> categoryIds,
    required List<String> fcmTokens,
    required String color,
    required bool isActive,
  }) = _Station;

  factory Station.fromJson(Map<String, dynamic> json) =>
      _$StationFromJson(json);

  factory Station.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Station.fromJson({
      ...data,
      'id': doc.id,
    });
  }

  const Station._();

  Map<String, dynamic> toFirestore() => toJson()..remove('id');
}

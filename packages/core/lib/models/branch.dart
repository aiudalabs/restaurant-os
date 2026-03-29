import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'branch.freezed.dart';
part 'branch.g.dart';

@freezed
class BusinessHoursEntry with _$BusinessHoursEntry {
  const factory BusinessHoursEntry({
    required String open,
    required String close,
  }) = _BusinessHoursEntry;

  factory BusinessHoursEntry.fromJson(Map<String, dynamic> json) =>
      _$BusinessHoursEntryFromJson(json);
}

@freezed
class Branch with _$Branch {
  @JsonSerializable(explicitToJson: true)
  const factory Branch({
    required String id,
    required String orgId,
    required String name,
    required String address,
    String? phone,
    required String menuId,
    double? taxPercent,
    List<double>? tipOptions,
    required bool isActive,
    required Map<String, BusinessHoursEntry> businessHours,
    required DateTime createdAt,
  }) = _Branch;

  factory Branch.fromJson(Map<String, dynamic> json) =>
      _$BranchFromJson(json);

  factory Branch.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Branch.fromJson({
      ...data,
      'id': doc.id,
      'createdAt':
          (data['createdAt'] as Timestamp).toDate().toIso8601String(),
    });
  }

  const Branch._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id'),
        'createdAt': Timestamp.fromDate(createdAt),
      };
}

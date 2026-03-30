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
    @Default('') String address,
    String? phone,
    @Default('') String menuId,
    double? taxPercent,
    List<double>? tipOptions,
    @Default(true) bool isActive,
    @Default({}) Map<String, BusinessHoursEntry> businessHours,
    required DateTime createdAt,
  }) = _Branch;

  factory Branch.fromJson(Map<String, dynamic> json) =>
      _$BranchFromJson(json);

  factory Branch.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = Map<String, dynamic>.from(doc.data()!);
    // Ensure businessHours is a Map, not a List or other type
    if (data['businessHours'] is! Map) {
      data['businessHours'] = <String, dynamic>{};
    }
    final createdAt = data['createdAt'];
    data['id'] = doc.id;
    data['createdAt'] = createdAt is Timestamp
        ? createdAt.toDate().toIso8601String()
        : DateTime.now().toIso8601String();
    return Branch.fromJson(data);
  }

  const Branch._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id'),
        'createdAt': Timestamp.fromDate(createdAt),
      };
}

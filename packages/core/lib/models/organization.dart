import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'organization.freezed.dart';
part 'organization.g.dart';

@freezed
class Organization with _$Organization {
  const factory Organization({
    required String id,
    @Default('') String name,
    @Default('') String slug,
    String? logoUrl,
    @Default('free') String plan,
    DateTime? planExpiresAt,
    @Default('USD') String defaultCurrency,
    @Default(0.07) double defaultTaxPercent,
    @Default([10, 15, 20]) List<double> defaultTipOptions,
    @Default('America/Panama') String timezone,
    @Default(true) bool isActive,
    required DateTime createdAt,
    @Default('') String ownerId,
  }) = _Organization;

  factory Organization.fromJson(Map<String, dynamic> json) =>
      _$OrganizationFromJson(json);

  factory Organization.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = Map<String, dynamic>.from(doc.data()!);
    data['id'] = doc.id;
    final createdAt = data['createdAt'];
    data['createdAt'] = createdAt is Timestamp
        ? createdAt.toDate().toIso8601String()
        : DateTime.now().toIso8601String();
    final planExpires = data['planExpiresAt'];
    if (planExpires is Timestamp) {
      data['planExpiresAt'] = planExpires.toDate().toIso8601String();
    }
    // Ensure defaultTipOptions is a List, not something else
    if (data['defaultTipOptions'] is! List) {
      data.remove('defaultTipOptions');
    }
    return Organization.fromJson(data);
  }

  const Organization._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id'),
        'createdAt': Timestamp.fromDate(createdAt),
        if (planExpiresAt != null)
          'planExpiresAt': Timestamp.fromDate(planExpiresAt!),
      };
}

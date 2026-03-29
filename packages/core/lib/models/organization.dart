import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'organization.freezed.dart';
part 'organization.g.dart';

@freezed
class Organization with _$Organization {
  const factory Organization({
    required String id,
    required String name,
    required String slug,
    String? logoUrl,
    required String plan,
    DateTime? planExpiresAt,
    required String defaultCurrency,
    required double defaultTaxPercent,
    required List<double> defaultTipOptions,
    required String timezone,
    required bool isActive,
    required DateTime createdAt,
    required String ownerId,
  }) = _Organization;

  factory Organization.fromJson(Map<String, dynamic> json) =>
      _$OrganizationFromJson(json);

  factory Organization.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Organization.fromJson({
      ...data,
      'id': doc.id,
      'createdAt':
          (data['createdAt'] as Timestamp).toDate().toIso8601String(),
      'planExpiresAt': data['planExpiresAt'] != null
          ? (data['planExpiresAt'] as Timestamp).toDate().toIso8601String()
          : null,
    });
  }

  const Organization._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id'),
        'createdAt': Timestamp.fromDate(createdAt),
        if (planExpiresAt != null)
          'planExpiresAt': Timestamp.fromDate(planExpiresAt!),
      };
}

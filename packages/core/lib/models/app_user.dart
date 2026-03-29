import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_user.freezed.dart';
part 'app_user.g.dart';

enum UserRole {
  admin,
  manager,
  operator;

  static UserRole fromString(String v) =>
      UserRole.values.firstWhere((e) => e.name == v, orElse: () => operator);
}

@freezed
class AppUser with _$AppUser {
  const factory AppUser({
    required String id,
    required String orgId,
    required List<String> branchIds,
    required String email,
    required String displayName,
    required UserRole role,
    String? stationId,
    required bool isActive,
    required DateTime createdAt,
    DateTime? lastLoginAt,
  }) = _AppUser;

  factory AppUser.fromJson(Map<String, dynamic> json) =>
      _$AppUserFromJson(json);

  factory AppUser.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return AppUser.fromJson({
      ...data,
      'id': doc.id,
      'role': data['role'] as String,
      'createdAt':
          (data['createdAt'] as Timestamp).toDate().toIso8601String(),
      'lastLoginAt': data['lastLoginAt'] != null
          ? (data['lastLoginAt'] as Timestamp).toDate().toIso8601String()
          : null,
    });
  }

  const AppUser._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id'),
        'role': role.name,
        'createdAt': Timestamp.fromDate(createdAt),
        if (lastLoginAt != null)
          'lastLoginAt': Timestamp.fromDate(lastLoginAt!),
      };
}

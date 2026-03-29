import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'menu.freezed.dart';
part 'menu.g.dart';

@freezed
class Menu with _$Menu {
  const factory Menu({
    required String id,
    required String orgId,
    required String name,
    required bool isActive,
    required DateTime createdAt,
  }) = _Menu;

  factory Menu.fromJson(Map<String, dynamic> json) => _$MenuFromJson(json);

  factory Menu.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Menu.fromJson({
      ...data,
      'id': doc.id,
      'createdAt':
          (data['createdAt'] as Timestamp).toDate().toIso8601String(),
    });
  }

  const Menu._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id'),
        'createdAt': Timestamp.fromDate(createdAt),
      };
}

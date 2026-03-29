import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'category.freezed.dart';
part 'category.g.dart';

@freezed
class Category with _$Category {
  const factory Category({
    required String id,
    required String orgId,
    required String menuId,
    required String name,
    String? imageUrl,
    required int sortOrder,
    required bool isActive,
    String? availableFrom,
    String? availableTo,
    List<int>? availableDays,
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) =>
      _$CategoryFromJson(json);

  factory Category.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Category.fromJson({
      ...data,
      'id': doc.id,
    });
  }

  const Category._();

  Map<String, dynamic> toFirestore() => toJson()..remove('id');
}

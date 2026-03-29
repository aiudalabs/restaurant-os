import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'product.freezed.dart';
part 'product.g.dart';

@freezed
class ModifierOption with _$ModifierOption {
  const factory ModifierOption({
    required String id,
    required String name,
    required double extraPrice,
    required bool isDefault,
  }) = _ModifierOption;

  factory ModifierOption.fromJson(Map<String, dynamic> json) =>
      _$ModifierOptionFromJson(json);
}

@freezed
class ModifierGroup with _$ModifierGroup {
  @JsonSerializable(explicitToJson: true)
  const factory ModifierGroup({
    required String id,
    required String name,
    required bool required,
    required bool multiSelect,
    required int minSelect,
    required int maxSelect,
    required List<ModifierOption> options,
  }) = _ModifierGroup;

  factory ModifierGroup.fromJson(Map<String, dynamic> json) =>
      _$ModifierGroupFromJson(json);
}

@freezed
class Product with _$Product {
  @JsonSerializable(explicitToJson: true)
  const factory Product({
    required String id,
    required String orgId,
    required String menuId,
    required String categoryId,
    required String name,
    String? description,
    String? imageUrl,
    required double price,
    required bool isActive,
    required int sortOrder,
    required List<String> tags,
    required List<ModifierGroup> modifierGroups,
    int? preparationMinutes,
  }) = _Product;

  factory Product.fromJson(Map<String, dynamic> json) =>
      _$ProductFromJson(json);

  factory Product.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Product.fromJson({
      ...data,
      'id': doc.id,
    });
  }

  const Product._();

  Map<String, dynamic> toFirestore() => toJson()..remove('id');
}

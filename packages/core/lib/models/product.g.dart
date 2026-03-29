// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'product.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ModifierOptionImpl _$$ModifierOptionImplFromJson(Map<String, dynamic> json) =>
    _$ModifierOptionImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      extraPrice: (json['extraPrice'] as num).toDouble(),
      isDefault: json['isDefault'] as bool,
    );

Map<String, dynamic> _$$ModifierOptionImplToJson(
        _$ModifierOptionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'extraPrice': instance.extraPrice,
      'isDefault': instance.isDefault,
    };

_$ModifierGroupImpl _$$ModifierGroupImplFromJson(Map<String, dynamic> json) =>
    _$ModifierGroupImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      required: json['required'] as bool,
      multiSelect: json['multiSelect'] as bool,
      minSelect: (json['minSelect'] as num).toInt(),
      maxSelect: (json['maxSelect'] as num).toInt(),
      options: (json['options'] as List<dynamic>)
          .map((e) => ModifierOption.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$$ModifierGroupImplToJson(_$ModifierGroupImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'required': instance.required,
      'multiSelect': instance.multiSelect,
      'minSelect': instance.minSelect,
      'maxSelect': instance.maxSelect,
      'options': instance.options.map((e) => e.toJson()).toList(),
    };

_$ProductImpl _$$ProductImplFromJson(Map<String, dynamic> json) =>
    _$ProductImpl(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      menuId: json['menuId'] as String,
      categoryId: json['categoryId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      price: (json['price'] as num).toDouble(),
      isActive: json['isActive'] as bool,
      sortOrder: (json['sortOrder'] as num).toInt(),
      tags: (json['tags'] as List<dynamic>).map((e) => e as String).toList(),
      modifierGroups: (json['modifierGroups'] as List<dynamic>)
          .map((e) => ModifierGroup.fromJson(e as Map<String, dynamic>))
          .toList(),
      preparationMinutes: (json['preparationMinutes'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$ProductImplToJson(_$ProductImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orgId': instance.orgId,
      'menuId': instance.menuId,
      'categoryId': instance.categoryId,
      'name': instance.name,
      'description': instance.description,
      'imageUrl': instance.imageUrl,
      'price': instance.price,
      'isActive': instance.isActive,
      'sortOrder': instance.sortOrder,
      'tags': instance.tags,
      'modifierGroups': instance.modifierGroups.map((e) => e.toJson()).toList(),
      'preparationMinutes': instance.preparationMinutes,
    };

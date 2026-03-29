// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'category.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CategoryImpl _$$CategoryImplFromJson(Map<String, dynamic> json) =>
    _$CategoryImpl(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      menuId: json['menuId'] as String,
      name: json['name'] as String,
      imageUrl: json['imageUrl'] as String?,
      sortOrder: (json['sortOrder'] as num).toInt(),
      isActive: json['isActive'] as bool,
      availableFrom: json['availableFrom'] as String?,
      availableTo: json['availableTo'] as String?,
      availableDays: (json['availableDays'] as List<dynamic>?)
          ?.map((e) => (e as num).toInt())
          .toList(),
    );

Map<String, dynamic> _$$CategoryImplToJson(_$CategoryImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orgId': instance.orgId,
      'menuId': instance.menuId,
      'name': instance.name,
      'imageUrl': instance.imageUrl,
      'sortOrder': instance.sortOrder,
      'isActive': instance.isActive,
      'availableFrom': instance.availableFrom,
      'availableTo': instance.availableTo,
      'availableDays': instance.availableDays,
    };

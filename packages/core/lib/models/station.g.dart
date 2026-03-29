// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'station.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$StationImpl _$$StationImplFromJson(Map<String, dynamic> json) =>
    _$StationImpl(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      branchId: json['branchId'] as String,
      name: json['name'] as String,
      categoryIds: (json['categoryIds'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      fcmTokens:
          (json['fcmTokens'] as List<dynamic>).map((e) => e as String).toList(),
      color: json['color'] as String,
      isActive: json['isActive'] as bool,
    );

Map<String, dynamic> _$$StationImplToJson(_$StationImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orgId': instance.orgId,
      'branchId': instance.branchId,
      'name': instance.name,
      'categoryIds': instance.categoryIds,
      'fcmTokens': instance.fcmTokens,
      'color': instance.color,
      'isActive': instance.isActive,
    };

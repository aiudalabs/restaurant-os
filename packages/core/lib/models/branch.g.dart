// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'branch.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$BusinessHoursEntryImpl _$$BusinessHoursEntryImplFromJson(
        Map<String, dynamic> json) =>
    _$BusinessHoursEntryImpl(
      open: json['open'] as String,
      close: json['close'] as String,
    );

Map<String, dynamic> _$$BusinessHoursEntryImplToJson(
        _$BusinessHoursEntryImpl instance) =>
    <String, dynamic>{
      'open': instance.open,
      'close': instance.close,
    };

_$BranchImpl _$$BranchImplFromJson(Map<String, dynamic> json) => _$BranchImpl(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      phone: json['phone'] as String?,
      menuId: json['menuId'] as String,
      taxPercent: (json['taxPercent'] as num?)?.toDouble(),
      tipOptions: (json['tipOptions'] as List<dynamic>?)
          ?.map((e) => (e as num).toDouble())
          .toList(),
      isActive: json['isActive'] as bool,
      businessHours: (json['businessHours'] as Map<String, dynamic>).map(
        (k, e) =>
            MapEntry(k, BusinessHoursEntry.fromJson(e as Map<String, dynamic>)),
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$$BranchImplToJson(_$BranchImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orgId': instance.orgId,
      'name': instance.name,
      'address': instance.address,
      'phone': instance.phone,
      'menuId': instance.menuId,
      'taxPercent': instance.taxPercent,
      'tipOptions': instance.tipOptions,
      'isActive': instance.isActive,
      'businessHours':
          instance.businessHours.map((k, e) => MapEntry(k, e.toJson())),
      'createdAt': instance.createdAt.toIso8601String(),
    };

// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'table_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TableModelImpl _$$TableModelImplFromJson(Map<String, dynamic> json) =>
    _$TableModelImpl(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      branchId: json['branchId'] as String,
      number: json['number'] as String,
      zone: json['zone'] as String?,
      capacity: (json['capacity'] as num).toInt(),
      qrData: json['qrData'] as String,
      isActive: json['isActive'] as bool,
      currentOrderId: json['currentOrderId'] as String?,
    );

Map<String, dynamic> _$$TableModelImplToJson(_$TableModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orgId': instance.orgId,
      'branchId': instance.branchId,
      'number': instance.number,
      'zone': instance.zone,
      'capacity': instance.capacity,
      'qrData': instance.qrData,
      'isActive': instance.isActive,
      'currentOrderId': instance.currentOrderId,
    };

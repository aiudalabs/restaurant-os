// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$OrderItemModifierImpl _$$OrderItemModifierImplFromJson(
        Map<String, dynamic> json) =>
    _$OrderItemModifierImpl(
      name: json['name'] as String,
      value: json['value'] as String,
      extraPrice: (json['extraPrice'] as num).toDouble(),
    );

Map<String, dynamic> _$$OrderItemModifierImplToJson(
        _$OrderItemModifierImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'value': instance.value,
      'extraPrice': instance.extraPrice,
    };

_$OrderItemImpl _$$OrderItemImplFromJson(Map<String, dynamic> json) =>
    _$OrderItemImpl(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      branchId: json['branchId'] as String,
      orderId: json['orderId'] as String,
      stationId: json['stationId'] as String,
      tableNumber: json['tableNumber'] as String,
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      categoryId: json['categoryId'] as String,
      quantity: (json['quantity'] as num).toInt(),
      unitPrice: (json['unitPrice'] as num).toDouble(),
      totalPrice: (json['totalPrice'] as num).toDouble(),
      modifiers: (json['modifiers'] as List<dynamic>)
          .map((e) => OrderItemModifier.fromJson(e as Map<String, dynamic>))
          .toList(),
      specialInstructions: json['specialInstructions'] as String?,
      status: $enumDecode(_$ItemStatusEnumMap, json['status']),
      sentToStationAt: DateTime.parse(json['sentToStationAt'] as String),
      startedAt: json['startedAt'] == null
          ? null
          : DateTime.parse(json['startedAt'] as String),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
    );

Map<String, dynamic> _$$OrderItemImplToJson(_$OrderItemImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orgId': instance.orgId,
      'branchId': instance.branchId,
      'orderId': instance.orderId,
      'stationId': instance.stationId,
      'tableNumber': instance.tableNumber,
      'productId': instance.productId,
      'productName': instance.productName,
      'categoryId': instance.categoryId,
      'quantity': instance.quantity,
      'unitPrice': instance.unitPrice,
      'totalPrice': instance.totalPrice,
      'modifiers': instance.modifiers.map((e) => e.toJson()).toList(),
      'specialInstructions': instance.specialInstructions,
      'status': _$ItemStatusEnumMap[instance.status]!,
      'sentToStationAt': instance.sentToStationAt.toIso8601String(),
      'startedAt': instance.startedAt?.toIso8601String(),
      'completedAt': instance.completedAt?.toIso8601String(),
    };

const _$ItemStatusEnumMap = {
  ItemStatus.queued: 'queued',
  ItemStatus.inProgress: 'inProgress',
  ItemStatus.done: 'done',
  ItemStatus.cancelled: 'cancelled',
};

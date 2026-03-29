// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PaymentInfoImpl _$$PaymentInfoImplFromJson(Map<String, dynamic> json) =>
    _$PaymentInfoImpl(
      method: json['method'] as String?,
      status: json['status'] as String?,
      yappyOrderId: json['yappyOrderId'] as String?,
      confirmationNumber: json['confirmationNumber'] as String?,
      paidAt: json['paidAt'] == null
          ? null
          : DateTime.parse(json['paidAt'] as String),
    );

Map<String, dynamic> _$$PaymentInfoImplToJson(_$PaymentInfoImpl instance) =>
    <String, dynamic>{
      'method': instance.method,
      'status': instance.status,
      'yappyOrderId': instance.yappyOrderId,
      'confirmationNumber': instance.confirmationNumber,
      'paidAt': instance.paidAt?.toIso8601String(),
    };

_$OrderImpl _$$OrderImplFromJson(Map<String, dynamic> json) => _$OrderImpl(
      id: json['id'] as String,
      orgId: json['orgId'] as String,
      branchId: json['branchId'] as String,
      tableId: json['tableId'] as String,
      tableNumber: json['tableNumber'] as String,
      status: $enumDecode(_$OrderStatusEnumMap, json['status']),
      subtotal: (json['subtotal'] as num).toDouble(),
      taxAmount: (json['taxAmount'] as num).toDouble(),
      taxPercent: (json['taxPercent'] as num).toDouble(),
      tipAmount: (json['tipAmount'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      notes: json['notes'] as String?,
      itemCount: (json['itemCount'] as num).toInt(),
      payment: PaymentInfo.fromJson(json['payment'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
    );

Map<String, dynamic> _$$OrderImplToJson(_$OrderImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orgId': instance.orgId,
      'branchId': instance.branchId,
      'tableId': instance.tableId,
      'tableNumber': instance.tableNumber,
      'status': _$OrderStatusEnumMap[instance.status]!,
      'subtotal': instance.subtotal,
      'taxAmount': instance.taxAmount,
      'taxPercent': instance.taxPercent,
      'tipAmount': instance.tipAmount,
      'total': instance.total,
      'notes': instance.notes,
      'itemCount': instance.itemCount,
      'payment': instance.payment,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'completedAt': instance.completedAt?.toIso8601String(),
    };

const _$OrderStatusEnumMap = {
  OrderStatus.pending: 'pending',
  OrderStatus.confirmed: 'confirmed',
  OrderStatus.inPreparation: 'inPreparation',
  OrderStatus.ready: 'ready',
  OrderStatus.delivered: 'delivered',
  OrderStatus.cancelled: 'cancelled',
  OrderStatus.closed: 'closed',
};

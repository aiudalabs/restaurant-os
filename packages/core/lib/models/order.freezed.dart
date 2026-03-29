// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'order.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

PaymentInfo _$PaymentInfoFromJson(Map<String, dynamic> json) {
  return _PaymentInfo.fromJson(json);
}

/// @nodoc
mixin _$PaymentInfo {
  String? get method => throw _privateConstructorUsedError;
  String? get status => throw _privateConstructorUsedError;
  String? get yappyOrderId => throw _privateConstructorUsedError;
  String? get confirmationNumber => throw _privateConstructorUsedError;
  DateTime? get paidAt => throw _privateConstructorUsedError;

  /// Serializes this PaymentInfo to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of PaymentInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PaymentInfoCopyWith<PaymentInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PaymentInfoCopyWith<$Res> {
  factory $PaymentInfoCopyWith(
          PaymentInfo value, $Res Function(PaymentInfo) then) =
      _$PaymentInfoCopyWithImpl<$Res, PaymentInfo>;
  @useResult
  $Res call(
      {String? method,
      String? status,
      String? yappyOrderId,
      String? confirmationNumber,
      DateTime? paidAt});
}

/// @nodoc
class _$PaymentInfoCopyWithImpl<$Res, $Val extends PaymentInfo>
    implements $PaymentInfoCopyWith<$Res> {
  _$PaymentInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of PaymentInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? method = freezed,
    Object? status = freezed,
    Object? yappyOrderId = freezed,
    Object? confirmationNumber = freezed,
    Object? paidAt = freezed,
  }) {
    return _then(_value.copyWith(
      method: freezed == method
          ? _value.method
          : method // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      yappyOrderId: freezed == yappyOrderId
          ? _value.yappyOrderId
          : yappyOrderId // ignore: cast_nullable_to_non_nullable
              as String?,
      confirmationNumber: freezed == confirmationNumber
          ? _value.confirmationNumber
          : confirmationNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      paidAt: freezed == paidAt
          ? _value.paidAt
          : paidAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PaymentInfoImplCopyWith<$Res>
    implements $PaymentInfoCopyWith<$Res> {
  factory _$$PaymentInfoImplCopyWith(
          _$PaymentInfoImpl value, $Res Function(_$PaymentInfoImpl) then) =
      __$$PaymentInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String? method,
      String? status,
      String? yappyOrderId,
      String? confirmationNumber,
      DateTime? paidAt});
}

/// @nodoc
class __$$PaymentInfoImplCopyWithImpl<$Res>
    extends _$PaymentInfoCopyWithImpl<$Res, _$PaymentInfoImpl>
    implements _$$PaymentInfoImplCopyWith<$Res> {
  __$$PaymentInfoImplCopyWithImpl(
      _$PaymentInfoImpl _value, $Res Function(_$PaymentInfoImpl) _then)
      : super(_value, _then);

  /// Create a copy of PaymentInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? method = freezed,
    Object? status = freezed,
    Object? yappyOrderId = freezed,
    Object? confirmationNumber = freezed,
    Object? paidAt = freezed,
  }) {
    return _then(_$PaymentInfoImpl(
      method: freezed == method
          ? _value.method
          : method // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      yappyOrderId: freezed == yappyOrderId
          ? _value.yappyOrderId
          : yappyOrderId // ignore: cast_nullable_to_non_nullable
              as String?,
      confirmationNumber: freezed == confirmationNumber
          ? _value.confirmationNumber
          : confirmationNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      paidAt: freezed == paidAt
          ? _value.paidAt
          : paidAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PaymentInfoImpl implements _PaymentInfo {
  const _$PaymentInfoImpl(
      {this.method,
      this.status,
      this.yappyOrderId,
      this.confirmationNumber,
      this.paidAt});

  factory _$PaymentInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$PaymentInfoImplFromJson(json);

  @override
  final String? method;
  @override
  final String? status;
  @override
  final String? yappyOrderId;
  @override
  final String? confirmationNumber;
  @override
  final DateTime? paidAt;

  @override
  String toString() {
    return 'PaymentInfo(method: $method, status: $status, yappyOrderId: $yappyOrderId, confirmationNumber: $confirmationNumber, paidAt: $paidAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PaymentInfoImpl &&
            (identical(other.method, method) || other.method == method) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.yappyOrderId, yappyOrderId) ||
                other.yappyOrderId == yappyOrderId) &&
            (identical(other.confirmationNumber, confirmationNumber) ||
                other.confirmationNumber == confirmationNumber) &&
            (identical(other.paidAt, paidAt) || other.paidAt == paidAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, method, status, yappyOrderId, confirmationNumber, paidAt);

  /// Create a copy of PaymentInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PaymentInfoImplCopyWith<_$PaymentInfoImpl> get copyWith =>
      __$$PaymentInfoImplCopyWithImpl<_$PaymentInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PaymentInfoImplToJson(
      this,
    );
  }
}

abstract class _PaymentInfo implements PaymentInfo {
  const factory _PaymentInfo(
      {final String? method,
      final String? status,
      final String? yappyOrderId,
      final String? confirmationNumber,
      final DateTime? paidAt}) = _$PaymentInfoImpl;

  factory _PaymentInfo.fromJson(Map<String, dynamic> json) =
      _$PaymentInfoImpl.fromJson;

  @override
  String? get method;
  @override
  String? get status;
  @override
  String? get yappyOrderId;
  @override
  String? get confirmationNumber;
  @override
  DateTime? get paidAt;

  /// Create a copy of PaymentInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PaymentInfoImplCopyWith<_$PaymentInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Order _$OrderFromJson(Map<String, dynamic> json) {
  return _Order.fromJson(json);
}

/// @nodoc
mixin _$Order {
  String get id => throw _privateConstructorUsedError;
  String get orgId => throw _privateConstructorUsedError;
  String get branchId => throw _privateConstructorUsedError;
  String get tableId => throw _privateConstructorUsedError;
  String get tableNumber => throw _privateConstructorUsedError;
  OrderStatus get status => throw _privateConstructorUsedError;
  double get subtotal => throw _privateConstructorUsedError;
  double get taxAmount => throw _privateConstructorUsedError;
  double get taxPercent => throw _privateConstructorUsedError;
  double get tipAmount => throw _privateConstructorUsedError;
  double get total => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;
  int get itemCount => throw _privateConstructorUsedError;
  PaymentInfo get payment => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  DateTime get updatedAt => throw _privateConstructorUsedError;
  DateTime? get completedAt => throw _privateConstructorUsedError;

  /// Serializes this Order to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Order
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $OrderCopyWith<Order> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderCopyWith<$Res> {
  factory $OrderCopyWith(Order value, $Res Function(Order) then) =
      _$OrderCopyWithImpl<$Res, Order>;
  @useResult
  $Res call(
      {String id,
      String orgId,
      String branchId,
      String tableId,
      String tableNumber,
      OrderStatus status,
      double subtotal,
      double taxAmount,
      double taxPercent,
      double tipAmount,
      double total,
      String? notes,
      int itemCount,
      PaymentInfo payment,
      DateTime createdAt,
      DateTime updatedAt,
      DateTime? completedAt});

  $PaymentInfoCopyWith<$Res> get payment;
}

/// @nodoc
class _$OrderCopyWithImpl<$Res, $Val extends Order>
    implements $OrderCopyWith<$Res> {
  _$OrderCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Order
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? branchId = null,
    Object? tableId = null,
    Object? tableNumber = null,
    Object? status = null,
    Object? subtotal = null,
    Object? taxAmount = null,
    Object? taxPercent = null,
    Object? tipAmount = null,
    Object? total = null,
    Object? notes = freezed,
    Object? itemCount = null,
    Object? payment = null,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? completedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      orgId: null == orgId
          ? _value.orgId
          : orgId // ignore: cast_nullable_to_non_nullable
              as String,
      branchId: null == branchId
          ? _value.branchId
          : branchId // ignore: cast_nullable_to_non_nullable
              as String,
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as OrderStatus,
      subtotal: null == subtotal
          ? _value.subtotal
          : subtotal // ignore: cast_nullable_to_non_nullable
              as double,
      taxAmount: null == taxAmount
          ? _value.taxAmount
          : taxAmount // ignore: cast_nullable_to_non_nullable
              as double,
      taxPercent: null == taxPercent
          ? _value.taxPercent
          : taxPercent // ignore: cast_nullable_to_non_nullable
              as double,
      tipAmount: null == tipAmount
          ? _value.tipAmount
          : tipAmount // ignore: cast_nullable_to_non_nullable
              as double,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as double,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      itemCount: null == itemCount
          ? _value.itemCount
          : itemCount // ignore: cast_nullable_to_non_nullable
              as int,
      payment: null == payment
          ? _value.payment
          : payment // ignore: cast_nullable_to_non_nullable
              as PaymentInfo,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }

  /// Create a copy of Order
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $PaymentInfoCopyWith<$Res> get payment {
    return $PaymentInfoCopyWith<$Res>(_value.payment, (value) {
      return _then(_value.copyWith(payment: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$OrderImplCopyWith<$Res> implements $OrderCopyWith<$Res> {
  factory _$$OrderImplCopyWith(
          _$OrderImpl value, $Res Function(_$OrderImpl) then) =
      __$$OrderImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String orgId,
      String branchId,
      String tableId,
      String tableNumber,
      OrderStatus status,
      double subtotal,
      double taxAmount,
      double taxPercent,
      double tipAmount,
      double total,
      String? notes,
      int itemCount,
      PaymentInfo payment,
      DateTime createdAt,
      DateTime updatedAt,
      DateTime? completedAt});

  @override
  $PaymentInfoCopyWith<$Res> get payment;
}

/// @nodoc
class __$$OrderImplCopyWithImpl<$Res>
    extends _$OrderCopyWithImpl<$Res, _$OrderImpl>
    implements _$$OrderImplCopyWith<$Res> {
  __$$OrderImplCopyWithImpl(
      _$OrderImpl _value, $Res Function(_$OrderImpl) _then)
      : super(_value, _then);

  /// Create a copy of Order
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? branchId = null,
    Object? tableId = null,
    Object? tableNumber = null,
    Object? status = null,
    Object? subtotal = null,
    Object? taxAmount = null,
    Object? taxPercent = null,
    Object? tipAmount = null,
    Object? total = null,
    Object? notes = freezed,
    Object? itemCount = null,
    Object? payment = null,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? completedAt = freezed,
  }) {
    return _then(_$OrderImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      orgId: null == orgId
          ? _value.orgId
          : orgId // ignore: cast_nullable_to_non_nullable
              as String,
      branchId: null == branchId
          ? _value.branchId
          : branchId // ignore: cast_nullable_to_non_nullable
              as String,
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as OrderStatus,
      subtotal: null == subtotal
          ? _value.subtotal
          : subtotal // ignore: cast_nullable_to_non_nullable
              as double,
      taxAmount: null == taxAmount
          ? _value.taxAmount
          : taxAmount // ignore: cast_nullable_to_non_nullable
              as double,
      taxPercent: null == taxPercent
          ? _value.taxPercent
          : taxPercent // ignore: cast_nullable_to_non_nullable
              as double,
      tipAmount: null == tipAmount
          ? _value.tipAmount
          : tipAmount // ignore: cast_nullable_to_non_nullable
              as double,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as double,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      itemCount: null == itemCount
          ? _value.itemCount
          : itemCount // ignore: cast_nullable_to_non_nullable
              as int,
      payment: null == payment
          ? _value.payment
          : payment // ignore: cast_nullable_to_non_nullable
              as PaymentInfo,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OrderImpl extends _Order {
  const _$OrderImpl(
      {required this.id,
      required this.orgId,
      required this.branchId,
      required this.tableId,
      required this.tableNumber,
      required this.status,
      required this.subtotal,
      required this.taxAmount,
      required this.taxPercent,
      required this.tipAmount,
      required this.total,
      this.notes,
      required this.itemCount,
      required this.payment,
      required this.createdAt,
      required this.updatedAt,
      this.completedAt})
      : super._();

  factory _$OrderImpl.fromJson(Map<String, dynamic> json) =>
      _$$OrderImplFromJson(json);

  @override
  final String id;
  @override
  final String orgId;
  @override
  final String branchId;
  @override
  final String tableId;
  @override
  final String tableNumber;
  @override
  final OrderStatus status;
  @override
  final double subtotal;
  @override
  final double taxAmount;
  @override
  final double taxPercent;
  @override
  final double tipAmount;
  @override
  final double total;
  @override
  final String? notes;
  @override
  final int itemCount;
  @override
  final PaymentInfo payment;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;
  @override
  final DateTime? completedAt;

  @override
  String toString() {
    return 'Order(id: $id, orgId: $orgId, branchId: $branchId, tableId: $tableId, tableNumber: $tableNumber, status: $status, subtotal: $subtotal, taxAmount: $taxAmount, taxPercent: $taxPercent, tipAmount: $tipAmount, total: $total, notes: $notes, itemCount: $itemCount, payment: $payment, createdAt: $createdAt, updatedAt: $updatedAt, completedAt: $completedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.orgId, orgId) || other.orgId == orgId) &&
            (identical(other.branchId, branchId) ||
                other.branchId == branchId) &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.subtotal, subtotal) ||
                other.subtotal == subtotal) &&
            (identical(other.taxAmount, taxAmount) ||
                other.taxAmount == taxAmount) &&
            (identical(other.taxPercent, taxPercent) ||
                other.taxPercent == taxPercent) &&
            (identical(other.tipAmount, tipAmount) ||
                other.tipAmount == tipAmount) &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.notes, notes) || other.notes == notes) &&
            (identical(other.itemCount, itemCount) ||
                other.itemCount == itemCount) &&
            (identical(other.payment, payment) || other.payment == payment) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.completedAt, completedAt) ||
                other.completedAt == completedAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      orgId,
      branchId,
      tableId,
      tableNumber,
      status,
      subtotal,
      taxAmount,
      taxPercent,
      tipAmount,
      total,
      notes,
      itemCount,
      payment,
      createdAt,
      updatedAt,
      completedAt);

  /// Create a copy of Order
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderImplCopyWith<_$OrderImpl> get copyWith =>
      __$$OrderImplCopyWithImpl<_$OrderImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OrderImplToJson(
      this,
    );
  }
}

abstract class _Order extends Order {
  const factory _Order(
      {required final String id,
      required final String orgId,
      required final String branchId,
      required final String tableId,
      required final String tableNumber,
      required final OrderStatus status,
      required final double subtotal,
      required final double taxAmount,
      required final double taxPercent,
      required final double tipAmount,
      required final double total,
      final String? notes,
      required final int itemCount,
      required final PaymentInfo payment,
      required final DateTime createdAt,
      required final DateTime updatedAt,
      final DateTime? completedAt}) = _$OrderImpl;
  const _Order._() : super._();

  factory _Order.fromJson(Map<String, dynamic> json) = _$OrderImpl.fromJson;

  @override
  String get id;
  @override
  String get orgId;
  @override
  String get branchId;
  @override
  String get tableId;
  @override
  String get tableNumber;
  @override
  OrderStatus get status;
  @override
  double get subtotal;
  @override
  double get taxAmount;
  @override
  double get taxPercent;
  @override
  double get tipAmount;
  @override
  double get total;
  @override
  String? get notes;
  @override
  int get itemCount;
  @override
  PaymentInfo get payment;
  @override
  DateTime get createdAt;
  @override
  DateTime get updatedAt;
  @override
  DateTime? get completedAt;

  /// Create a copy of Order
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$OrderImplCopyWith<_$OrderImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

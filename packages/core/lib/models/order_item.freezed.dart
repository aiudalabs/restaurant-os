// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'order_item.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

OrderItemModifier _$OrderItemModifierFromJson(Map<String, dynamic> json) {
  return _OrderItemModifier.fromJson(json);
}

/// @nodoc
mixin _$OrderItemModifier {
  String get name => throw _privateConstructorUsedError;
  String get value => throw _privateConstructorUsedError;
  double get extraPrice => throw _privateConstructorUsedError;

  /// Serializes this OrderItemModifier to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of OrderItemModifier
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $OrderItemModifierCopyWith<OrderItemModifier> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderItemModifierCopyWith<$Res> {
  factory $OrderItemModifierCopyWith(
          OrderItemModifier value, $Res Function(OrderItemModifier) then) =
      _$OrderItemModifierCopyWithImpl<$Res, OrderItemModifier>;
  @useResult
  $Res call({String name, String value, double extraPrice});
}

/// @nodoc
class _$OrderItemModifierCopyWithImpl<$Res, $Val extends OrderItemModifier>
    implements $OrderItemModifierCopyWith<$Res> {
  _$OrderItemModifierCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of OrderItemModifier
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? value = null,
    Object? extraPrice = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      value: null == value
          ? _value.value
          : value // ignore: cast_nullable_to_non_nullable
              as String,
      extraPrice: null == extraPrice
          ? _value.extraPrice
          : extraPrice // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OrderItemModifierImplCopyWith<$Res>
    implements $OrderItemModifierCopyWith<$Res> {
  factory _$$OrderItemModifierImplCopyWith(_$OrderItemModifierImpl value,
          $Res Function(_$OrderItemModifierImpl) then) =
      __$$OrderItemModifierImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String name, String value, double extraPrice});
}

/// @nodoc
class __$$OrderItemModifierImplCopyWithImpl<$Res>
    extends _$OrderItemModifierCopyWithImpl<$Res, _$OrderItemModifierImpl>
    implements _$$OrderItemModifierImplCopyWith<$Res> {
  __$$OrderItemModifierImplCopyWithImpl(_$OrderItemModifierImpl _value,
      $Res Function(_$OrderItemModifierImpl) _then)
      : super(_value, _then);

  /// Create a copy of OrderItemModifier
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? value = null,
    Object? extraPrice = null,
  }) {
    return _then(_$OrderItemModifierImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      value: null == value
          ? _value.value
          : value // ignore: cast_nullable_to_non_nullable
              as String,
      extraPrice: null == extraPrice
          ? _value.extraPrice
          : extraPrice // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OrderItemModifierImpl implements _OrderItemModifier {
  const _$OrderItemModifierImpl(
      {required this.name, required this.value, required this.extraPrice});

  factory _$OrderItemModifierImpl.fromJson(Map<String, dynamic> json) =>
      _$$OrderItemModifierImplFromJson(json);

  @override
  final String name;
  @override
  final String value;
  @override
  final double extraPrice;

  @override
  String toString() {
    return 'OrderItemModifier(name: $name, value: $value, extraPrice: $extraPrice)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderItemModifierImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.value, value) || other.value == value) &&
            (identical(other.extraPrice, extraPrice) ||
                other.extraPrice == extraPrice));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, name, value, extraPrice);

  /// Create a copy of OrderItemModifier
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderItemModifierImplCopyWith<_$OrderItemModifierImpl> get copyWith =>
      __$$OrderItemModifierImplCopyWithImpl<_$OrderItemModifierImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OrderItemModifierImplToJson(
      this,
    );
  }
}

abstract class _OrderItemModifier implements OrderItemModifier {
  const factory _OrderItemModifier(
      {required final String name,
      required final String value,
      required final double extraPrice}) = _$OrderItemModifierImpl;

  factory _OrderItemModifier.fromJson(Map<String, dynamic> json) =
      _$OrderItemModifierImpl.fromJson;

  @override
  String get name;
  @override
  String get value;
  @override
  double get extraPrice;

  /// Create a copy of OrderItemModifier
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$OrderItemModifierImplCopyWith<_$OrderItemModifierImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

OrderItem _$OrderItemFromJson(Map<String, dynamic> json) {
  return _OrderItem.fromJson(json);
}

/// @nodoc
mixin _$OrderItem {
  String get id => throw _privateConstructorUsedError;
  String get orgId => throw _privateConstructorUsedError;
  String get branchId => throw _privateConstructorUsedError;
  String get orderId => throw _privateConstructorUsedError;
  String get stationId => throw _privateConstructorUsedError;
  String get tableNumber => throw _privateConstructorUsedError;
  String get productId => throw _privateConstructorUsedError;
  String get productName => throw _privateConstructorUsedError;
  String get categoryId => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;
  double get unitPrice => throw _privateConstructorUsedError;
  double get totalPrice => throw _privateConstructorUsedError;
  List<OrderItemModifier> get modifiers => throw _privateConstructorUsedError;
  String? get specialInstructions => throw _privateConstructorUsedError;
  ItemStatus get status => throw _privateConstructorUsedError;
  DateTime get sentToStationAt => throw _privateConstructorUsedError;
  DateTime? get startedAt => throw _privateConstructorUsedError;
  DateTime? get completedAt => throw _privateConstructorUsedError;

  /// Serializes this OrderItem to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of OrderItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $OrderItemCopyWith<OrderItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderItemCopyWith<$Res> {
  factory $OrderItemCopyWith(OrderItem value, $Res Function(OrderItem) then) =
      _$OrderItemCopyWithImpl<$Res, OrderItem>;
  @useResult
  $Res call(
      {String id,
      String orgId,
      String branchId,
      String orderId,
      String stationId,
      String tableNumber,
      String productId,
      String productName,
      String categoryId,
      int quantity,
      double unitPrice,
      double totalPrice,
      List<OrderItemModifier> modifiers,
      String? specialInstructions,
      ItemStatus status,
      DateTime sentToStationAt,
      DateTime? startedAt,
      DateTime? completedAt});
}

/// @nodoc
class _$OrderItemCopyWithImpl<$Res, $Val extends OrderItem>
    implements $OrderItemCopyWith<$Res> {
  _$OrderItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of OrderItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? branchId = null,
    Object? orderId = null,
    Object? stationId = null,
    Object? tableNumber = null,
    Object? productId = null,
    Object? productName = null,
    Object? categoryId = null,
    Object? quantity = null,
    Object? unitPrice = null,
    Object? totalPrice = null,
    Object? modifiers = null,
    Object? specialInstructions = freezed,
    Object? status = null,
    Object? sentToStationAt = null,
    Object? startedAt = freezed,
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
      orderId: null == orderId
          ? _value.orderId
          : orderId // ignore: cast_nullable_to_non_nullable
              as String,
      stationId: null == stationId
          ? _value.stationId
          : stationId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      productName: null == productName
          ? _value.productName
          : productName // ignore: cast_nullable_to_non_nullable
              as String,
      categoryId: null == categoryId
          ? _value.categoryId
          : categoryId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      unitPrice: null == unitPrice
          ? _value.unitPrice
          : unitPrice // ignore: cast_nullable_to_non_nullable
              as double,
      totalPrice: null == totalPrice
          ? _value.totalPrice
          : totalPrice // ignore: cast_nullable_to_non_nullable
              as double,
      modifiers: null == modifiers
          ? _value.modifiers
          : modifiers // ignore: cast_nullable_to_non_nullable
              as List<OrderItemModifier>,
      specialInstructions: freezed == specialInstructions
          ? _value.specialInstructions
          : specialInstructions // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as ItemStatus,
      sentToStationAt: null == sentToStationAt
          ? _value.sentToStationAt
          : sentToStationAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OrderItemImplCopyWith<$Res>
    implements $OrderItemCopyWith<$Res> {
  factory _$$OrderItemImplCopyWith(
          _$OrderItemImpl value, $Res Function(_$OrderItemImpl) then) =
      __$$OrderItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String orgId,
      String branchId,
      String orderId,
      String stationId,
      String tableNumber,
      String productId,
      String productName,
      String categoryId,
      int quantity,
      double unitPrice,
      double totalPrice,
      List<OrderItemModifier> modifiers,
      String? specialInstructions,
      ItemStatus status,
      DateTime sentToStationAt,
      DateTime? startedAt,
      DateTime? completedAt});
}

/// @nodoc
class __$$OrderItemImplCopyWithImpl<$Res>
    extends _$OrderItemCopyWithImpl<$Res, _$OrderItemImpl>
    implements _$$OrderItemImplCopyWith<$Res> {
  __$$OrderItemImplCopyWithImpl(
      _$OrderItemImpl _value, $Res Function(_$OrderItemImpl) _then)
      : super(_value, _then);

  /// Create a copy of OrderItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? branchId = null,
    Object? orderId = null,
    Object? stationId = null,
    Object? tableNumber = null,
    Object? productId = null,
    Object? productName = null,
    Object? categoryId = null,
    Object? quantity = null,
    Object? unitPrice = null,
    Object? totalPrice = null,
    Object? modifiers = null,
    Object? specialInstructions = freezed,
    Object? status = null,
    Object? sentToStationAt = null,
    Object? startedAt = freezed,
    Object? completedAt = freezed,
  }) {
    return _then(_$OrderItemImpl(
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
      orderId: null == orderId
          ? _value.orderId
          : orderId // ignore: cast_nullable_to_non_nullable
              as String,
      stationId: null == stationId
          ? _value.stationId
          : stationId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      productName: null == productName
          ? _value.productName
          : productName // ignore: cast_nullable_to_non_nullable
              as String,
      categoryId: null == categoryId
          ? _value.categoryId
          : categoryId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      unitPrice: null == unitPrice
          ? _value.unitPrice
          : unitPrice // ignore: cast_nullable_to_non_nullable
              as double,
      totalPrice: null == totalPrice
          ? _value.totalPrice
          : totalPrice // ignore: cast_nullable_to_non_nullable
              as double,
      modifiers: null == modifiers
          ? _value._modifiers
          : modifiers // ignore: cast_nullable_to_non_nullable
              as List<OrderItemModifier>,
      specialInstructions: freezed == specialInstructions
          ? _value.specialInstructions
          : specialInstructions // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as ItemStatus,
      sentToStationAt: null == sentToStationAt
          ? _value.sentToStationAt
          : sentToStationAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$OrderItemImpl extends _OrderItem {
  const _$OrderItemImpl(
      {required this.id,
      required this.orgId,
      required this.branchId,
      required this.orderId,
      required this.stationId,
      required this.tableNumber,
      required this.productId,
      required this.productName,
      required this.categoryId,
      required this.quantity,
      required this.unitPrice,
      required this.totalPrice,
      required final List<OrderItemModifier> modifiers,
      this.specialInstructions,
      required this.status,
      required this.sentToStationAt,
      this.startedAt,
      this.completedAt})
      : _modifiers = modifiers,
        super._();

  factory _$OrderItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$OrderItemImplFromJson(json);

  @override
  final String id;
  @override
  final String orgId;
  @override
  final String branchId;
  @override
  final String orderId;
  @override
  final String stationId;
  @override
  final String tableNumber;
  @override
  final String productId;
  @override
  final String productName;
  @override
  final String categoryId;
  @override
  final int quantity;
  @override
  final double unitPrice;
  @override
  final double totalPrice;
  final List<OrderItemModifier> _modifiers;
  @override
  List<OrderItemModifier> get modifiers {
    if (_modifiers is EqualUnmodifiableListView) return _modifiers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_modifiers);
  }

  @override
  final String? specialInstructions;
  @override
  final ItemStatus status;
  @override
  final DateTime sentToStationAt;
  @override
  final DateTime? startedAt;
  @override
  final DateTime? completedAt;

  @override
  String toString() {
    return 'OrderItem(id: $id, orgId: $orgId, branchId: $branchId, orderId: $orderId, stationId: $stationId, tableNumber: $tableNumber, productId: $productId, productName: $productName, categoryId: $categoryId, quantity: $quantity, unitPrice: $unitPrice, totalPrice: $totalPrice, modifiers: $modifiers, specialInstructions: $specialInstructions, status: $status, sentToStationAt: $sentToStationAt, startedAt: $startedAt, completedAt: $completedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderItemImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.orgId, orgId) || other.orgId == orgId) &&
            (identical(other.branchId, branchId) ||
                other.branchId == branchId) &&
            (identical(other.orderId, orderId) || other.orderId == orderId) &&
            (identical(other.stationId, stationId) ||
                other.stationId == stationId) &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber) &&
            (identical(other.productId, productId) ||
                other.productId == productId) &&
            (identical(other.productName, productName) ||
                other.productName == productName) &&
            (identical(other.categoryId, categoryId) ||
                other.categoryId == categoryId) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            (identical(other.unitPrice, unitPrice) ||
                other.unitPrice == unitPrice) &&
            (identical(other.totalPrice, totalPrice) ||
                other.totalPrice == totalPrice) &&
            const DeepCollectionEquality()
                .equals(other._modifiers, _modifiers) &&
            (identical(other.specialInstructions, specialInstructions) ||
                other.specialInstructions == specialInstructions) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.sentToStationAt, sentToStationAt) ||
                other.sentToStationAt == sentToStationAt) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
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
      orderId,
      stationId,
      tableNumber,
      productId,
      productName,
      categoryId,
      quantity,
      unitPrice,
      totalPrice,
      const DeepCollectionEquality().hash(_modifiers),
      specialInstructions,
      status,
      sentToStationAt,
      startedAt,
      completedAt);

  /// Create a copy of OrderItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderItemImplCopyWith<_$OrderItemImpl> get copyWith =>
      __$$OrderItemImplCopyWithImpl<_$OrderItemImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OrderItemImplToJson(
      this,
    );
  }
}

abstract class _OrderItem extends OrderItem {
  const factory _OrderItem(
      {required final String id,
      required final String orgId,
      required final String branchId,
      required final String orderId,
      required final String stationId,
      required final String tableNumber,
      required final String productId,
      required final String productName,
      required final String categoryId,
      required final int quantity,
      required final double unitPrice,
      required final double totalPrice,
      required final List<OrderItemModifier> modifiers,
      final String? specialInstructions,
      required final ItemStatus status,
      required final DateTime sentToStationAt,
      final DateTime? startedAt,
      final DateTime? completedAt}) = _$OrderItemImpl;
  const _OrderItem._() : super._();

  factory _OrderItem.fromJson(Map<String, dynamic> json) =
      _$OrderItemImpl.fromJson;

  @override
  String get id;
  @override
  String get orgId;
  @override
  String get branchId;
  @override
  String get orderId;
  @override
  String get stationId;
  @override
  String get tableNumber;
  @override
  String get productId;
  @override
  String get productName;
  @override
  String get categoryId;
  @override
  int get quantity;
  @override
  double get unitPrice;
  @override
  double get totalPrice;
  @override
  List<OrderItemModifier> get modifiers;
  @override
  String? get specialInstructions;
  @override
  ItemStatus get status;
  @override
  DateTime get sentToStationAt;
  @override
  DateTime? get startedAt;
  @override
  DateTime? get completedAt;

  /// Create a copy of OrderItem
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$OrderItemImplCopyWith<_$OrderItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

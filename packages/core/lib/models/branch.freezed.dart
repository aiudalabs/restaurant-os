// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'branch.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

BusinessHoursEntry _$BusinessHoursEntryFromJson(Map<String, dynamic> json) {
  return _BusinessHoursEntry.fromJson(json);
}

/// @nodoc
mixin _$BusinessHoursEntry {
  String get open => throw _privateConstructorUsedError;
  String get close => throw _privateConstructorUsedError;

  /// Serializes this BusinessHoursEntry to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of BusinessHoursEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $BusinessHoursEntryCopyWith<BusinessHoursEntry> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BusinessHoursEntryCopyWith<$Res> {
  factory $BusinessHoursEntryCopyWith(
          BusinessHoursEntry value, $Res Function(BusinessHoursEntry) then) =
      _$BusinessHoursEntryCopyWithImpl<$Res, BusinessHoursEntry>;
  @useResult
  $Res call({String open, String close});
}

/// @nodoc
class _$BusinessHoursEntryCopyWithImpl<$Res, $Val extends BusinessHoursEntry>
    implements $BusinessHoursEntryCopyWith<$Res> {
  _$BusinessHoursEntryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of BusinessHoursEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? open = null,
    Object? close = null,
  }) {
    return _then(_value.copyWith(
      open: null == open
          ? _value.open
          : open // ignore: cast_nullable_to_non_nullable
              as String,
      close: null == close
          ? _value.close
          : close // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$BusinessHoursEntryImplCopyWith<$Res>
    implements $BusinessHoursEntryCopyWith<$Res> {
  factory _$$BusinessHoursEntryImplCopyWith(_$BusinessHoursEntryImpl value,
          $Res Function(_$BusinessHoursEntryImpl) then) =
      __$$BusinessHoursEntryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String open, String close});
}

/// @nodoc
class __$$BusinessHoursEntryImplCopyWithImpl<$Res>
    extends _$BusinessHoursEntryCopyWithImpl<$Res, _$BusinessHoursEntryImpl>
    implements _$$BusinessHoursEntryImplCopyWith<$Res> {
  __$$BusinessHoursEntryImplCopyWithImpl(_$BusinessHoursEntryImpl _value,
      $Res Function(_$BusinessHoursEntryImpl) _then)
      : super(_value, _then);

  /// Create a copy of BusinessHoursEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? open = null,
    Object? close = null,
  }) {
    return _then(_$BusinessHoursEntryImpl(
      open: null == open
          ? _value.open
          : open // ignore: cast_nullable_to_non_nullable
              as String,
      close: null == close
          ? _value.close
          : close // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$BusinessHoursEntryImpl implements _BusinessHoursEntry {
  const _$BusinessHoursEntryImpl({required this.open, required this.close});

  factory _$BusinessHoursEntryImpl.fromJson(Map<String, dynamic> json) =>
      _$$BusinessHoursEntryImplFromJson(json);

  @override
  final String open;
  @override
  final String close;

  @override
  String toString() {
    return 'BusinessHoursEntry(open: $open, close: $close)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BusinessHoursEntryImpl &&
            (identical(other.open, open) || other.open == open) &&
            (identical(other.close, close) || other.close == close));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, open, close);

  /// Create a copy of BusinessHoursEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$BusinessHoursEntryImplCopyWith<_$BusinessHoursEntryImpl> get copyWith =>
      __$$BusinessHoursEntryImplCopyWithImpl<_$BusinessHoursEntryImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$BusinessHoursEntryImplToJson(
      this,
    );
  }
}

abstract class _BusinessHoursEntry implements BusinessHoursEntry {
  const factory _BusinessHoursEntry(
      {required final String open,
      required final String close}) = _$BusinessHoursEntryImpl;

  factory _BusinessHoursEntry.fromJson(Map<String, dynamic> json) =
      _$BusinessHoursEntryImpl.fromJson;

  @override
  String get open;
  @override
  String get close;

  /// Create a copy of BusinessHoursEntry
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$BusinessHoursEntryImplCopyWith<_$BusinessHoursEntryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Branch _$BranchFromJson(Map<String, dynamic> json) {
  return _Branch.fromJson(json);
}

/// @nodoc
mixin _$Branch {
  String get id => throw _privateConstructorUsedError;
  String get orgId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get address => throw _privateConstructorUsedError;
  String? get phone => throw _privateConstructorUsedError;
  String get menuId => throw _privateConstructorUsedError;
  double? get taxPercent => throw _privateConstructorUsedError;
  List<double>? get tipOptions => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  Map<String, BusinessHoursEntry> get businessHours =>
      throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;

  /// Serializes this Branch to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Branch
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $BranchCopyWith<Branch> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BranchCopyWith<$Res> {
  factory $BranchCopyWith(Branch value, $Res Function(Branch) then) =
      _$BranchCopyWithImpl<$Res, Branch>;
  @useResult
  $Res call(
      {String id,
      String orgId,
      String name,
      String address,
      String? phone,
      String menuId,
      double? taxPercent,
      List<double>? tipOptions,
      bool isActive,
      Map<String, BusinessHoursEntry> businessHours,
      DateTime createdAt});
}

/// @nodoc
class _$BranchCopyWithImpl<$Res, $Val extends Branch>
    implements $BranchCopyWith<$Res> {
  _$BranchCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Branch
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? name = null,
    Object? address = null,
    Object? phone = freezed,
    Object? menuId = null,
    Object? taxPercent = freezed,
    Object? tipOptions = freezed,
    Object? isActive = null,
    Object? businessHours = null,
    Object? createdAt = null,
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
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      address: null == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String,
      phone: freezed == phone
          ? _value.phone
          : phone // ignore: cast_nullable_to_non_nullable
              as String?,
      menuId: null == menuId
          ? _value.menuId
          : menuId // ignore: cast_nullable_to_non_nullable
              as String,
      taxPercent: freezed == taxPercent
          ? _value.taxPercent
          : taxPercent // ignore: cast_nullable_to_non_nullable
              as double?,
      tipOptions: freezed == tipOptions
          ? _value.tipOptions
          : tipOptions // ignore: cast_nullable_to_non_nullable
              as List<double>?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      businessHours: null == businessHours
          ? _value.businessHours
          : businessHours // ignore: cast_nullable_to_non_nullable
              as Map<String, BusinessHoursEntry>,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$BranchImplCopyWith<$Res> implements $BranchCopyWith<$Res> {
  factory _$$BranchImplCopyWith(
          _$BranchImpl value, $Res Function(_$BranchImpl) then) =
      __$$BranchImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String orgId,
      String name,
      String address,
      String? phone,
      String menuId,
      double? taxPercent,
      List<double>? tipOptions,
      bool isActive,
      Map<String, BusinessHoursEntry> businessHours,
      DateTime createdAt});
}

/// @nodoc
class __$$BranchImplCopyWithImpl<$Res>
    extends _$BranchCopyWithImpl<$Res, _$BranchImpl>
    implements _$$BranchImplCopyWith<$Res> {
  __$$BranchImplCopyWithImpl(
      _$BranchImpl _value, $Res Function(_$BranchImpl) _then)
      : super(_value, _then);

  /// Create a copy of Branch
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? name = null,
    Object? address = null,
    Object? phone = freezed,
    Object? menuId = null,
    Object? taxPercent = freezed,
    Object? tipOptions = freezed,
    Object? isActive = null,
    Object? businessHours = null,
    Object? createdAt = null,
  }) {
    return _then(_$BranchImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      orgId: null == orgId
          ? _value.orgId
          : orgId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      address: null == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String,
      phone: freezed == phone
          ? _value.phone
          : phone // ignore: cast_nullable_to_non_nullable
              as String?,
      menuId: null == menuId
          ? _value.menuId
          : menuId // ignore: cast_nullable_to_non_nullable
              as String,
      taxPercent: freezed == taxPercent
          ? _value.taxPercent
          : taxPercent // ignore: cast_nullable_to_non_nullable
              as double?,
      tipOptions: freezed == tipOptions
          ? _value._tipOptions
          : tipOptions // ignore: cast_nullable_to_non_nullable
              as List<double>?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      businessHours: null == businessHours
          ? _value._businessHours
          : businessHours // ignore: cast_nullable_to_non_nullable
              as Map<String, BusinessHoursEntry>,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$BranchImpl extends _Branch {
  const _$BranchImpl(
      {required this.id,
      required this.orgId,
      required this.name,
      this.address = '',
      this.phone,
      this.menuId = '',
      this.taxPercent,
      final List<double>? tipOptions,
      this.isActive = true,
      final Map<String, BusinessHoursEntry> businessHours = const {},
      required this.createdAt})
      : _tipOptions = tipOptions,
        _businessHours = businessHours,
        super._();

  factory _$BranchImpl.fromJson(Map<String, dynamic> json) =>
      _$$BranchImplFromJson(json);

  @override
  final String id;
  @override
  final String orgId;
  @override
  final String name;
  @override
  @JsonKey()
  final String address;
  @override
  final String? phone;
  @override
  @JsonKey()
  final String menuId;
  @override
  final double? taxPercent;
  final List<double>? _tipOptions;
  @override
  List<double>? get tipOptions {
    final value = _tipOptions;
    if (value == null) return null;
    if (_tipOptions is EqualUnmodifiableListView) return _tipOptions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  @JsonKey()
  final bool isActive;
  final Map<String, BusinessHoursEntry> _businessHours;
  @override
  @JsonKey()
  Map<String, BusinessHoursEntry> get businessHours {
    if (_businessHours is EqualUnmodifiableMapView) return _businessHours;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_businessHours);
  }

  @override
  final DateTime createdAt;

  @override
  String toString() {
    return 'Branch(id: $id, orgId: $orgId, name: $name, address: $address, phone: $phone, menuId: $menuId, taxPercent: $taxPercent, tipOptions: $tipOptions, isActive: $isActive, businessHours: $businessHours, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BranchImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.orgId, orgId) || other.orgId == orgId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.address, address) || other.address == address) &&
            (identical(other.phone, phone) || other.phone == phone) &&
            (identical(other.menuId, menuId) || other.menuId == menuId) &&
            (identical(other.taxPercent, taxPercent) ||
                other.taxPercent == taxPercent) &&
            const DeepCollectionEquality()
                .equals(other._tipOptions, _tipOptions) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            const DeepCollectionEquality()
                .equals(other._businessHours, _businessHours) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      orgId,
      name,
      address,
      phone,
      menuId,
      taxPercent,
      const DeepCollectionEquality().hash(_tipOptions),
      isActive,
      const DeepCollectionEquality().hash(_businessHours),
      createdAt);

  /// Create a copy of Branch
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$BranchImplCopyWith<_$BranchImpl> get copyWith =>
      __$$BranchImplCopyWithImpl<_$BranchImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$BranchImplToJson(
      this,
    );
  }
}

abstract class _Branch extends Branch {
  const factory _Branch(
      {required final String id,
      required final String orgId,
      required final String name,
      final String address,
      final String? phone,
      final String menuId,
      final double? taxPercent,
      final List<double>? tipOptions,
      final bool isActive,
      final Map<String, BusinessHoursEntry> businessHours,
      required final DateTime createdAt}) = _$BranchImpl;
  const _Branch._() : super._();

  factory _Branch.fromJson(Map<String, dynamic> json) = _$BranchImpl.fromJson;

  @override
  String get id;
  @override
  String get orgId;
  @override
  String get name;
  @override
  String get address;
  @override
  String? get phone;
  @override
  String get menuId;
  @override
  double? get taxPercent;
  @override
  List<double>? get tipOptions;
  @override
  bool get isActive;
  @override
  Map<String, BusinessHoursEntry> get businessHours;
  @override
  DateTime get createdAt;

  /// Create a copy of Branch
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$BranchImplCopyWith<_$BranchImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

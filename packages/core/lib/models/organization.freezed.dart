// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organization.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

Organization _$OrganizationFromJson(Map<String, dynamic> json) {
  return _Organization.fromJson(json);
}

/// @nodoc
mixin _$Organization {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get slug => throw _privateConstructorUsedError;
  String? get logoUrl => throw _privateConstructorUsedError;
  String get plan => throw _privateConstructorUsedError;
  DateTime? get planExpiresAt => throw _privateConstructorUsedError;
  String get defaultCurrency => throw _privateConstructorUsedError;
  double get defaultTaxPercent => throw _privateConstructorUsedError;
  List<double> get defaultTipOptions => throw _privateConstructorUsedError;
  String get timezone => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  String get ownerId => throw _privateConstructorUsedError;

  /// Serializes this Organization to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Organization
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $OrganizationCopyWith<Organization> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrganizationCopyWith<$Res> {
  factory $OrganizationCopyWith(
          Organization value, $Res Function(Organization) then) =
      _$OrganizationCopyWithImpl<$Res, Organization>;
  @useResult
  $Res call(
      {String id,
      String name,
      String slug,
      String? logoUrl,
      String plan,
      DateTime? planExpiresAt,
      String defaultCurrency,
      double defaultTaxPercent,
      List<double> defaultTipOptions,
      String timezone,
      bool isActive,
      DateTime createdAt,
      String ownerId});
}

/// @nodoc
class _$OrganizationCopyWithImpl<$Res, $Val extends Organization>
    implements $OrganizationCopyWith<$Res> {
  _$OrganizationCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Organization
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? slug = null,
    Object? logoUrl = freezed,
    Object? plan = null,
    Object? planExpiresAt = freezed,
    Object? defaultCurrency = null,
    Object? defaultTaxPercent = null,
    Object? defaultTipOptions = null,
    Object? timezone = null,
    Object? isActive = null,
    Object? createdAt = null,
    Object? ownerId = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      slug: null == slug
          ? _value.slug
          : slug // ignore: cast_nullable_to_non_nullable
              as String,
      logoUrl: freezed == logoUrl
          ? _value.logoUrl
          : logoUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      plan: null == plan
          ? _value.plan
          : plan // ignore: cast_nullable_to_non_nullable
              as String,
      planExpiresAt: freezed == planExpiresAt
          ? _value.planExpiresAt
          : planExpiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      defaultCurrency: null == defaultCurrency
          ? _value.defaultCurrency
          : defaultCurrency // ignore: cast_nullable_to_non_nullable
              as String,
      defaultTaxPercent: null == defaultTaxPercent
          ? _value.defaultTaxPercent
          : defaultTaxPercent // ignore: cast_nullable_to_non_nullable
              as double,
      defaultTipOptions: null == defaultTipOptions
          ? _value.defaultTipOptions
          : defaultTipOptions // ignore: cast_nullable_to_non_nullable
              as List<double>,
      timezone: null == timezone
          ? _value.timezone
          : timezone // ignore: cast_nullable_to_non_nullable
              as String,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      ownerId: null == ownerId
          ? _value.ownerId
          : ownerId // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OrganizationImplCopyWith<$Res>
    implements $OrganizationCopyWith<$Res> {
  factory _$$OrganizationImplCopyWith(
          _$OrganizationImpl value, $Res Function(_$OrganizationImpl) then) =
      __$$OrganizationImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String slug,
      String? logoUrl,
      String plan,
      DateTime? planExpiresAt,
      String defaultCurrency,
      double defaultTaxPercent,
      List<double> defaultTipOptions,
      String timezone,
      bool isActive,
      DateTime createdAt,
      String ownerId});
}

/// @nodoc
class __$$OrganizationImplCopyWithImpl<$Res>
    extends _$OrganizationCopyWithImpl<$Res, _$OrganizationImpl>
    implements _$$OrganizationImplCopyWith<$Res> {
  __$$OrganizationImplCopyWithImpl(
      _$OrganizationImpl _value, $Res Function(_$OrganizationImpl) _then)
      : super(_value, _then);

  /// Create a copy of Organization
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? slug = null,
    Object? logoUrl = freezed,
    Object? plan = null,
    Object? planExpiresAt = freezed,
    Object? defaultCurrency = null,
    Object? defaultTaxPercent = null,
    Object? defaultTipOptions = null,
    Object? timezone = null,
    Object? isActive = null,
    Object? createdAt = null,
    Object? ownerId = null,
  }) {
    return _then(_$OrganizationImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      slug: null == slug
          ? _value.slug
          : slug // ignore: cast_nullable_to_non_nullable
              as String,
      logoUrl: freezed == logoUrl
          ? _value.logoUrl
          : logoUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      plan: null == plan
          ? _value.plan
          : plan // ignore: cast_nullable_to_non_nullable
              as String,
      planExpiresAt: freezed == planExpiresAt
          ? _value.planExpiresAt
          : planExpiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      defaultCurrency: null == defaultCurrency
          ? _value.defaultCurrency
          : defaultCurrency // ignore: cast_nullable_to_non_nullable
              as String,
      defaultTaxPercent: null == defaultTaxPercent
          ? _value.defaultTaxPercent
          : defaultTaxPercent // ignore: cast_nullable_to_non_nullable
              as double,
      defaultTipOptions: null == defaultTipOptions
          ? _value._defaultTipOptions
          : defaultTipOptions // ignore: cast_nullable_to_non_nullable
              as List<double>,
      timezone: null == timezone
          ? _value.timezone
          : timezone // ignore: cast_nullable_to_non_nullable
              as String,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      ownerId: null == ownerId
          ? _value.ownerId
          : ownerId // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OrganizationImpl extends _Organization {
  const _$OrganizationImpl(
      {required this.id,
      this.name = '',
      this.slug = '',
      this.logoUrl,
      this.plan = 'free',
      this.planExpiresAt,
      this.defaultCurrency = 'USD',
      this.defaultTaxPercent = 0.07,
      final List<double> defaultTipOptions = const [10, 15, 20],
      this.timezone = 'America/Panama',
      this.isActive = true,
      required this.createdAt,
      this.ownerId = ''})
      : _defaultTipOptions = defaultTipOptions,
        super._();

  factory _$OrganizationImpl.fromJson(Map<String, dynamic> json) =>
      _$$OrganizationImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey()
  final String name;
  @override
  @JsonKey()
  final String slug;
  @override
  final String? logoUrl;
  @override
  @JsonKey()
  final String plan;
  @override
  final DateTime? planExpiresAt;
  @override
  @JsonKey()
  final String defaultCurrency;
  @override
  @JsonKey()
  final double defaultTaxPercent;
  final List<double> _defaultTipOptions;
  @override
  @JsonKey()
  List<double> get defaultTipOptions {
    if (_defaultTipOptions is EqualUnmodifiableListView)
      return _defaultTipOptions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_defaultTipOptions);
  }

  @override
  @JsonKey()
  final String timezone;
  @override
  @JsonKey()
  final bool isActive;
  @override
  final DateTime createdAt;
  @override
  @JsonKey()
  final String ownerId;

  @override
  String toString() {
    return 'Organization(id: $id, name: $name, slug: $slug, logoUrl: $logoUrl, plan: $plan, planExpiresAt: $planExpiresAt, defaultCurrency: $defaultCurrency, defaultTaxPercent: $defaultTaxPercent, defaultTipOptions: $defaultTipOptions, timezone: $timezone, isActive: $isActive, createdAt: $createdAt, ownerId: $ownerId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrganizationImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.slug, slug) || other.slug == slug) &&
            (identical(other.logoUrl, logoUrl) || other.logoUrl == logoUrl) &&
            (identical(other.plan, plan) || other.plan == plan) &&
            (identical(other.planExpiresAt, planExpiresAt) ||
                other.planExpiresAt == planExpiresAt) &&
            (identical(other.defaultCurrency, defaultCurrency) ||
                other.defaultCurrency == defaultCurrency) &&
            (identical(other.defaultTaxPercent, defaultTaxPercent) ||
                other.defaultTaxPercent == defaultTaxPercent) &&
            const DeepCollectionEquality()
                .equals(other._defaultTipOptions, _defaultTipOptions) &&
            (identical(other.timezone, timezone) ||
                other.timezone == timezone) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.ownerId, ownerId) || other.ownerId == ownerId));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      slug,
      logoUrl,
      plan,
      planExpiresAt,
      defaultCurrency,
      defaultTaxPercent,
      const DeepCollectionEquality().hash(_defaultTipOptions),
      timezone,
      isActive,
      createdAt,
      ownerId);

  /// Create a copy of Organization
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$OrganizationImplCopyWith<_$OrganizationImpl> get copyWith =>
      __$$OrganizationImplCopyWithImpl<_$OrganizationImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OrganizationImplToJson(
      this,
    );
  }
}

abstract class _Organization extends Organization {
  const factory _Organization(
      {required final String id,
      final String name,
      final String slug,
      final String? logoUrl,
      final String plan,
      final DateTime? planExpiresAt,
      final String defaultCurrency,
      final double defaultTaxPercent,
      final List<double> defaultTipOptions,
      final String timezone,
      final bool isActive,
      required final DateTime createdAt,
      final String ownerId}) = _$OrganizationImpl;
  const _Organization._() : super._();

  factory _Organization.fromJson(Map<String, dynamic> json) =
      _$OrganizationImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  String get slug;
  @override
  String? get logoUrl;
  @override
  String get plan;
  @override
  DateTime? get planExpiresAt;
  @override
  String get defaultCurrency;
  @override
  double get defaultTaxPercent;
  @override
  List<double> get defaultTipOptions;
  @override
  String get timezone;
  @override
  bool get isActive;
  @override
  DateTime get createdAt;
  @override
  String get ownerId;

  /// Create a copy of Organization
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$OrganizationImplCopyWith<_$OrganizationImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

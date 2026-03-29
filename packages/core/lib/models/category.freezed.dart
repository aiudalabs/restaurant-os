// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'category.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

Category _$CategoryFromJson(Map<String, dynamic> json) {
  return _Category.fromJson(json);
}

/// @nodoc
mixin _$Category {
  String get id => throw _privateConstructorUsedError;
  String get orgId => throw _privateConstructorUsedError;
  String get menuId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get imageUrl => throw _privateConstructorUsedError;
  int get sortOrder => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  String? get availableFrom => throw _privateConstructorUsedError;
  String? get availableTo => throw _privateConstructorUsedError;
  List<int>? get availableDays => throw _privateConstructorUsedError;

  /// Serializes this Category to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Category
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CategoryCopyWith<Category> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CategoryCopyWith<$Res> {
  factory $CategoryCopyWith(Category value, $Res Function(Category) then) =
      _$CategoryCopyWithImpl<$Res, Category>;
  @useResult
  $Res call(
      {String id,
      String orgId,
      String menuId,
      String name,
      String? imageUrl,
      int sortOrder,
      bool isActive,
      String? availableFrom,
      String? availableTo,
      List<int>? availableDays});
}

/// @nodoc
class _$CategoryCopyWithImpl<$Res, $Val extends Category>
    implements $CategoryCopyWith<$Res> {
  _$CategoryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Category
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? menuId = null,
    Object? name = null,
    Object? imageUrl = freezed,
    Object? sortOrder = null,
    Object? isActive = null,
    Object? availableFrom = freezed,
    Object? availableTo = freezed,
    Object? availableDays = freezed,
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
      menuId: null == menuId
          ? _value.menuId
          : menuId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      sortOrder: null == sortOrder
          ? _value.sortOrder
          : sortOrder // ignore: cast_nullable_to_non_nullable
              as int,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      availableFrom: freezed == availableFrom
          ? _value.availableFrom
          : availableFrom // ignore: cast_nullable_to_non_nullable
              as String?,
      availableTo: freezed == availableTo
          ? _value.availableTo
          : availableTo // ignore: cast_nullable_to_non_nullable
              as String?,
      availableDays: freezed == availableDays
          ? _value.availableDays
          : availableDays // ignore: cast_nullable_to_non_nullable
              as List<int>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CategoryImplCopyWith<$Res>
    implements $CategoryCopyWith<$Res> {
  factory _$$CategoryImplCopyWith(
          _$CategoryImpl value, $Res Function(_$CategoryImpl) then) =
      __$$CategoryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String orgId,
      String menuId,
      String name,
      String? imageUrl,
      int sortOrder,
      bool isActive,
      String? availableFrom,
      String? availableTo,
      List<int>? availableDays});
}

/// @nodoc
class __$$CategoryImplCopyWithImpl<$Res>
    extends _$CategoryCopyWithImpl<$Res, _$CategoryImpl>
    implements _$$CategoryImplCopyWith<$Res> {
  __$$CategoryImplCopyWithImpl(
      _$CategoryImpl _value, $Res Function(_$CategoryImpl) _then)
      : super(_value, _then);

  /// Create a copy of Category
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? menuId = null,
    Object? name = null,
    Object? imageUrl = freezed,
    Object? sortOrder = null,
    Object? isActive = null,
    Object? availableFrom = freezed,
    Object? availableTo = freezed,
    Object? availableDays = freezed,
  }) {
    return _then(_$CategoryImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      orgId: null == orgId
          ? _value.orgId
          : orgId // ignore: cast_nullable_to_non_nullable
              as String,
      menuId: null == menuId
          ? _value.menuId
          : menuId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      sortOrder: null == sortOrder
          ? _value.sortOrder
          : sortOrder // ignore: cast_nullable_to_non_nullable
              as int,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      availableFrom: freezed == availableFrom
          ? _value.availableFrom
          : availableFrom // ignore: cast_nullable_to_non_nullable
              as String?,
      availableTo: freezed == availableTo
          ? _value.availableTo
          : availableTo // ignore: cast_nullable_to_non_nullable
              as String?,
      availableDays: freezed == availableDays
          ? _value._availableDays
          : availableDays // ignore: cast_nullable_to_non_nullable
              as List<int>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CategoryImpl extends _Category {
  const _$CategoryImpl(
      {required this.id,
      required this.orgId,
      required this.menuId,
      required this.name,
      this.imageUrl,
      required this.sortOrder,
      required this.isActive,
      this.availableFrom,
      this.availableTo,
      final List<int>? availableDays})
      : _availableDays = availableDays,
        super._();

  factory _$CategoryImpl.fromJson(Map<String, dynamic> json) =>
      _$$CategoryImplFromJson(json);

  @override
  final String id;
  @override
  final String orgId;
  @override
  final String menuId;
  @override
  final String name;
  @override
  final String? imageUrl;
  @override
  final int sortOrder;
  @override
  final bool isActive;
  @override
  final String? availableFrom;
  @override
  final String? availableTo;
  final List<int>? _availableDays;
  @override
  List<int>? get availableDays {
    final value = _availableDays;
    if (value == null) return null;
    if (_availableDays is EqualUnmodifiableListView) return _availableDays;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  String toString() {
    return 'Category(id: $id, orgId: $orgId, menuId: $menuId, name: $name, imageUrl: $imageUrl, sortOrder: $sortOrder, isActive: $isActive, availableFrom: $availableFrom, availableTo: $availableTo, availableDays: $availableDays)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CategoryImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.orgId, orgId) || other.orgId == orgId) &&
            (identical(other.menuId, menuId) || other.menuId == menuId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.imageUrl, imageUrl) ||
                other.imageUrl == imageUrl) &&
            (identical(other.sortOrder, sortOrder) ||
                other.sortOrder == sortOrder) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.availableFrom, availableFrom) ||
                other.availableFrom == availableFrom) &&
            (identical(other.availableTo, availableTo) ||
                other.availableTo == availableTo) &&
            const DeepCollectionEquality()
                .equals(other._availableDays, _availableDays));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      orgId,
      menuId,
      name,
      imageUrl,
      sortOrder,
      isActive,
      availableFrom,
      availableTo,
      const DeepCollectionEquality().hash(_availableDays));

  /// Create a copy of Category
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CategoryImplCopyWith<_$CategoryImpl> get copyWith =>
      __$$CategoryImplCopyWithImpl<_$CategoryImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CategoryImplToJson(
      this,
    );
  }
}

abstract class _Category extends Category {
  const factory _Category(
      {required final String id,
      required final String orgId,
      required final String menuId,
      required final String name,
      final String? imageUrl,
      required final int sortOrder,
      required final bool isActive,
      final String? availableFrom,
      final String? availableTo,
      final List<int>? availableDays}) = _$CategoryImpl;
  const _Category._() : super._();

  factory _Category.fromJson(Map<String, dynamic> json) =
      _$CategoryImpl.fromJson;

  @override
  String get id;
  @override
  String get orgId;
  @override
  String get menuId;
  @override
  String get name;
  @override
  String? get imageUrl;
  @override
  int get sortOrder;
  @override
  bool get isActive;
  @override
  String? get availableFrom;
  @override
  String? get availableTo;
  @override
  List<int>? get availableDays;

  /// Create a copy of Category
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CategoryImplCopyWith<_$CategoryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

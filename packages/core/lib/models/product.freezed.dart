// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'product.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ModifierOption _$ModifierOptionFromJson(Map<String, dynamic> json) {
  return _ModifierOption.fromJson(json);
}

/// @nodoc
mixin _$ModifierOption {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  double get extraPrice => throw _privateConstructorUsedError;
  bool get isDefault => throw _privateConstructorUsedError;

  /// Serializes this ModifierOption to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ModifierOption
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ModifierOptionCopyWith<ModifierOption> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ModifierOptionCopyWith<$Res> {
  factory $ModifierOptionCopyWith(
          ModifierOption value, $Res Function(ModifierOption) then) =
      _$ModifierOptionCopyWithImpl<$Res, ModifierOption>;
  @useResult
  $Res call({String id, String name, double extraPrice, bool isDefault});
}

/// @nodoc
class _$ModifierOptionCopyWithImpl<$Res, $Val extends ModifierOption>
    implements $ModifierOptionCopyWith<$Res> {
  _$ModifierOptionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ModifierOption
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? extraPrice = null,
    Object? isDefault = null,
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
      extraPrice: null == extraPrice
          ? _value.extraPrice
          : extraPrice // ignore: cast_nullable_to_non_nullable
              as double,
      isDefault: null == isDefault
          ? _value.isDefault
          : isDefault // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ModifierOptionImplCopyWith<$Res>
    implements $ModifierOptionCopyWith<$Res> {
  factory _$$ModifierOptionImplCopyWith(_$ModifierOptionImpl value,
          $Res Function(_$ModifierOptionImpl) then) =
      __$$ModifierOptionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String id, String name, double extraPrice, bool isDefault});
}

/// @nodoc
class __$$ModifierOptionImplCopyWithImpl<$Res>
    extends _$ModifierOptionCopyWithImpl<$Res, _$ModifierOptionImpl>
    implements _$$ModifierOptionImplCopyWith<$Res> {
  __$$ModifierOptionImplCopyWithImpl(
      _$ModifierOptionImpl _value, $Res Function(_$ModifierOptionImpl) _then)
      : super(_value, _then);

  /// Create a copy of ModifierOption
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? extraPrice = null,
    Object? isDefault = null,
  }) {
    return _then(_$ModifierOptionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      extraPrice: null == extraPrice
          ? _value.extraPrice
          : extraPrice // ignore: cast_nullable_to_non_nullable
              as double,
      isDefault: null == isDefault
          ? _value.isDefault
          : isDefault // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ModifierOptionImpl implements _ModifierOption {
  const _$ModifierOptionImpl(
      {required this.id,
      required this.name,
      required this.extraPrice,
      required this.isDefault});

  factory _$ModifierOptionImpl.fromJson(Map<String, dynamic> json) =>
      _$$ModifierOptionImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final double extraPrice;
  @override
  final bool isDefault;

  @override
  String toString() {
    return 'ModifierOption(id: $id, name: $name, extraPrice: $extraPrice, isDefault: $isDefault)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ModifierOptionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.extraPrice, extraPrice) ||
                other.extraPrice == extraPrice) &&
            (identical(other.isDefault, isDefault) ||
                other.isDefault == isDefault));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, extraPrice, isDefault);

  /// Create a copy of ModifierOption
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ModifierOptionImplCopyWith<_$ModifierOptionImpl> get copyWith =>
      __$$ModifierOptionImplCopyWithImpl<_$ModifierOptionImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ModifierOptionImplToJson(
      this,
    );
  }
}

abstract class _ModifierOption implements ModifierOption {
  const factory _ModifierOption(
      {required final String id,
      required final String name,
      required final double extraPrice,
      required final bool isDefault}) = _$ModifierOptionImpl;

  factory _ModifierOption.fromJson(Map<String, dynamic> json) =
      _$ModifierOptionImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  double get extraPrice;
  @override
  bool get isDefault;

  /// Create a copy of ModifierOption
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ModifierOptionImplCopyWith<_$ModifierOptionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ModifierGroup _$ModifierGroupFromJson(Map<String, dynamic> json) {
  return _ModifierGroup.fromJson(json);
}

/// @nodoc
mixin _$ModifierGroup {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  bool get required => throw _privateConstructorUsedError;
  bool get multiSelect => throw _privateConstructorUsedError;
  int get minSelect => throw _privateConstructorUsedError;
  int get maxSelect => throw _privateConstructorUsedError;
  List<ModifierOption> get options => throw _privateConstructorUsedError;

  /// Serializes this ModifierGroup to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ModifierGroup
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ModifierGroupCopyWith<ModifierGroup> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ModifierGroupCopyWith<$Res> {
  factory $ModifierGroupCopyWith(
          ModifierGroup value, $Res Function(ModifierGroup) then) =
      _$ModifierGroupCopyWithImpl<$Res, ModifierGroup>;
  @useResult
  $Res call(
      {String id,
      String name,
      bool required,
      bool multiSelect,
      int minSelect,
      int maxSelect,
      List<ModifierOption> options});
}

/// @nodoc
class _$ModifierGroupCopyWithImpl<$Res, $Val extends ModifierGroup>
    implements $ModifierGroupCopyWith<$Res> {
  _$ModifierGroupCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ModifierGroup
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? required = null,
    Object? multiSelect = null,
    Object? minSelect = null,
    Object? maxSelect = null,
    Object? options = null,
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
      required: null == required
          ? _value.required
          : required // ignore: cast_nullable_to_non_nullable
              as bool,
      multiSelect: null == multiSelect
          ? _value.multiSelect
          : multiSelect // ignore: cast_nullable_to_non_nullable
              as bool,
      minSelect: null == minSelect
          ? _value.minSelect
          : minSelect // ignore: cast_nullable_to_non_nullable
              as int,
      maxSelect: null == maxSelect
          ? _value.maxSelect
          : maxSelect // ignore: cast_nullable_to_non_nullable
              as int,
      options: null == options
          ? _value.options
          : options // ignore: cast_nullable_to_non_nullable
              as List<ModifierOption>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ModifierGroupImplCopyWith<$Res>
    implements $ModifierGroupCopyWith<$Res> {
  factory _$$ModifierGroupImplCopyWith(
          _$ModifierGroupImpl value, $Res Function(_$ModifierGroupImpl) then) =
      __$$ModifierGroupImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      bool required,
      bool multiSelect,
      int minSelect,
      int maxSelect,
      List<ModifierOption> options});
}

/// @nodoc
class __$$ModifierGroupImplCopyWithImpl<$Res>
    extends _$ModifierGroupCopyWithImpl<$Res, _$ModifierGroupImpl>
    implements _$$ModifierGroupImplCopyWith<$Res> {
  __$$ModifierGroupImplCopyWithImpl(
      _$ModifierGroupImpl _value, $Res Function(_$ModifierGroupImpl) _then)
      : super(_value, _then);

  /// Create a copy of ModifierGroup
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? required = null,
    Object? multiSelect = null,
    Object? minSelect = null,
    Object? maxSelect = null,
    Object? options = null,
  }) {
    return _then(_$ModifierGroupImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      required: null == required
          ? _value.required
          : required // ignore: cast_nullable_to_non_nullable
              as bool,
      multiSelect: null == multiSelect
          ? _value.multiSelect
          : multiSelect // ignore: cast_nullable_to_non_nullable
              as bool,
      minSelect: null == minSelect
          ? _value.minSelect
          : minSelect // ignore: cast_nullable_to_non_nullable
              as int,
      maxSelect: null == maxSelect
          ? _value.maxSelect
          : maxSelect // ignore: cast_nullable_to_non_nullable
              as int,
      options: null == options
          ? _value._options
          : options // ignore: cast_nullable_to_non_nullable
              as List<ModifierOption>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ModifierGroupImpl implements _ModifierGroup {
  const _$ModifierGroupImpl(
      {required this.id,
      required this.name,
      required this.required,
      required this.multiSelect,
      required this.minSelect,
      required this.maxSelect,
      required final List<ModifierOption> options})
      : _options = options;

  factory _$ModifierGroupImpl.fromJson(Map<String, dynamic> json) =>
      _$$ModifierGroupImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final bool required;
  @override
  final bool multiSelect;
  @override
  final int minSelect;
  @override
  final int maxSelect;
  final List<ModifierOption> _options;
  @override
  List<ModifierOption> get options {
    if (_options is EqualUnmodifiableListView) return _options;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_options);
  }

  @override
  String toString() {
    return 'ModifierGroup(id: $id, name: $name, required: $required, multiSelect: $multiSelect, minSelect: $minSelect, maxSelect: $maxSelect, options: $options)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ModifierGroupImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.required, required) ||
                other.required == required) &&
            (identical(other.multiSelect, multiSelect) ||
                other.multiSelect == multiSelect) &&
            (identical(other.minSelect, minSelect) ||
                other.minSelect == minSelect) &&
            (identical(other.maxSelect, maxSelect) ||
                other.maxSelect == maxSelect) &&
            const DeepCollectionEquality().equals(other._options, _options));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, required, multiSelect,
      minSelect, maxSelect, const DeepCollectionEquality().hash(_options));

  /// Create a copy of ModifierGroup
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ModifierGroupImplCopyWith<_$ModifierGroupImpl> get copyWith =>
      __$$ModifierGroupImplCopyWithImpl<_$ModifierGroupImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ModifierGroupImplToJson(
      this,
    );
  }
}

abstract class _ModifierGroup implements ModifierGroup {
  const factory _ModifierGroup(
      {required final String id,
      required final String name,
      required final bool required,
      required final bool multiSelect,
      required final int minSelect,
      required final int maxSelect,
      required final List<ModifierOption> options}) = _$ModifierGroupImpl;

  factory _ModifierGroup.fromJson(Map<String, dynamic> json) =
      _$ModifierGroupImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  bool get required;
  @override
  bool get multiSelect;
  @override
  int get minSelect;
  @override
  int get maxSelect;
  @override
  List<ModifierOption> get options;

  /// Create a copy of ModifierGroup
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ModifierGroupImplCopyWith<_$ModifierGroupImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Product _$ProductFromJson(Map<String, dynamic> json) {
  return _Product.fromJson(json);
}

/// @nodoc
mixin _$Product {
  String get id => throw _privateConstructorUsedError;
  String get orgId => throw _privateConstructorUsedError;
  String get menuId => throw _privateConstructorUsedError;
  String get categoryId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String? get imageUrl => throw _privateConstructorUsedError;
  double get price => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  int get sortOrder => throw _privateConstructorUsedError;
  List<String> get tags => throw _privateConstructorUsedError;
  List<ModifierGroup> get modifierGroups => throw _privateConstructorUsedError;
  int? get preparationMinutes => throw _privateConstructorUsedError;

  /// Serializes this Product to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Product
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ProductCopyWith<Product> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ProductCopyWith<$Res> {
  factory $ProductCopyWith(Product value, $Res Function(Product) then) =
      _$ProductCopyWithImpl<$Res, Product>;
  @useResult
  $Res call(
      {String id,
      String orgId,
      String menuId,
      String categoryId,
      String name,
      String? description,
      String? imageUrl,
      double price,
      bool isActive,
      int sortOrder,
      List<String> tags,
      List<ModifierGroup> modifierGroups,
      int? preparationMinutes});
}

/// @nodoc
class _$ProductCopyWithImpl<$Res, $Val extends Product>
    implements $ProductCopyWith<$Res> {
  _$ProductCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Product
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? menuId = null,
    Object? categoryId = null,
    Object? name = null,
    Object? description = freezed,
    Object? imageUrl = freezed,
    Object? price = null,
    Object? isActive = null,
    Object? sortOrder = null,
    Object? tags = null,
    Object? modifierGroups = null,
    Object? preparationMinutes = freezed,
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
      categoryId: null == categoryId
          ? _value.categoryId
          : categoryId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as double,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      sortOrder: null == sortOrder
          ? _value.sortOrder
          : sortOrder // ignore: cast_nullable_to_non_nullable
              as int,
      tags: null == tags
          ? _value.tags
          : tags // ignore: cast_nullable_to_non_nullable
              as List<String>,
      modifierGroups: null == modifierGroups
          ? _value.modifierGroups
          : modifierGroups // ignore: cast_nullable_to_non_nullable
              as List<ModifierGroup>,
      preparationMinutes: freezed == preparationMinutes
          ? _value.preparationMinutes
          : preparationMinutes // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ProductImplCopyWith<$Res> implements $ProductCopyWith<$Res> {
  factory _$$ProductImplCopyWith(
          _$ProductImpl value, $Res Function(_$ProductImpl) then) =
      __$$ProductImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String orgId,
      String menuId,
      String categoryId,
      String name,
      String? description,
      String? imageUrl,
      double price,
      bool isActive,
      int sortOrder,
      List<String> tags,
      List<ModifierGroup> modifierGroups,
      int? preparationMinutes});
}

/// @nodoc
class __$$ProductImplCopyWithImpl<$Res>
    extends _$ProductCopyWithImpl<$Res, _$ProductImpl>
    implements _$$ProductImplCopyWith<$Res> {
  __$$ProductImplCopyWithImpl(
      _$ProductImpl _value, $Res Function(_$ProductImpl) _then)
      : super(_value, _then);

  /// Create a copy of Product
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orgId = null,
    Object? menuId = null,
    Object? categoryId = null,
    Object? name = null,
    Object? description = freezed,
    Object? imageUrl = freezed,
    Object? price = null,
    Object? isActive = null,
    Object? sortOrder = null,
    Object? tags = null,
    Object? modifierGroups = null,
    Object? preparationMinutes = freezed,
  }) {
    return _then(_$ProductImpl(
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
      categoryId: null == categoryId
          ? _value.categoryId
          : categoryId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as double,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      sortOrder: null == sortOrder
          ? _value.sortOrder
          : sortOrder // ignore: cast_nullable_to_non_nullable
              as int,
      tags: null == tags
          ? _value._tags
          : tags // ignore: cast_nullable_to_non_nullable
              as List<String>,
      modifierGroups: null == modifierGroups
          ? _value._modifierGroups
          : modifierGroups // ignore: cast_nullable_to_non_nullable
              as List<ModifierGroup>,
      preparationMinutes: freezed == preparationMinutes
          ? _value.preparationMinutes
          : preparationMinutes // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ProductImpl extends _Product {
  const _$ProductImpl(
      {required this.id,
      required this.orgId,
      required this.menuId,
      required this.categoryId,
      required this.name,
      this.description,
      this.imageUrl,
      required this.price,
      required this.isActive,
      required this.sortOrder,
      required final List<String> tags,
      required final List<ModifierGroup> modifierGroups,
      this.preparationMinutes})
      : _tags = tags,
        _modifierGroups = modifierGroups,
        super._();

  factory _$ProductImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProductImplFromJson(json);

  @override
  final String id;
  @override
  final String orgId;
  @override
  final String menuId;
  @override
  final String categoryId;
  @override
  final String name;
  @override
  final String? description;
  @override
  final String? imageUrl;
  @override
  final double price;
  @override
  final bool isActive;
  @override
  final int sortOrder;
  final List<String> _tags;
  @override
  List<String> get tags {
    if (_tags is EqualUnmodifiableListView) return _tags;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_tags);
  }

  final List<ModifierGroup> _modifierGroups;
  @override
  List<ModifierGroup> get modifierGroups {
    if (_modifierGroups is EqualUnmodifiableListView) return _modifierGroups;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_modifierGroups);
  }

  @override
  final int? preparationMinutes;

  @override
  String toString() {
    return 'Product(id: $id, orgId: $orgId, menuId: $menuId, categoryId: $categoryId, name: $name, description: $description, imageUrl: $imageUrl, price: $price, isActive: $isActive, sortOrder: $sortOrder, tags: $tags, modifierGroups: $modifierGroups, preparationMinutes: $preparationMinutes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProductImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.orgId, orgId) || other.orgId == orgId) &&
            (identical(other.menuId, menuId) || other.menuId == menuId) &&
            (identical(other.categoryId, categoryId) ||
                other.categoryId == categoryId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.imageUrl, imageUrl) ||
                other.imageUrl == imageUrl) &&
            (identical(other.price, price) || other.price == price) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.sortOrder, sortOrder) ||
                other.sortOrder == sortOrder) &&
            const DeepCollectionEquality().equals(other._tags, _tags) &&
            const DeepCollectionEquality()
                .equals(other._modifierGroups, _modifierGroups) &&
            (identical(other.preparationMinutes, preparationMinutes) ||
                other.preparationMinutes == preparationMinutes));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      orgId,
      menuId,
      categoryId,
      name,
      description,
      imageUrl,
      price,
      isActive,
      sortOrder,
      const DeepCollectionEquality().hash(_tags),
      const DeepCollectionEquality().hash(_modifierGroups),
      preparationMinutes);

  /// Create a copy of Product
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProductImplCopyWith<_$ProductImpl> get copyWith =>
      __$$ProductImplCopyWithImpl<_$ProductImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ProductImplToJson(
      this,
    );
  }
}

abstract class _Product extends Product {
  const factory _Product(
      {required final String id,
      required final String orgId,
      required final String menuId,
      required final String categoryId,
      required final String name,
      final String? description,
      final String? imageUrl,
      required final double price,
      required final bool isActive,
      required final int sortOrder,
      required final List<String> tags,
      required final List<ModifierGroup> modifierGroups,
      final int? preparationMinutes}) = _$ProductImpl;
  const _Product._() : super._();

  factory _Product.fromJson(Map<String, dynamic> json) = _$ProductImpl.fromJson;

  @override
  String get id;
  @override
  String get orgId;
  @override
  String get menuId;
  @override
  String get categoryId;
  @override
  String get name;
  @override
  String? get description;
  @override
  String? get imageUrl;
  @override
  double get price;
  @override
  bool get isActive;
  @override
  int get sortOrder;
  @override
  List<String> get tags;
  @override
  List<ModifierGroup> get modifierGroups;
  @override
  int? get preparationMinutes;

  /// Create a copy of Product
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProductImplCopyWith<_$ProductImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

import 'package:freezed_annotation/freezed_annotation.dart';

part 'cart_item.freezed.dart';
part 'cart_item.g.dart';

@freezed
class SelectedModifier with _$SelectedModifier {
  const factory SelectedModifier({
    required String groupId,
    required String optionId,
    required String name,
    required double extraPrice,
  }) = _SelectedModifier;

  factory SelectedModifier.fromJson(Map<String, dynamic> json) =>
      _$SelectedModifierFromJson(json);
}

@freezed
class CartItem with _$CartItem {
  const factory CartItem({
    required String productId,
    required String productName,
    required String categoryId,
    required double unitPrice,
    @Default(1) int quantity,
    @Default([]) List<SelectedModifier> modifiers,
    String? specialInstructions,
  }) = _CartItem;

  const CartItem._();

  double get lineTotal =>
      unitPrice * quantity +
      modifiers.fold(0.0, (sum, m) => sum + m.extraPrice) * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) =>
      _$CartItemFromJson(json);
}

@freezed
class CartState with _$CartState {
  const factory CartState({
    @Default([]) List<CartItem> items,
    String? notes,
  }) = _CartState;

  const CartState._();

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);
  double get subtotal => items.fold(0.0, (sum, item) => sum + item.lineTotal);
}

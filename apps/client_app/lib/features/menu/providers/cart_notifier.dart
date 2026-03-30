import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/cart_item.dart';

part 'cart_notifier.g.dart';

@Riverpod(keepAlive: true)
class CartNotifier extends _$CartNotifier {
  @override
  CartState build() => const CartState();

  void addItem(CartItem item) {
    final idx = state.items.indexWhere(
      (i) => i.productId == item.productId && i.modifiers == item.modifiers,
    );
    if (idx >= 0) {
      final updated = state.items[idx].copyWith(
        quantity: state.items[idx].quantity + item.quantity,
      );
      state = state.copyWith(items: [...state.items]..[idx] = updated);
    } else {
      state = state.copyWith(items: [...state.items, item]);
    }
  }

  void removeItem(int index) {
    state = state.copyWith(items: [...state.items]..removeAt(index));
  }

  void updateQuantity(int index, int qty) {
    if (qty <= 0) {
      removeItem(index);
      return;
    }
    final updated = state.items[index].copyWith(quantity: qty);
    state = state.copyWith(items: [...state.items]..[index] = updated);
  }

  void setNotes(String notes) => state = state.copyWith(notes: notes);

  void clear() => state = const CartState();
}

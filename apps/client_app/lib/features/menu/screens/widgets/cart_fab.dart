import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/cart_notifier.dart';

class CartFab extends ConsumerWidget {
  const CartFab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartNotifierProvider);
    final itemCount = cart.itemCount;

    if (itemCount == 0) return const SizedBox.shrink();

    return FloatingActionButton.extended(
      onPressed: () => context.push('/cart'),
      icon: const Icon(Icons.shopping_cart),
      label: Text('Ver carrito ($itemCount)'),
    );
  }
}

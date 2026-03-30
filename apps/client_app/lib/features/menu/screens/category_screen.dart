import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/menu_providers.dart';
import 'widgets/cart_fab.dart';
import 'widgets/product_card.dart';

class CategoryScreen extends ConsumerWidget {
  const CategoryScreen({
    super.key,
    required this.categoryId,
  });

  final String categoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(
      productsByCategoryProvider(categoryId),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Productos'),
      ),
      floatingActionButton: const CartFab(),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Error al cargar productos',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(error.toString()),
              ],
            ),
          ),
        ),
        data: (products) {
          if (products.isEmpty) {
            return const Center(
              child: Text('No hay productos en esta categoria.'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: products.length,
            itemBuilder: (context, index) {
              final product = products[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ProductCard(
                  product: product,
                  onTap: () => context.push('/product/${product.id}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

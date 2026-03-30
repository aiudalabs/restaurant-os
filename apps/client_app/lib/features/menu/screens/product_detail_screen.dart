import 'package:cached_network_image/cached_network_image.dart';
import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/cart_item.dart';
import '../providers/cart_notifier.dart';
import '../providers/menu_providers.dart';
import 'widgets/modifier_selector.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.productId,
  });

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _quantity = 1;
  final Map<String, List<SelectedModifier>> _selectedModifiers = {};
  final TextEditingController _instructionsController = TextEditingController();

  @override
  void dispose() {
    _instructionsController.dispose();
    super.dispose();
  }

  double _calculateTotal(Product product) {
    final modifierExtra = _selectedModifiers.values
        .expand((list) => list)
        .fold(0.0, (sum, m) => sum + m.extraPrice);
    return (product.price + modifierExtra) * _quantity;
  }

  bool _canAddToCart(Product product) {
    for (final group in product.modifierGroups) {
      if (group.required) {
        final selected = _selectedModifiers[group.id] ?? [];
        if (selected.isEmpty) return false;
      }
    }
    return true;
  }

  void _addToCart(Product product) {
    final allModifiers = _selectedModifiers.values
        .expand((list) => list)
        .toList();

    final item = CartItem(
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      unitPrice: product.price,
      quantity: _quantity,
      modifiers: allModifiers,
      specialInstructions: _instructionsController.text.isNotEmpty
          ? _instructionsController.text
          : null,
    );

    ref.read(cartNotifierProvider.notifier).addItem(item);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} agregado al carrito'),
        duration: const Duration(seconds: 2),
        action: SnackBarAction(
          label: 'Ver carrito',
          onPressed: () => context.push('/cart'),
        ),
      ),
    );

    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(
      productByIdProvider(widget.productId),
    );
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle'),
      ),
      body: productAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 16),
              Text('Error: $error'),
            ],
          ),
        ),
        data: (product) {
          if (product == null) {
            return const Center(child: Text('Producto no encontrado.'));
          }

          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Product image
                      if (product.imageUrl != null)
                        SizedBox(
                          height: 250,
                          child: CachedNetworkImage(
                            imageUrl: product.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => const Center(
                              child: CircularProgressIndicator(),
                            ),
                            errorWidget: (_, __, ___) => Container(
                              color: theme.colorScheme.surfaceContainerHighest,
                              child: const Center(
                                child: Icon(Icons.fastfood, size: 64),
                              ),
                            ),
                          ),
                        ),

                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Name & price
                            Text(
                              product.name,
                              style: theme.textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              product.price.toCurrency(),
                              style: theme.textTheme.titleLarge?.copyWith(
                                color: theme.colorScheme.primary,
                              ),
                            ),

                            // Description
                            if (product.description != null) ...[
                              const SizedBox(height: 12),
                              Text(
                                product.description!,
                                style: theme.textTheme.bodyMedium,
                              ),
                            ],

                            // Tags
                            if (product.tags.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 6,
                                runSpacing: 4,
                                children: product.tags
                                    .map(
                                      (tag) => Chip(
                                        label: Text(tag.capitalize()),
                                        visualDensity: VisualDensity.compact,
                                      ),
                                    )
                                    .toList(),
                              ),
                            ],

                            // Modifier groups
                            if (product.modifierGroups.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              const Divider(),
                              ...product.modifierGroups.map(
                                (group) => ModifierSelector(
                                  group: group,
                                  selectedModifiers:
                                      _selectedModifiers[group.id] ?? [],
                                  onChanged: (mods) {
                                    setState(() {
                                      _selectedModifiers[group.id] = mods;
                                    });
                                  },
                                ),
                              ),
                            ],

                            // Special instructions
                            const SizedBox(height: 16),
                            const Divider(),
                            const SizedBox(height: 8),
                            Text(
                              'Instrucciones especiales',
                              style: theme.textTheme.titleSmall,
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _instructionsController,
                              maxLines: 2,
                              decoration: const InputDecoration(
                                hintText: 'Ej: sin cebolla, extra salsa...',
                                border: OutlineInputBorder(),
                              ),
                            ),

                            // Quantity
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                IconButton.filled(
                                  onPressed: _quantity > 1
                                      ? () =>
                                          setState(() => _quantity--)
                                      : null,
                                  icon: const Icon(Icons.remove),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 24,
                                  ),
                                  child: Text(
                                    '$_quantity',
                                    style: theme.textTheme.headlineSmall,
                                  ),
                                ),
                                IconButton.filled(
                                  onPressed: () =>
                                      setState(() => _quantity++),
                                  icon: const Icon(Icons.add),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom bar with add to cart button
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: _canAddToCart(product)
                          ? () => _addToCart(product)
                          : null,
                      child: Text(
                        'Agregar ${_calculateTotal(product).toCurrency()}',
                        style: const TextStyle(fontSize: 16),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

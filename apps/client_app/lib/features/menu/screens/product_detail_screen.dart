import 'package:cached_network_image/cached_network_image.dart';
import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:client_app/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../theme/app_colors.dart';
import '../models/cart_item.dart';
import '../providers/cart_notifier.dart';
import '../providers/menu_providers.dart';

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
    final allModifiers =
        _selectedModifiers.values.expand((list) => list).toList();

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

    final l10n = AppLocalizations.of(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(l10n.addedToCart(product.name)),
        duration: const Duration(seconds: 2),
        action: SnackBarAction(
          label: l10n.viewCart,
          onPressed: () => context.push('/cart'),
        ),
      ),
    );

    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final productAsync = ref.watch(productByIdProvider(widget.productId));

    return Scaffold(
      backgroundColor: ClientColors.kSurface,
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
            return Center(child: Text(l10n.productNotFound));
          }

          final total = _calculateTotal(product);
          final canAdd = _canAddToCart(product);
          final isPopular = product.tags.contains('popular');

          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Hero image
                      SizedBox(
                        height: 220,
                        width: double.infinity,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (product.imageUrl != null)
                              CachedNetworkImage(
                                imageUrl: product.imageUrl!,
                                fit: BoxFit.cover,
                                placeholder: (_, __) =>
                                    _detailPlaceholder(),
                                errorWidget: (_, __, ___) =>
                                    _detailPlaceholder(),
                              )
                            else
                              _detailPlaceholder(),
                            // Back button
                            Positioned(
                              top: MediaQuery.of(context).padding.top + 12,
                              left: 16,
                              child: _CircleButton(
                                icon: Icons.arrow_back,
                                onTap: () => context.pop(),
                              ),
                            ),
                            // Favorite button
                            Positioned(
                              top: MediaQuery.of(context).padding.top + 12,
                              right: 16,
                              child: _CircleButton(
                                icon: Icons.favorite_border,
                                onTap: () {},
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Content
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Tag badge
                            if (isPopular)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                margin: const EdgeInsets.only(bottom: 10),
                                decoration: BoxDecoration(
                                  color: ClientColors.kSuccessLight,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Popular · 25 min',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: ClientColors.kSuccess,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),

                            // Product name
                            Text(
                              product.name,
                              style: GoogleFonts.fraunces(
                                fontSize: 22,
                                fontWeight: FontWeight.w600,
                                color: ClientColors.kTextPrimary,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 8),

                            // Description
                            if (product.description != null) ...[
                              Text(
                                product.description!,
                                style: GoogleFonts.dmSans(
                                  fontSize: 12,
                                  color: ClientColors.kTextHint,
                                  height: 1.6,
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Divider
                            Container(
                              height: 1,
                              color: ClientColors.kBorder,
                            ),
                            const SizedBox(height: 16),

                            // Modifier groups
                            ...product.modifierGroups.map(
                              (group) => _ModifierGroupSection(
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

                            // Quantity section
                            Container(
                              height: 1,
                              color: ClientColors.kBorder,
                              margin: const EdgeInsets.only(bottom: 16),
                            ),
                            Text(
                              l10n.quantity,
                              style: GoogleFonts.dmSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: ClientColors.kTextPrimary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                _QtyButton(
                                  icon: Icons.remove,
                                  onTap: _quantity > 1
                                      ? () =>
                                          setState(() => _quantity--)
                                      : null,
                                ),
                                const SizedBox(width: 16),
                                Text(
                                  '$_quantity',
                                  style: GoogleFonts.fraunces(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600,
                                    color: ClientColors.kTextPrimary,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                _QtyButton(
                                  icon: Icons.add,
                                  onTap: () =>
                                      setState(() => _quantity++),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '× ${product.price.toCurrency()}',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 13,
                                    color: ClientColors.kTextHint,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Add to cart button
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: GestureDetector(
                    onTap: canAdd ? () => _addToCart(product) : null,
                    child: AnimatedOpacity(
                      opacity: canAdd ? 1.0 : 0.6,
                      duration: const Duration(milliseconds: 200),
                      child: Container(
                        width: double.infinity,
                        height: 52,
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        decoration: BoxDecoration(
                          color: ClientColors.kBrandRed,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: canAdd
                              ? const [
                                  BoxShadow(
                                    color: Color(0x59C8392B),
                                    blurRadius: 20,
                                    offset: Offset(0, 6),
                                  ),
                                ]
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment:
                              MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              l10n.addToCart,
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              total.toCurrency(),
                              style: GoogleFonts.fraunces(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
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

  Widget _detailPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF3ED), Color(0xFFFFE4D6)],
        ),
      ),
      child: const Center(
        child: Icon(Icons.fastfood, size: 64, color: ClientColors.kTextHint),
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  const _CircleButton({
    required this.icon,
    required this.onTap,
  });

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: 18, color: ClientColors.kTextPrimary),
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({
    required this.icon,
    this.onTap,
  });

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: ClientColors.kBorder,
            width: 1.5,
          ),
        ),
        child: Icon(
          icon,
          size: 20,
          color: onTap != null
              ? ClientColors.kTextPrimary
              : ClientColors.kTextHint,
        ),
      ),
    );
  }
}

class _ModifierGroupSection extends StatelessWidget {
  const _ModifierGroupSection({
    required this.group,
    required this.selectedModifiers,
    required this.onChanged,
  });

  final ModifierGroup group;
  final List<SelectedModifier> selectedModifiers;
  final ValueChanged<List<SelectedModifier>> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              group.name,
              style: GoogleFonts.dmSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: ClientColors.kTextPrimary,
              ),
            ),
            if (group.required)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: ClientColors.kBrandRedLight,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  l10n.required,
                  style: GoogleFonts.dmSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: ClientColors.kBrandRed,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),

        // Options
        ...group.options.map((option) {
          final isSelected =
              selectedModifiers.any((m) => m.optionId == option.id);

          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: GestureDetector(
              onTap: () {
                if (group.multiSelect) {
                  final current = [...selectedModifiers];
                  if (isSelected) {
                    current.removeWhere((m) => m.optionId == option.id);
                  } else if (current.length < group.maxSelect) {
                    current.add(SelectedModifier(
                      groupId: group.id,
                      optionId: option.id,
                      name: option.name,
                      extraPrice: option.extraPrice,
                    ));
                  }
                  onChanged(current);
                } else {
                  onChanged([
                    SelectedModifier(
                      groupId: group.id,
                      optionId: option.id,
                      name: option.name,
                      extraPrice: option.extraPrice,
                    ),
                  ]);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? ClientColors.kBrandRedLight
                      : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                        ? ClientColors.kBrandRed
                        : ClientColors.kBorder,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    // Radio indicator
                    Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected
                            ? ClientColors.kBrandRed
                            : Colors.white,
                        border: Border.all(
                          color: isSelected
                              ? ClientColors.kBrandRed
                              : ClientColors.kBorder,
                          width: 2,
                        ),
                      ),
                      child: isSelected
                          ? Center(
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                ),
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        option.name,
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: ClientColors.kTextPrimary,
                        ),
                      ),
                    ),
                    Text(
                      option.extraPrice > 0
                          ? '+${option.extraPrice.toCurrency()}'
                          : AppLocalizations.of(context).included,
                      style: GoogleFonts.dmSans(
                        fontSize: 11,
                        color: ClientColors.kTextHint,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 16),
      ],
    );
  }
}

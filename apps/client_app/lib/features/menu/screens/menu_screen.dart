import 'package:cached_network_image/cached_network_image.dart';
import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:client_app/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core_client/table_session.dart';
import '../../../theme/app_colors.dart';
import '../providers/cart_notifier.dart';
import '../providers/menu_providers.dart';
import 'widgets/cart_fab.dart';

class MenuScreen extends ConsumerStatefulWidget {
  const MenuScreen({super.key});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends ConsumerState<MenuScreen> {
  String? _selectedCategoryId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ref.watch(tableSessionNotifierProvider);
    final categoriesAsync = ref.watch(categoriesStreamProvider);
    final allProductsAsync = ref.watch(allMenuProductsProvider);
    final cart = ref.watch(cartNotifierProvider);

    if (session == null) {
      return Scaffold(
        body: Center(child: Text(l10n.sessionNotStarted)),
      );
    }

    return Scaffold(
      backgroundColor: ClientColors.kSurface,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              // Hero section
              SliverToBoxAdapter(child: _HeroSection(session: session)),

              // Category chips
              categoriesAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: Center(child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(),
                  )),
                ),
                error: (error, _) => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(l10n.errorLoadingMenu),
                  ),
                ),
                data: (categories) {
                  if (categories.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Text(l10n.noCategories),
                        ),
                      ),
                    );
                  }

                  return SliverToBoxAdapter(
                    child: _CategoryChips(
                      categories: categories,
                      selectedId: _selectedCategoryId,
                      onSelected: (id) => setState(() => _selectedCategoryId = id),
                    ),
                  );
                },
              ),

              // Section title
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                  child: Text(
                    l10n.popular,
                    style: GoogleFonts.fraunces(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: ClientColors.kTextPrimary,
                    ),
                  ),
                ),
              ),

              // Products grid
              allProductsAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: Center(child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  )),
                ),
                error: (error, _) => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text('$error'),
                  ),
                ),
                data: (products) {
                  final filtered = _selectedCategoryId == null
                      ? products
                      : products
                          .where((p) => p.categoryId == _selectedCategoryId)
                          .toList();

                  if (filtered.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Text(l10n.noProducts),
                        ),
                      ),
                    );
                  }

                  final bottomPadding = MediaQuery.of(context).padding.bottom;
                  return SliverPadding(
                    padding: EdgeInsets.fromLTRB(20, 0, 20, 100 + bottomPadding),
                    sliver: SliverGrid(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.72,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) => _ProductCard(
                          product: filtered[index],
                          onTap: () =>
                              context.push('/product/${filtered[index].id}'),
                        ),
                        childCount: filtered.length,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),

          // Cart FAB
          if (cart.items.isNotEmpty)
            Positioned(
              left: 20,
              right: 20,
              bottom: MediaQuery.of(context).padding.bottom + 16,
              child: CartFab(
                itemCount: cart.itemCount,
                total: cart.subtotal,
                onTap: () => context.push('/cart'),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({required this.session});

  final TableSession session;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      decoration: const BoxDecoration(
        gradient: ClientColors.heroGradient,
      ),
      child: Stack(
        children: [
          // Cross pattern overlay
          Positioned.fill(
            child: CustomPaint(painter: _CrossPatternPainter()),
          ),
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top row: restaurant name + badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              session.branchName.isNotEmpty
                                  ? session.branchName
                                  : 'RestaurantOS',
                              style: GoogleFonts.fraunces(
                                fontSize: 22,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              session.tableZone != null
                                  ? '${l10n.tableN(session.tableNumber)} · ${session.tableZone}'
                                  : l10n.tableN(session.tableNumber),
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.75),
                              ),
                            ),
                          ],
                        ),
                      ),
                      _OpenBadge(label: l10n.open),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Search bar
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 11),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x26000000),
                          blurRadius: 16,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search,
                            size: 16, color: ClientColors.kTextHint),
                        const SizedBox(width: 10),
                        Text(
                          l10n.searchMenu,
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: ClientColors.kTextHint,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OpenBadge extends StatefulWidget {
  const _OpenBadge({required this.label});
  final String label;

  @override
  State<_OpenBadge> createState() => _OpenBadgeState();
}

class _OpenBadgeState extends State<_OpenBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          FadeTransition(
            opacity: _controller.drive(
              TweenSequence([
                TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.4), weight: 50),
                TweenSequenceItem(tween: Tween(begin: 0.4, end: 1.0), weight: 50),
              ]),
            ),
            child: Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: Color(0xFF4ADE80),
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 5),
          Text(
            widget.label,
            style: GoogleFonts.dmSans(
              fontSize: 11,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.selectedId,
    required this.onSelected,
  });

  final List<Category> categories;
  final String? selectedId;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        children: [
          _Chip(
            label: l10n.allCategory,
            isActive: selectedId == null,
            onTap: () => onSelected(null),
          ),
          const SizedBox(width: 8),
          ...categories.map((cat) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _Chip(
                  label: cat.name,
                  isActive: selectedId == cat.id,
                  onTap: () => onSelected(cat.id),
                ),
              )),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          color: isActive ? ClientColors.kBrandRed : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? ClientColors.kBrandRed : ClientColors.kBorder,
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: isActive ? Colors.white : ClientColors.kTextSecondary,
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.product,
    required this.onTap,
  });

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isPopular = product.tags.contains('popular');

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: ClientColors.kBorder),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0F000000),
              blurRadius: 12,
              offset: Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image area
            SizedBox(
              height: 90,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (product.imageUrl != null)
                    CachedNetworkImage(
                      imageUrl: product.imageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => _productPlaceholder(),
                      errorWidget: (_, __, ___) => _productPlaceholder(),
                    )
                  else
                    _productPlaceholder(),
                  if (isPopular)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: ClientColors.kBrandRed,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          AppLocalizations.of(context).popular,
                          style: GoogleFonts.dmSans(
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Info area
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: ClientColors.kTextPrimary,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (product.description != null) ...[
                      const SizedBox(height: 4),
                      Expanded(
                        child: Text(
                          product.description!,
                          style: GoogleFonts.dmSans(
                            fontSize: 10,
                            color: ClientColors.kTextHint,
                            height: 1.4,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ] else
                      const Spacer(),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          product.price.toCurrency(),
                          style: GoogleFonts.fraunces(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: ClientColors.kBrandRed,
                          ),
                        ),
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: ClientColors.kBrandRed,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.add,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _productPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF3ED), Color(0xFFFFE4D6)],
        ),
      ),
      child: const Center(
        child: Icon(Icons.fastfood, size: 36, color: ClientColors.kTextHint),
      ),
    );
  }
}

class _CrossPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Subtle cross pattern overlay (matches the SVG pattern in HTML mockup)
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.04)
      ..strokeWidth = 1.5;

    const spacing = 60.0;
    const armLen = 4.0;

    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawLine(
          Offset(x - armLen, y),
          Offset(x + armLen, y),
          paint,
        );
        canvas.drawLine(
          Offset(x, y - armLen),
          Offset(x, y + armLen),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

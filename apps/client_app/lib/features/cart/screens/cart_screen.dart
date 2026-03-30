import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:client_app/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core_client/table_session.dart';
import '../../../theme/app_colors.dart';
import '../../menu/models/cart_item.dart';
import '../../menu/providers/cart_notifier.dart';
import '../../menu/providers/menu_providers.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _isSubmitting = false;
  final TextEditingController _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitOrder(
    TableSession session,
    CartState cart,
    Organization org,
  ) async {
    setState(() => _isSubmitting = true);

    try {
      final db = ref.read(firestoreProvider);
      final batch = db.batch();

      final orderRef = db.collection(FirestorePaths.orders).doc();
      final subtotal = cart.subtotal;
      final taxAmount = subtotal * org.defaultTaxPercent;

      batch.set(
        orderRef,
        Order(
          id: orderRef.id,
          orgId: session.orgId,
          branchId: session.branchId,
          tableId: session.tableId,
          tableNumber: session.tableNumber,
          status: OrderStatus.pending,
          subtotal: subtotal,
          taxAmount: taxAmount,
          taxPercent: org.defaultTaxPercent,
          tipAmount: 0,
          total: subtotal + taxAmount,
          notes: cart.notes,
          itemCount: cart.itemCount,
          payment: PaymentInfo.empty(),
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ).toFirestore(),
      );

      for (final item in cart.items) {
        final itemRef = db.collection(FirestorePaths.orderItems).doc();
        batch.set(itemRef, {
          'id': itemRef.id,
          'orgId': session.orgId,
          'branchId': session.branchId,
          'orderId': orderRef.id,
          'stationId': '',
          'tableNumber': session.tableNumber,
          'productId': item.productId,
          'productName': item.productName,
          'categoryId': item.categoryId,
          'quantity': item.quantity,
          'unitPrice': item.unitPrice,
          'totalPrice': item.lineTotal,
          'modifiers': item.modifiers
              .map((m) => {
                    'name': m.name,
                    'value': m.name,
                    'extraPrice': m.extraPrice,
                  })
              .toList(),
          'specialInstructions': item.specialInstructions,
          'status': 'queued',
          'sentToStationAt': FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      ref.read(cartNotifierProvider.notifier).clear();

      if (mounted) {
        context.go('/tracking/${orderRef.id}');
      }
    } on FirebaseException catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${l10n.errorSendingOrder}: ${e.message}'),
            backgroundColor: ClientColors.kError,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final cart = ref.watch(cartNotifierProvider);
    final session = ref.watch(tableSessionNotifierProvider);
    final orgAsync = ref.watch(currentOrganizationProvider);

    if (session == null) {
      return Scaffold(
        body: Center(child: Text(l10n.sessionNotStarted)),
      );
    }

    if (cart.items.isEmpty) {
      return Scaffold(
        backgroundColor: ClientColors.kSurface,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shopping_cart_outlined,
                    size: 64, color: ClientColors.kTextHint),
                const SizedBox(height: 16),
                Text(
                  l10n.emptyCart,
                  style: GoogleFonts.dmSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: ClientColors.kTextPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: () => context.go('/menu'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: ClientColors.kBrandRed,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      l10n.goToMenu,
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: ClientColors.kSurface,
      body: Column(
        children: [
          // Header
          Container(
            padding: EdgeInsets.fromLTRB(
              20,
              MediaQuery.of(context).padding.top + 12,
              20,
              16,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(color: ClientColors.kBorder),
              ),
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => context.pop(),
                  child: const Icon(Icons.arrow_back,
                      color: ClientColors.kTextPrimary),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.myOrder,
                        style: GoogleFonts.fraunces(
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                          color: ClientColors.kTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${l10n.tableN(session.tableNumber)} · ${l10n.itemsCount(cart.itemCount)}',
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          color: ClientColors.kTextHint,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Cart items list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              children: [
                // Items
                ...List.generate(cart.items.length, (index) {
                  final item = cart.items[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _CartItemCard(
                      item: item,
                      onIncrement: () => ref
                          .read(cartNotifierProvider.notifier)
                          .updateQuantity(index, item.quantity + 1),
                      onDecrement: () => ref
                          .read(cartNotifierProvider.notifier)
                          .updateQuantity(index, item.quantity - 1),
                    ),
                  );
                }),

                const SizedBox(height: 2),

                // Kitchen notes
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ClientColors.kBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.kitchenNotes,
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: ClientColors.kTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _notesController,
                        maxLines: 2,
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          color: ClientColors.kTextPrimary,
                        ),
                        decoration: InputDecoration(
                          hintText: l10n.kitchenNotesHint,
                          hintStyle: GoogleFonts.dmSans(
                            fontSize: 12,
                            color: ClientColors.kTextHint,
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(
                                color: ClientColors.kBorder, width: 1.5),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(
                                color: ClientColors.kBorder, width: 1.5),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(
                                color: ClientColors.kBrandRed, width: 1.5),
                          ),
                        ),
                        onChanged: (value) {
                          ref
                              .read(cartNotifierProvider.notifier)
                              .setNotes(value);
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Summary
                orgAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Text('Error: $error'),
                  data: (org) {
                    if (org == null) return const SizedBox.shrink();
                    final subtotal = cart.subtotal;
                    final taxAmount = subtotal * org.defaultTaxPercent;
                    final total = subtotal + taxAmount;

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: ClientColors.kBorder),
                      ),
                      child: Column(
                        children: [
                          _SummaryRow(
                            label: l10n.subtotal,
                            value: subtotal.toCurrency(),
                          ),
                          const SizedBox(height: 8),
                          _SummaryRow(
                            label: l10n.taxLabel(
                                org.defaultTaxPercent.toPercent()),
                            value: taxAmount.toCurrency(),
                          ),
                          Container(
                            height: 1,
                            color: ClientColors.kBorder,
                            margin: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                l10n.total,
                                style: GoogleFonts.dmSans(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: ClientColors.kTextPrimary,
                                ),
                              ),
                              Text(
                                total.toCurrency(),
                                style: GoogleFonts.fraunces(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: ClientColors.kBrandRed,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 80),
              ],
            ),
          ),

          // Send order button
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: orgAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (org) {
                  if (org == null) return const SizedBox.shrink();

                  return GestureDetector(
                    onTap: _isSubmitting
                        ? null
                        : () => _submitOrder(session, cart, org),
                    child: Container(
                      width: double.infinity,
                      height: 52,
                      decoration: BoxDecoration(
                        color: ClientColors.kBrandRed,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x59C8392B),
                            blurRadius: 20,
                            offset: Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_isSubmitting)
                            const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          else ...[
                            const Icon(Icons.send,
                                color: Colors.white, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              l10n.sendOrder,
                              style: GoogleFonts.dmSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({
    required this.item,
    required this.onIncrement,
    required this.onDecrement,
  });

  final CartItem item;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ClientColors.kBorder),
      ),
      child: Row(
        children: [
          // Thumbnail
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: ClientColors.kSurface2,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Icon(Icons.fastfood,
                  size: 24, color: ClientColors.kTextHint),
            ),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: GoogleFonts.dmSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: ClientColors.kTextPrimary,
                  ),
                ),
                if (item.modifiers.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    item.modifiers.map((m) => m.name).join(', '),
                    style: GoogleFonts.dmSans(
                      fontSize: 11,
                      color: ClientColors.kTextHint,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Qty controls
                    Row(
                      children: [
                        _CartQtyBtn(
                          icon: Icons.remove,
                          onTap: onDecrement,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${item.quantity}',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: ClientColors.kTextPrimary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        _CartQtyBtn(
                          icon: Icons.add,
                          onTap: onIncrement,
                        ),
                      ],
                    ),
                    // Price
                    Text(
                      item.lineTotal.toCurrency(),
                      style: GoogleFonts.fraunces(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: ClientColors.kTextPrimary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CartQtyBtn extends StatelessWidget {
  const _CartQtyBtn({
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
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: ClientColors.kBorder, width: 1.5),
        ),
        child: Icon(icon, size: 14, color: ClientColors.kTextSecondary),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            color: ClientColors.kTextSecondary,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            color: ClientColors.kTextSecondary,
          ),
        ),
      ],
    );
  }
}

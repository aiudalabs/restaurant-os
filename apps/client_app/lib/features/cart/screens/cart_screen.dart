import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core_client/table_session.dart';
import '../../menu/models/cart_item.dart';
import '../../menu/providers/cart_notifier.dart';
import '../../menu/providers/menu_providers.dart';
import 'widgets/cart_item_tile.dart';
import 'widgets/order_summary.dart';

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

      // 1. Create Order document
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

      // 2. Create each OrderItem
      for (final item in cart.items) {
        final itemRef = db.collection(FirestorePaths.orderItems).doc();
        batch.set(itemRef, {
          'id': itemRef.id,
          'orgId': session.orgId,
          'branchId': session.branchId,
          'orderId': orderRef.id,
          'stationId': '', // Cloud Function fills this
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

      // Clear cart and navigate to tracking
      ref.read(cartNotifierProvider.notifier).clear();

      if (mounted) {
        context.go('/tracking/${orderRef.id}');
      }
    } on FirebaseException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al enviar pedido: ${e.message}'),
            backgroundColor: Theme.of(context).colorScheme.error,
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
    final cart = ref.watch(cartNotifierProvider);
    final session = ref.watch(tableSessionNotifierProvider);
    final orgAsync = ref.watch(currentOrganizationProvider);
    final theme = Theme.of(context);

    if (session == null) {
      return const Scaffold(
        body: Center(child: Text('Sesion no iniciada.')),
      );
    }

    if (cart.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Carrito')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.shopping_cart_outlined, size: 64),
              const SizedBox(height: 16),
              Text(
                'Tu carrito esta vacio',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.go('/menu'),
                child: const Text('Ver menu'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Carrito (${cart.itemCount})'),
        actions: [
          TextButton(
            onPressed: () {
              ref.read(cartNotifierProvider.notifier).clear();
            },
            child: const Text('Vaciar'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Cart items
                ...List.generate(cart.items.length, (index) {
                  final item = cart.items[index];
                  return CartItemTile(
                    item: item,
                    index: index,
                    onQuantityChanged: (idx, qty) {
                      ref
                          .read(cartNotifierProvider.notifier)
                          .updateQuantity(idx, qty);
                    },
                    onRemove: (idx) {
                      ref
                          .read(cartNotifierProvider.notifier)
                          .removeItem(idx);
                    },
                  );
                }),

                const SizedBox(height: 16),

                // Notes field
                TextField(
                  controller: _notesController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notas del pedido',
                    hintText: 'Instrucciones generales...',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) {
                    ref.read(cartNotifierProvider.notifier).setNotes(value);
                  },
                ),

                const SizedBox(height: 16),

                // Order summary
                orgAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Text('Error: $error'),
                  data: (org) {
                    if (org == null) {
                      return const Text('Organizacion no encontrada.');
                    }
                    final subtotal = cart.subtotal;
                    final taxAmount = subtotal * org.defaultTaxPercent;
                    final total = subtotal + taxAmount;

                    return OrderSummary(
                      subtotal: subtotal,
                      taxPercent: org.defaultTaxPercent,
                      taxAmount: taxAmount,
                      total: total,
                    );
                  },
                ),
              ],
            ),
          ),

          // Submit button
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: orgAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (org) {
                  if (org == null) return const SizedBox.shrink();

                  return SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: _isSubmitting
                          ? null
                          : () => _submitOrder(session, cart, org),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Enviar pedido',
                              style: TextStyle(fontSize: 16),
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

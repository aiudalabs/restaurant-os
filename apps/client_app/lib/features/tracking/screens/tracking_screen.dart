import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core_client/table_session.dart';
import '../providers/tracking_provider.dart';
import 'widgets/item_status_tile.dart';
import 'widgets/order_complete_view.dart';
import 'widgets/status_stepper.dart';

class TrackingScreen extends ConsumerWidget {
  const TrackingScreen({
    super.key,
    required this.orderId,
  });

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(orderStreamProvider(orderId));
    final itemsAsync = ref.watch(orderItemsStreamProvider(orderId));
    final session = ref.watch(tableSessionNotifierProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tu pedido'),
        leading: session != null
            ? IconButton(
                icon: const Icon(Icons.restaurant_menu),
                onPressed: () => context.go('/menu'),
                tooltip: 'Volver al menu',
              )
            : null,
      ),
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 16),
              Text('Error: $error'),
            ],
          ),
        ),
        data: (order) {
          if (order == null) {
            return const Center(
              child: Text('Pedido no encontrado.'),
            );
          }

          // Show complete view for delivered/closed orders
          if (order.status == OrderStatus.delivered ||
              order.status == OrderStatus.closed) {
            return OrderCompleteView(order: order);
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Order info header
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mesa ${order.tableNumber}',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${order.itemCount} items',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                      Text(
                        order.total.toCurrency(),
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Status stepper
              StatusStepper(currentStatus: order.status),

              const SizedBox(height: 24),

              // Items section
              Text(
                'Detalle del pedido',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),

              itemsAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (error, _) => Text('Error: $error'),
                data: (items) {
                  if (items.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Cargando items...'),
                    );
                  }

                  return Card(
                    child: Column(
                      children: items
                          .map((item) => ItemStatusTile(item: item))
                          .toList(),
                    ),
                  );
                },
              ),

              const SizedBox(height: 16),

              // Timestamp info
              Text(
                'Pedido realizado: ${order.createdAt.toDisplay()}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          );
        },
      ),
    );
  }
}

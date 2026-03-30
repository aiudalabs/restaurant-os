import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/kds_ticket.dart';
import '../../providers/kds_provider.dart';
import 'ticket_timer_badge.dart';

class RecallDrawer extends ConsumerWidget {
  const RecallDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final completedAsync = ref.watch(completedTicketsProvider);
    final theme = Theme.of(context);

    return Drawer(
      width: 400,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.history,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Recall - Completados',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: completedAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (error, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Error: $error',
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  ),
                ),
                data: (tickets) {
                  if (tickets.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.check_circle_outline,
                            size: 64,
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.3),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Sin tickets completados\nen las ultimas 2 horas',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.5),
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.all(8),
                    itemCount: tickets.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final ticket = tickets[index];
                      return _RecallTicketCard(ticket: ticket);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecallTicketCard extends StatelessWidget {
  const _RecallTicketCard({required this.ticket});

  final KdsTicket ticket;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Mesa ${ticket.tableNumber}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  ticket.displayNumber,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                TicketTimerBadge(receivedAt: ticket.receivedAt),
              ],
            ),
            const SizedBox(height: 8),
            ...ticket.items.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle,
                        size: 14,
                        color: Colors.green,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${item.quantity}x ${item.productName}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          decoration: TextDecoration.lineThrough,
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

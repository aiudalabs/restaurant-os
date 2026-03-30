import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/kds_ticket.dart';
import '../../providers/kds_provider.dart';
import 'ticket_item_row.dart';
import 'ticket_timer_badge.dart';

class TicketCard extends ConsumerWidget {
  const TicketCard({
    required this.ticket,
    required this.stationId,
    super.key,
  });

  final KdsTicket ticket;
  final String stationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final urgency = ticket.urgency;

    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _urgencyBorderColor(urgency, theme),
          width: urgency == TicketUrgency.critical ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
            ),
            child: Row(
              children: [
                // Table number
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Mesa ${ticket.tableNumber}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.onPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Display number
                Text(
                  ticket.displayNumber,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                // Timer
                TicketTimerBadge(receivedAt: ticket.receivedAt),
              ],
            ),
          ),
          // Items
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: ticket.items.length,
              itemBuilder: (context, index) {
                final item = ticket.items[index];
                return TicketItemRow(
                  item: item,
                  onTap: () => _onItemTap(ref, item),
                  onLongPress: () => _onItemLongPress(ref, item),
                );
              },
            ),
          ),
          // Footer with item count and bump button
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest
                  .withValues(alpha: 0.5),
            ),
            child: Row(
              children: [
                Text(
                  '${ticket.items.where((i) => i.status == ItemStatus.done).length}/${ticket.items.length} listos',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (ticket.items.any((i) => i.status != ItemStatus.done))
                  FilledButton.tonalIcon(
                    onPressed: () => _onBumpAll(ref),
                    icon: const Icon(Icons.done_all, size: 18),
                    label: const Text('Bump All'),
                    style: FilledButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _onBumpAll(WidgetRef ref) {
    final updater = ref.read(itemStatusUpdaterProvider.notifier);
    for (final item in ticket.items) {
      if (item.status != ItemStatus.done) {
        updater.update(
          stationId: stationId,
          orderId: ticket.orderId,
          itemId: item.itemId,
          newStatus: ItemStatus.done,
        );
      }
    }
  }

  void _onItemTap(WidgetRef ref, KdsItem item) {
    final next = switch (item.status) {
      ItemStatus.queued => ItemStatus.inProgress,
      ItemStatus.inProgress => ItemStatus.done,
      ItemStatus.done => ItemStatus.done, // no further advance
      _ => item.status,
    };
    if (next != item.status) {
      ref.read(itemStatusUpdaterProvider.notifier).update(
            stationId: stationId,
            orderId: ticket.orderId,
            itemId: item.itemId,
            newStatus: next,
          );
    }
  }

  void _onItemLongPress(WidgetRef ref, KdsItem item) {
    if (item.status == ItemStatus.done) {
      ref.read(itemStatusUpdaterProvider.notifier).update(
            stationId: stationId,
            orderId: ticket.orderId,
            itemId: item.itemId,
            newStatus: ItemStatus.inProgress,
          );
    }
  }

  static Color _urgencyBorderColor(
    TicketUrgency urgency,
    ThemeData theme,
  ) =>
      switch (urgency) {
        TicketUrgency.normal => theme.dividerColor,
        TicketUrgency.warning => Colors.amber,
        TicketUrgency.critical => theme.colorScheme.error,
      };
}

import 'package:core/core.dart';
import 'package:flutter/material.dart';

import '../../models/kds_ticket.dart';

class TicketItemRow extends StatelessWidget {
  const TicketItemRow({
    required this.item,
    required this.onTap,
    required this.onLongPress,
    super.key,
  });

  final KdsItem item;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDone = item.status == ItemStatus.done;
    final isInProgress = item.status == ItemStatus.inProgress;

    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Container(
        constraints: const BoxConstraints(minHeight: 64),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: _statusBackground(item.status, theme),
          border: Border(
            bottom: BorderSide(
              color: theme.dividerColor.withValues(alpha: 0.3),
            ),
          ),
        ),
        child: Row(
          children: [
            // Status indicator
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _statusColor(item.status, theme),
              ),
            ),
            const SizedBox(width: 12),
            // Quantity
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '${item.quantity}x',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Product name and modifiers
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    item.productName,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      decoration: isDone ? TextDecoration.lineThrough : null,
                      color: isDone
                          ? theme.colorScheme.onSurface.withValues(alpha: 0.5)
                          : null,
                    ),
                  ),
                  if (item.modifiersSummary.isNotEmpty)
                    Text(
                      item.modifiersSummary.join(', '),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  if (item.specialInstructions != null &&
                      item.specialInstructions!.isNotEmpty) // safe: null check
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        item.specialInstructions!, // safe: null check above
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.amber,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Status icon
            if (isInProgress)
              const Icon(
                Icons.local_fire_department,
                color: Colors.orange,
                size: 20,
              ),
            if (isDone)
              const Icon(
                Icons.check_circle,
                color: Colors.green,
                size: 20,
              ),
          ],
        ),
      ),
    );
  }

  static Color _statusColor(ItemStatus status, ThemeData theme) =>
      switch (status) {
        ItemStatus.queued => theme.colorScheme.onSurface.withValues(alpha: 0.4),
        ItemStatus.inProgress => Colors.orange,
        ItemStatus.done => Colors.green,
        ItemStatus.cancelled => theme.colorScheme.error,
      };

  static Color _statusBackground(ItemStatus status, ThemeData theme) =>
      switch (status) {
        ItemStatus.inProgress => Colors.orange.withValues(alpha: 0.08),
        ItemStatus.done => Colors.green.withValues(alpha: 0.05),
        _ => Colors.transparent,
      };
}

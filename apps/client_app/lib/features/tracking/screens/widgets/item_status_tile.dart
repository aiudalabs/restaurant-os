import 'package:core/core.dart';
import 'package:flutter/material.dart';

class ItemStatusTile extends StatelessWidget {
  const ItemStatusTile({
    super.key,
    required this.item,
  });

  final OrderItem item;

  Color _statusColor(ItemStatus status) {
    return switch (status) {
      ItemStatus.queued => AppColors.statusPending,
      ItemStatus.inProgress => AppColors.statusInProgress,
      ItemStatus.done => AppColors.statusReady,
      ItemStatus.cancelled => AppColors.statusCancelled,
    };
  }

  String _statusLabel(ItemStatus status) {
    return switch (status) {
      ItemStatus.queued => 'En cola',
      ItemStatus.inProgress => 'Preparando',
      ItemStatus.done => 'Listo',
      ItemStatus.cancelled => 'Cancelado',
    };
  }

  IconData _statusIcon(ItemStatus status) {
    return switch (status) {
      ItemStatus.queued => Icons.hourglass_empty,
      ItemStatus.inProgress => Icons.restaurant,
      ItemStatus.done => Icons.check_circle,
      ItemStatus.cancelled => Icons.cancel,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _statusColor(item.status);

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: color.withValues(alpha: 0.15),
        child: Icon(
          _statusIcon(item.status),
          color: color,
          size: 20,
        ),
      ),
      title: Text(
        '${item.productName} x${item.quantity}',
        style: theme.textTheme.titleSmall,
      ),
      subtitle: item.modifiers.isNotEmpty
          ? Text(
              item.modifiers.map((m) => m.name).join(', '),
              style: theme.textTheme.bodySmall,
            )
          : null,
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          _statusLabel(item.status),
          style: theme.textTheme.labelSmall?.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

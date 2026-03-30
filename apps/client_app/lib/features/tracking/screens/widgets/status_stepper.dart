import 'package:core/core.dart';
import 'package:flutter/material.dart';

class StatusStepper extends StatelessWidget {
  const StatusStepper({
    super.key,
    required this.currentStatus,
  });

  final OrderStatus currentStatus;

  static const _steps = [
    (status: OrderStatus.pending, label: 'Recibido', icon: Icons.receipt),
    (status: OrderStatus.confirmed, label: 'Confirmado', icon: Icons.check_circle),
    (status: OrderStatus.inPreparation, label: 'En preparacion', icon: Icons.restaurant),
    (status: OrderStatus.ready, label: 'Listo', icon: Icons.done_all),
    (status: OrderStatus.delivered, label: 'Entregado', icon: Icons.delivery_dining),
  ];

  int get _currentIndex {
    final idx = _steps.indexWhere((s) => s.status == currentStatus);
    return idx >= 0 ? idx : 0;
  }

  Color _statusColor(OrderStatus status) {
    return switch (status) {
      OrderStatus.pending => AppColors.statusPending,
      OrderStatus.confirmed => AppColors.statusConfirmed,
      OrderStatus.inPreparation => AppColors.statusInProgress,
      OrderStatus.ready => AppColors.statusReady,
      OrderStatus.delivered => AppColors.statusDelivered,
      OrderStatus.cancelled => AppColors.statusCancelled,
      OrderStatus.closed => AppColors.statusClosed,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (currentStatus == OrderStatus.cancelled) {
      return Card(
        color: AppColors.statusCancelled.withValues(alpha: 0.1),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cancel, color: AppColors.statusCancelled),
              const SizedBox(width: 8),
              Text(
                'Pedido cancelado',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: AppColors.statusCancelled,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Row(
          children: List.generate(_steps.length * 2 - 1, (index) {
            if (index.isOdd) {
              // Connector line
              final stepIndex = index ~/ 2;
              final isCompleted = stepIndex < _currentIndex;
              return Expanded(
                child: Container(
                  height: 3,
                  color: isCompleted
                      ? _statusColor(_steps[stepIndex].status)
                      : theme.colorScheme.outlineVariant,
                ),
              );
            }

            final stepIndex = index ~/ 2;
            final step = _steps[stepIndex];
            final isCompleted = stepIndex <= _currentIndex;
            final isCurrent = stepIndex == _currentIndex;

            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: isCurrent ? 40 : 32,
                  height: isCurrent ? 40 : 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isCompleted
                        ? _statusColor(step.status)
                        : theme.colorScheme.surfaceContainerHighest,
                  ),
                  child: Icon(
                    step.icon,
                    size: isCurrent ? 22 : 16,
                    color: isCompleted
                        ? Colors.white
                        : theme.colorScheme.outline,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  step.label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                    color: isCompleted
                        ? _statusColor(step.status)
                        : theme.colorScheme.outline,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

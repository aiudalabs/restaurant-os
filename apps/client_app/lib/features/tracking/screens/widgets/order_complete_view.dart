import 'package:core/core.dart';
import 'package:flutter/material.dart';

class OrderCompleteView extends StatelessWidget {
  const OrderCompleteView({
    super.key,
    required this.order,
  });

  final Order order;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle,
              size: 80,
              color: AppColors.statusReady,
            ),
            const SizedBox(height: 24),
            Text(
              'Pedido entregado',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Gracias por tu pedido!',
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _InfoRow(
                      label: 'Subtotal',
                      value: order.subtotal.toCurrency(),
                    ),
                    const SizedBox(height: 4),
                    _InfoRow(
                      label: 'Impuesto',
                      value: order.taxAmount.toCurrency(),
                    ),
                    if (order.tipAmount > 0) ...[
                      const SizedBox(height: 4),
                      _InfoRow(
                        label: 'Propina',
                        value: order.tipAmount.toCurrency(),
                      ),
                    ],
                    const Divider(height: 16),
                    _InfoRow(
                      label: 'Total',
                      value: order.total.toCurrency(),
                      isBold: true,
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
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.isBold = false,
  });

  final String label;
  final String value;
  final bool isBold;

  @override
  Widget build(BuildContext context) {
    final style = isBold
        ? Theme.of(context)
            .textTheme
            .titleSmall
            ?.copyWith(fontWeight: FontWeight.bold)
        : Theme.of(context).textTheme.bodyMedium;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(value, style: style),
      ],
    );
  }
}

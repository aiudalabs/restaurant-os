import 'package:core/core.dart';
import 'package:flutter/material.dart';

class OrderSummary extends StatelessWidget {
  const OrderSummary({
    super.key,
    required this.subtotal,
    required this.taxPercent,
    required this.taxAmount,
    required this.total,
  });

  final double subtotal;
  final double taxPercent;
  final double taxAmount;
  final double total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _SummaryRow(
              label: 'Subtotal',
              value: subtotal.toCurrency(),
            ),
            const SizedBox(height: 8),
            _SummaryRow(
              label: 'Impuesto (${taxPercent.toPercent()})',
              value: taxAmount.toCurrency(),
            ),
            const Divider(height: 24),
            _SummaryRow(
              label: 'Total',
              value: total.toCurrency(),
              isBold: true,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.isBold = false,
    this.style,
  });

  final String label;
  final String value;
  final bool isBold;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final defaultStyle = isBold
        ? Theme.of(context)
            .textTheme
            .titleMedium
            ?.copyWith(fontWeight: FontWeight.bold)
        : Theme.of(context).textTheme.bodyMedium;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style ?? defaultStyle),
        Text(value, style: style ?? defaultStyle),
      ],
    );
  }
}

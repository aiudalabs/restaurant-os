import 'package:core/core.dart';
import 'package:flutter/material.dart';

import '../../../menu/models/cart_item.dart';

class CartItemTile extends StatelessWidget {
  const CartItemTile({
    super.key,
    required this.item,
    required this.index,
    required this.onQuantityChanged,
    required this.onRemove,
  });

  final CartItem item;
  final int index;
  final void Function(int index, int quantity) onQuantityChanged;
  final void Function(int index) onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dismissible(
      key: ValueKey('cart_item_$index'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: theme.colorScheme.error,
        child: Icon(
          Icons.delete,
          color: theme.colorScheme.onError,
        ),
      ),
      onDismissed: (_) => onRemove(index),
      child: ListTile(
        title: Text(
          item.productName,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.modifiers.isNotEmpty)
              Text(
                item.modifiers.map((m) => m.name).join(', '),
                style: theme.textTheme.bodySmall,
              ),
            if (item.specialInstructions != null)
              Text(
                item.specialInstructions!,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontStyle: FontStyle.italic,
                ),
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.remove_circle_outline, size: 20),
              onPressed: () => onQuantityChanged(index, item.quantity - 1),
              visualDensity: VisualDensity.compact,
            ),
            Text(
              '${item.quantity}',
              style: theme.textTheme.titleSmall,
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 20),
              onPressed: () => onQuantityChanged(index, item.quantity + 1),
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 8),
            Text(
              item.lineTotal.toCurrency(),
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

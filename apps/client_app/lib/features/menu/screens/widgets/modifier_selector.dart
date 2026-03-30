import 'package:core/core.dart';
import 'package:flutter/material.dart';

import '../../models/cart_item.dart';

class ModifierSelector extends StatelessWidget {
  const ModifierSelector({
    super.key,
    required this.group,
    required this.selectedModifiers,
    required this.onChanged,
  });

  final ModifierGroup group;
  final List<SelectedModifier> selectedModifiers;
  final ValueChanged<List<SelectedModifier>> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Text(
                group.name,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (group.required) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Requerido',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onErrorContainer,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        ...group.options.map((option) {
          final isSelected = selectedModifiers.any(
            (m) => m.optionId == option.id,
          );

          if (group.multiSelect) {
            return CheckboxListTile(
              title: Text(option.name),
              subtitle: option.extraPrice > 0
                  ? Text('+${option.extraPrice.toCurrency()}')
                  : null,
              value: isSelected,
              dense: true,
              onChanged: (checked) {
                final current = [...selectedModifiers];
                if (checked == true) {
                  if (current.length < group.maxSelect) {
                    current.add(SelectedModifier(
                      groupId: group.id,
                      optionId: option.id,
                      name: option.name,
                      extraPrice: option.extraPrice,
                    ));
                  }
                } else {
                  current.removeWhere((m) => m.optionId == option.id);
                }
                onChanged(current);
              },
            );
          }

          return RadioListTile<String>(
            title: Text(option.name),
            subtitle: option.extraPrice > 0
                ? Text('+${option.extraPrice.toCurrency()}')
                : null,
            value: option.id,
            groupValue: selectedModifiers.isNotEmpty
                ? selectedModifiers.first.optionId
                : null,
            dense: true,
            onChanged: (value) {
              if (value == null) return;
              onChanged([
                SelectedModifier(
                  groupId: group.id,
                  optionId: option.id,
                  name: option.name,
                  extraPrice: option.extraPrice,
                ),
              ]);
            },
          );
        }),
      ],
    );
  }
}

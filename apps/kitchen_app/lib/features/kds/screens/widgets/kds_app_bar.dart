import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/station_provider.dart';

class KdsAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const KdsAppBar({
    required this.ticketCount,
    required this.onRecallTap,
    required this.onSettingsTap,
    super.key,
  });

  final int ticketCount;
  final VoidCallback onRecallTap;
  final VoidCallback onSettingsTap;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stationAsync = ref.watch(activeStationProvider);
    final theme = Theme.of(context);

    final stationName = stationAsync.when(
      loading: () => 'Cargando...',
      error: (_, __) => 'Estacion',
      data: (station) => station?.name ?? 'Sin estacion',
    );

    return AppBar(
      title: Row(
        children: [
          Icon(
            Icons.restaurant,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(width: 12),
          Text(stationName),
          const SizedBox(width: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              '$ticketCount activos',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      actions: [
        // Recall button
        IconButton(
          onPressed: onRecallTap,
          icon: const Icon(Icons.history),
          tooltip: 'Recall',
          iconSize: 28,
        ),
        const SizedBox(width: 8),
        // Settings button
        IconButton(
          onPressed: onSettingsTap,
          icon: const Icon(Icons.settings),
          tooltip: 'Configuracion',
          iconSize: 28,
        ),
        const SizedBox(width: 8),
      ],
    );
  }
}

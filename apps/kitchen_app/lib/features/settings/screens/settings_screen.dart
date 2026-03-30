import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/providers/auth_notifier.dart';
import '../../kds/providers/kds_settings_provider.dart';
import '../../kds/providers/station_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final settingsAsync = ref.watch(kdsSettingsProvider);
    final stationAsync = ref.watch(activeStationProvider);
    final session = ref.watch(sessionNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/kds'),
        ),
        title: const Text('Configuracion'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              // Station info
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Estacion',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      stationAsync.when(
                        loading: () => const CircularProgressIndicator(),
                        error: (error, _) => Text(
                          'Error: $error',
                          style: TextStyle(color: theme.colorScheme.error),
                        ),
                        data: (station) => Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _InfoRow(
                              label: 'Nombre',
                              value: station?.name ?? 'Sin estacion',
                            ),
                            const SizedBox(height: 8),
                            _InfoRow(
                              label: 'ID',
                              value: session?.stationId ?? '-',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Volume control
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sonido',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      settingsAsync.when(
                        loading: () => const CircularProgressIndicator(),
                        error: (error, _) => Text('Error: $error'),
                        data: (volume) => Row(
                          children: [
                            Icon(
                              volume == 0
                                  ? Icons.volume_off
                                  : Icons.volume_up,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Slider(
                                value: volume,
                                min: 0,
                                max: 1,
                                divisions: 10,
                                label: '${(volume * 100).round()}%',
                                onChanged: (value) {
                                  ref
                                      .read(kdsSettingsProvider.notifier)
                                      .setVolume(value);
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 48,
                              child: Text(
                                '${(volume * 100).round()}%',
                                style: theme.textTheme.bodyMedium,
                                textAlign: TextAlign.end,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // User info
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sesion',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(
                        label: 'Usuario',
                        value: session?.userId ?? '-',
                      ),
                      const SizedBox(height: 8),
                      _InfoRow(
                        label: 'Organizacion',
                        value: session?.orgId ?? '-',
                      ),
                      const SizedBox(height: 8),
                      _InfoRow(
                        label: 'Sucursal',
                        value: session?.branchId ?? '-',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Logout button
              SizedBox(
                height: 56,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Cerrar sesion'),
                        content: const Text(
                          'Dejaras de recibir pedidos en esta estacion.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Cancelar'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('Cerrar sesion'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true && context.mounted) {
                      await ref.read(authNotifierProvider.notifier).logout();
                    }
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text(
                    'Cerrar Sesion',
                    style: TextStyle(fontSize: 16),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: theme.colorScheme.error,
                    side: BorderSide(color: theme.colorScheme.error),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

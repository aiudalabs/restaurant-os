import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/kds_provider.dart';
import 'widgets/kds_app_bar.dart';
import 'widgets/new_order_flash.dart';
import 'widgets/recall_drawer.dart';
import 'widgets/ticket_card.dart';

class KdsScreen extends ConsumerStatefulWidget {
  const KdsScreen({super.key});

  @override
  ConsumerState<KdsScreen> createState() => _KdsScreenState();
}

class _KdsScreenState extends ConsumerState<KdsScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  int _previousTicketCount = 0;

  @override
  Widget build(BuildContext context) {
    final ticketsAsync = ref.watch(kdsTicketsProvider);
    final session = ref.watch(sessionNotifierProvider);
    final stationId = session?.stationId ?? '';
    final theme = Theme.of(context);

    return ticketsAsync.when(
      loading: () => Scaffold(
        key: _scaffoldKey,
        appBar: KdsAppBar(
          ticketCount: 0,
          onRecallTap: () => _scaffoldKey.currentState?.openEndDrawer(),
          onSettingsTap: () => context.go('/settings'),
        ),
        endDrawer: const RecallDrawer(),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        key: _scaffoldKey,
        appBar: KdsAppBar(
          ticketCount: 0,
          onRecallTap: () => _scaffoldKey.currentState?.openEndDrawer(),
          onSettingsTap: () => context.go('/settings'),
        ),
        endDrawer: const RecallDrawer(),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: theme.colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                'Error al conectar',
                style: theme.textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                '$error',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
      data: (tickets) {
        final currentCount = tickets.length;

        return NewOrderFlash(
          previousCount: _previousTicketCount,
          currentCount: currentCount,
          child: Builder(builder: (context) {
            // Update count after build
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                _previousTicketCount = currentCount;
              }
            });

            return Scaffold(
              key: _scaffoldKey,
              appBar: KdsAppBar(
                ticketCount: currentCount,
                onRecallTap: () =>
                    _scaffoldKey.currentState?.openEndDrawer(),
                onSettingsTap: () => context.go('/settings'),
              ),
              endDrawer: const RecallDrawer(),
              body: tickets.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.check_circle_outline,
                            size: 80,
                            color: theme.colorScheme.primary
                                .withValues(alpha: 0.4),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Sin pedidos pendientes',
                            style:
                                theme.textTheme.headlineMedium?.copyWith(
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.6),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Los nuevos pedidos aparecen automaticamente',
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.4),
                            ),
                          ),
                        ],
                      ),
                    )
                  : Padding(
                      padding: const EdgeInsets.all(12),
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          // Calculate columns based on available width
                          // Each card should be ~320px wide minimum
                          final columns =
                              (constraints.maxWidth / 320).floor().clamp(2, 6);

                          return GridView.builder(
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: columns,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 0.75,
                            ),
                            itemCount: tickets.length,
                            itemBuilder: (context, index) {
                              return TicketCard(
                                ticket: tickets[index],
                                stationId: stationId,
                              );
                            },
                          );
                        },
                      ),
                    ),
            );
          }),
        );
      },
    );
  }
}

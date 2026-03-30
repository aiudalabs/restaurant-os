import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:client_app/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core_client/table_session.dart';
import '../../../theme/app_colors.dart';
import '../providers/tracking_provider.dart';
import 'widgets/order_complete_view.dart';

class TrackingScreen extends ConsumerWidget {
  const TrackingScreen({
    super.key,
    required this.orderId,
  });

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final orderAsync = ref.watch(orderStreamProvider(orderId));
    final itemsAsync = ref.watch(orderItemsStreamProvider(orderId));
    final session = ref.watch(tableSessionNotifierProvider);

    return Scaffold(
      backgroundColor: ClientColors.kSurface,
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 16),
              Text('Error: $error'),
            ],
          ),
        ),
        data: (order) {
          if (order == null) {
            return Center(child: Text(l10n.orderNotFound));
          }

          if (order.status == OrderStatus.delivered ||
              order.status == OrderStatus.closed) {
            return OrderCompleteView(order: order);
          }

          final elapsed = DateTime.now().difference(order.createdAt).inMinutes;

          return Column(
            children: [
              // Header
              Container(
                padding: EdgeInsets.fromLTRB(
                  20,
                  MediaQuery.of(context).padding.top + 12,
                  20,
                  20,
                ),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    bottom: BorderSide(color: ClientColors.kBorder),
                  ),
                ),
                child: Row(
                  children: [
                    if (session != null)
                      GestureDetector(
                        onTap: () => context.go('/menu'),
                        child: const Padding(
                          padding: EdgeInsets.only(right: 16),
                          child: Icon(Icons.restaurant_menu,
                              color: ClientColors.kTextPrimary),
                        ),
                      ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.orderNumber(
                              order.id.substring(0, 4).toUpperCase()),
                          style: GoogleFonts.fraunces(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: ClientColors.kTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${l10n.tableN(order.tableNumber)} · ${l10n.sentAgo(elapsed)}',
                          style: GoogleFonts.dmSans(
                            fontSize: 12,
                            color: ClientColors.kTextHint,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Content
              Expanded(
                child: ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    // Stepper
                    _TrackingStepper(currentStatus: order.status),

                    // ETA card
                    Container(
                      margin: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: ClientColors.etaGradient,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Text(
                            l10n.estimatedWait,
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '~15',
                            style: GoogleFonts.fraunces(
                              fontSize: 32,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            l10n.minutes,
                            style: GoogleFonts.dmSans(
                              fontSize: 12,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Order items
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 20),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: ClientColors.kBorder),
                      ),
                      child: Column(
                        children: [
                          // Title + badge
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                l10n.orderItems,
                                style: GoogleFonts.dmSans(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: ClientColors.kTextPrimary,
                                ),
                              ),
                              _StatusBadge(status: order.status),
                            ],
                          ),
                          const SizedBox(height: 12),
                          itemsAsync.when(
                            loading: () => const Center(
                                child: CircularProgressIndicator()),
                            error: (e, _) => Text('Error: $e'),
                            data: (items) {
                              if (items.isEmpty) {
                                return const SizedBox.shrink();
                              }
                              return Column(
                                children: items
                                    .map((item) =>
                                        _TrackingItemTile(item: item))
                                    .toList(),
                              );
                            },
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Add more items button
                    if (session != null)
                      GestureDetector(
                        onTap: () => context.go('/menu'),
                        child: Container(
                          margin:
                              const EdgeInsets.symmetric(horizontal: 20),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: ClientColors.kBorder, width: 1.5),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '+ ${l10n.addMoreItems}',
                            style: GoogleFonts.dmSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: ClientColors.kBrandRed,
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TrackingStepper extends StatelessWidget {
  const _TrackingStepper({required this.currentStatus});

  final OrderStatus currentStatus;

  static const _steps = [
    OrderStatus.pending,
    OrderStatus.inPreparation,
    OrderStatus.ready,
    OrderStatus.delivered,
  ];

  int get _currentIndex {
    // Map confirmed to same as pending for stepper
    if (currentStatus == OrderStatus.confirmed) return 0;
    final idx = _steps.indexOf(currentStatus);
    return idx >= 0 ? idx : 0;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    if (currentStatus == OrderStatus.cancelled) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: ClientColors.kError.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cancel, color: ClientColors.kError),
              const SizedBox(width: 8),
              Text(
                l10n.orderCancelled,
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: ClientColors.kError,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final labels = [
      l10n.stepReceived,
      l10n.stepPreparing,
      l10n.stepReady,
      l10n.stepDelivered,
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
      child: Row(
        children: List.generate(_steps.length * 2 - 1, (index) {
          if (index.isOdd) {
            final stepIdx = index ~/ 2;
            final isDone = stepIdx < _currentIndex;
            return Expanded(
              child: Container(
                height: 2,
                color: isDone
                    ? ClientColors.kBrandRed
                    : ClientColors.kBorder,
              ),
            );
          }

          final stepIdx = index ~/ 2;
          final isDone = stepIdx < _currentIndex;
          final isActive = stepIdx == _currentIndex;

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDone
                      ? ClientColors.kBrandRed
                      : Colors.white,
                  border: Border.all(
                    color: isActive
                        ? ClientColors.kBrandRed
                        : isDone
                            ? ClientColors.kBrandRed
                            : ClientColors.kBorder,
                    width: 2,
                  ),
                  boxShadow: isActive
                      ? [
                          const BoxShadow(
                            color: ClientColors.kBrandRedLight,
                            blurRadius: 0,
                            spreadRadius: 4,
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: isDone
                      ? const Icon(Icons.check,
                          color: Colors.white, size: 14)
                      : isActive
                          ? const Icon(Icons.sync,
                              size: 14, color: ClientColors.kBrandRed)
                          : Text(
                              '${stepIdx + 1}',
                              style: GoogleFonts.dmSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: ClientColors.kTextHint,
                              ),
                            ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                labels[stepIdx],
                style: GoogleFonts.dmSans(
                  fontSize: 10,
                  fontWeight:
                      isActive ? FontWeight.w600 : FontWeight.w400,
                  color: isActive
                      ? ClientColors.kBrandRed
                      : ClientColors.kTextHint,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          );
        }),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final OrderStatus status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    final (label, bgColor, textColor) = switch (status) {
      OrderStatus.ready => (
          l10n.ready,
          ClientColors.kSuccessLight,
          ClientColors.kSuccess,
        ),
      _ => (
          l10n.inKitchen,
          const Color(0xFFFFF3CD),
          const Color(0xFF856404),
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: GoogleFonts.dmSans(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

class _TrackingItemTile extends StatelessWidget {
  const _TrackingItemTile({required this.item});

  final OrderItem item;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    final (statusText, statusColor, indicatorColor) = switch (item.status) {
      ItemStatus.done => (
          '✓ ${l10n.ready}',
          ClientColors.kSuccess,
          ClientColors.kSuccess,
        ),
      ItemStatus.inProgress => (
          l10n.inPreparation,
          const Color(0xFF856404),
          ClientColors.kWarning,
        ),
      ItemStatus.queued => (
          l10n.queued,
          ClientColors.kTextHint,
          ClientColors.kTextHint,
        ),
      ItemStatus.cancelled => (
          l10n.orderCancelled,
          ClientColors.kError,
          ClientColors.kError,
        ),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: ClientColors.kSurface2,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Icon
            const SizedBox(
              width: 28,
              child: Icon(Icons.fastfood,
                  size: 22, color: ClientColors.kTextHint),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${item.productName} × ${item.quantity}',
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: ClientColors.kTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    statusText,
                    style: GoogleFonts.dmSans(
                      fontSize: 11,
                      color: statusColor,
                    ),
                  ),
                ],
              ),
            ),
            // Status indicator
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: indicatorColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

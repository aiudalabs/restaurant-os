import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:client_app/l10n/generated/app_localizations.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../theme/app_colors.dart';

class OrderCompleteView extends StatelessWidget {
  const OrderCompleteView({
    super.key,
    required this.order,
  });

  final Order order;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  color: ClientColors.kSuccessLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle,
                  size: 48,
                  color: ClientColors.kSuccess,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                l10n.orderDelivered,
                style: GoogleFonts.fraunces(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: ClientColors.kTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.thankYou,
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  color: ClientColors.kTextSecondary,
                ),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ClientColors.kBorder),
                ),
                child: Column(
                  children: [
                    _InfoRow(
                      label: l10n.subtotal,
                      value: order.subtotal.toCurrency(),
                    ),
                    const SizedBox(height: 8),
                    _InfoRow(
                      label: l10n.tax,
                      value: order.taxAmount.toCurrency(),
                    ),
                    if (order.tipAmount > 0) ...[
                      const SizedBox(height: 8),
                      _InfoRow(
                        label: l10n.tip,
                        value: order.tipAmount.toCurrency(),
                      ),
                    ],
                    Container(
                      height: 1,
                      color: ClientColors.kBorder,
                      margin: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          l10n.total,
                          style: GoogleFonts.dmSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: ClientColors.kTextPrimary,
                          ),
                        ),
                        Text(
                          order.total.toCurrency(),
                          style: GoogleFonts.fraunces(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: ClientColors.kBrandRed,
                          ),
                        ),
                      ],
                    ),
                  ],
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
  const _InfoRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            color: ClientColors.kTextSecondary,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.dmSans(
            fontSize: 12,
            color: ClientColors.kTextSecondary,
          ),
        ),
      ],
    );
  }
}

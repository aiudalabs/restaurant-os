import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import '../../core_client/table_session.dart';
import '../../theme/app_colors.dart';

// BFF public URL — ngrok tunnel so real devices can reach the local BFF.
// Update this whenever ngrok restarts (free plan generates a new URL each time).
const _kBffUrl = 'https://uncapsuled-subcritical-wenona.ngrok-free.dev';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  bool _loadingLink = false;
  bool _paymentLaunched = false;
  String? _error;
  StreamSubscription<DocumentSnapshot>? _orderSub;

  @override
  void initState() {
    super.initState();
    _listenToOrder();
  }

  @override
  void dispose() {
    _orderSub?.cancel();
    super.dispose();
  }

  void _listenToOrder() {
    _orderSub = FirebaseFirestore.instance
        .collection('orders')
        .doc(widget.orderId)
        .snapshots()
        .listen((snap) {
      if (!snap.exists || !mounted) return;
      final data = snap.data() as Map<String, dynamic>;
      final payment = data['payment'] as Map<String, dynamic>? ?? {};
      final paymentStatus = payment['status'] as String? ?? '';

      if (paymentStatus == 'approved') {
        _orderSub?.cancel();
        context.go('/tracking/${widget.orderId}');
      } else if (paymentStatus == 'rejected' || data['status'] == 'payment_failed') {
        setState(() => _error = 'Pago rechazado. Por favor intenta de nuevo.');
        setState(() => _paymentLaunched = false);
      }
    });
  }

  Future<void> _launchPayment() async {
    setState(() {
      _loadingLink = true;
      _error = null;
    });

    try {
      // Get order total from Firestore
      final orderSnap = await FirebaseFirestore.instance
          .collection('orders')
          .doc(widget.orderId)
          .get();
      if (!orderSnap.exists) throw Exception('Pedido no encontrado');

      final orderData = orderSnap.data()!;
      final total = (orderData['total'] as num).toDouble();
      final tableNumber = orderData['tableNumber'] as String? ?? 'Mesa';

      // Call BFF to create payment link
      final response = await http.post(
        Uri.parse('$_kBffUrl/payments/init'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'order_id': widget.orderId,
          'amount': total,
          'description': 'RestaurantOS - $tableNumber',
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode != 200) {
        throw Exception('Error del servidor (${response.statusCode})');
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final paymentUrl = body['payment_url'] as String;

      final uri = Uri.parse(paymentUrl);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        // Fallback: let the OS pick any handler
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
      setState(() => _paymentLaunched = true);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loadingLink = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(tableSessionNotifierProvider);

    return Scaffold(
      backgroundColor: ClientColors.kSurface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () => context.pop(),
                child: const Icon(Icons.arrow_back, color: ClientColors.kTextPrimary),
              ),
              const SizedBox(height: 32),
              Text(
                'Pago',
                style: GoogleFonts.fraunces(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: ClientColors.kTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Mesa ${session?.tableNumber ?? ''}',
                style: GoogleFonts.dmSans(
                  fontSize: 14,
                  color: ClientColors.kTextHint,
                ),
              ),
              const SizedBox(height: 32),

              // Payment method card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: ClientColors.kBorder),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F4FF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.credit_card_rounded,
                          color: Color(0xFF2563EB), size: 24),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Tarjeta de crédito / débito',
                            style: GoogleFonts.dmSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: ClientColors.kTextPrimary,
                            ),
                          ),
                          Text(
                            'Visa, Mastercard, Clave',
                            style: GoogleFonts.dmSans(
                              fontSize: 12,
                              color: ClientColors.kTextHint,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.check_circle_rounded,
                        color: Color(0xFF2563EB), size: 20),
                  ],
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: ClientColors.kError.withAlpha(60)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          color: ClientColors.kError, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: ClientColors.kError,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              if (_paymentLaunched && _error == null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF16A34A),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Esperando confirmación del pago...\nCompleta el pago en el navegador y vuelve aquí.',
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: const Color(0xFF15803D),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const Spacer(),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: ClientColors.kBrandRed,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: (_loadingLink || _paymentLaunched) ? null : _launchPayment,
                  child: _loadingLink
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _paymentLaunched ? 'Esperando pago...' : 'Pagar ahora',
                          style: GoogleFonts.dmSans(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),

              if (_paymentLaunched) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: TextButton(
                    onPressed: () => setState(() {
                      _paymentLaunched = false;
                      _error = null;
                    }),
                    child: Text(
                      'Volver a intentar',
                      style: GoogleFonts.dmSans(
                        fontSize: 14,
                        color: ClientColors.kTextHint,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

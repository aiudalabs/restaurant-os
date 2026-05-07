import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../theme/app_colors.dart';
import '../auth/session_provider.dart';
import 'active_orders_provider.dart';

class ActiveOrdersScreen extends ConsumerWidget {
  const ActiveOrdersScreen({super.key, required this.onAddTo});
  final void Function(String orderId, String customerName) onAddTo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(activeOrdersStreamProvider);
    final session = ref.watch(sessionProvider);

    return Scaffold(
      backgroundColor: WaiterColors.kSurface,
      body: Column(
        children: [
          _Header(
            branchName: session?.branchName ?? '',
            onLogout: () => ref.read(sessionControllerProvider).signOut(),
          ),
          Expanded(
            child: ordersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Error: $e',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.dmSans(color: WaiterColors.kError),
                  ),
                ),
              ),
              data: (orders) {
                if (orders.isEmpty) return const _Empty();
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 24),
                  itemCount: orders.length,
                  itemBuilder: (_, i) => _OrderCard(
                    order: orders[i],
                    onAddTo: onAddTo,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.branchName, required this.onLogout});
  final String branchName;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        18,
        MediaQuery.of(context).padding.top + 12,
        8,
        14,
      ),
      decoration: const BoxDecoration(color: WaiterColors.kHeader),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pedidos activos',
                  style: GoogleFonts.fraunces(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  branchName,
                  style: GoogleFonts.dmSans(
                    fontSize: 12,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onLogout,
            icon: const Icon(Icons.logout, color: Colors.white70, size: 20),
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.receipt_long_outlined,
              size: 56, color: WaiterColors.kText3),
          const SizedBox(height: 12),
          Text(
            'Sin pedidos activos',
            style: GoogleFonts.dmSans(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: WaiterColors.kText2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Los pedidos que envíes aparecerán aquí.',
            style: GoogleFonts.dmSans(
              fontSize: 12,
              color: WaiterColors.kText3,
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderCard extends ConsumerStatefulWidget {
  const _OrderCard({required this.order, required this.onAddTo});
  final ActiveOrder order;
  final void Function(String orderId, String customerName) onAddTo;

  @override
  ConsumerState<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends ConsumerState<_OrderCard> {
  bool _closing = false;

  Future<void> _close() async {
    setState(() => _closing = true);
    try {
      final db = FirebaseFirestore.instance;
      final batch = db.batch();

      batch.update(db.collection('orders').doc(widget.order.id), {
        'status': 'closed',
        'completedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      final itemsSnap = await db
          .collection('order_items')
          .where('orderId', isEqualTo: widget.order.id)
          .get();
      for (final doc in itemsSnap.docs) {
        final status = doc.data()['status'] as String?;
        if (status != 'done' && status != 'cancelled') {
          batch.update(doc.reference, {
            'status': 'done',
            'completedAt': FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error cerrando pedido: $e'),
            backgroundColor: WaiterColors.kError,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _closing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final time = DateFormat('HH:mm').format(o.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WaiterColors.kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      o.customerName.isEmpty ? 'Cliente' : o.customerName,
                      style: GoogleFonts.fraunces(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: WaiterColors.kText,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$time · ${o.itemCount} ${o.itemCount == 1 ? 'item' : 'items'}',
                      style: GoogleFonts.dmSans(
                        fontSize: 11,
                        color: WaiterColors.kText3,
                      ),
                    ),
                  ],
                ),
              ),
              _StatusChip(status: o.status),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: WaiterColors.kBorder),
          const SizedBox(height: 8),
          ...o.items.map(
            (i) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  SizedBox(
                    width: 28,
                    child: Text(
                      '${i.quantity}×',
                      style: GoogleFonts.dmMono(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: WaiterColors.kText2,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      i.productName,
                      style: GoogleFonts.dmSans(
                        fontSize: 13,
                        color: WaiterColors.kText,
                      ),
                    ),
                  ),
                  _ItemStatusDot(status: i.status),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '\$${o.total.toStringAsFixed(2)}',
            style: GoogleFonts.fraunces(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: WaiterColors.kBrand,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => widget.onAddTo(o.id, o.customerName),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: WaiterColors.kBrand,
                    side: const BorderSide(color: WaiterColors.kBrand, width: 1.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.add, size: 16),
                  label: Text(
                    'Agregar',
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _closing ? null : _close,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: WaiterColors.kText,
                    side: const BorderSide(color: WaiterColors.kBorder, width: 1.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: _closing
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check_circle_outline, size: 16),
                  label: Text(
                    _closing ? 'Cerrando…' : 'Cerrar',
                    style: GoogleFonts.dmSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      'pending' => ('Pendiente', const Color(0xFFFFF4E5), const Color(0xFFB65A00)),
      'confirmed' => ('Confirmado', const Color(0xFFE6F0FF), const Color(0xFF1256C4)),
      'in_preparation' => ('En cocina', const Color(0xFFE6F0FF), const Color(0xFF1256C4)),
      'ready' => ('Listo', const Color(0xFFE5F8EE), const Color(0xFF0F7A3B)),
      'delivered' => ('Entregado', const Color(0xFFE5F8EE), const Color(0xFF0F7A3B)),
      _ => (status, const Color(0xFFEFEFEF), const Color(0xFF555555)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}

class _ItemStatusDot extends StatelessWidget {
  const _ItemStatusDot({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'queued' => const Color(0xFFB65A00),
      'in_progress' => const Color(0xFF1256C4),
      'done' => const Color(0xFF0F7A3B),
      _ => WaiterColors.kText3,
    };
    final label = switch (status) {
      'queued' => 'En cola',
      'in_progress' => 'Preparando',
      'done' => 'Listo',
      _ => status,
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}

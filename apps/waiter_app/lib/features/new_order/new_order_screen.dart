import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_colors.dart';
import '../auth/session_provider.dart';
import 'add_to_order_args.dart';
import 'menu_providers.dart';

class NewOrderScreen extends ConsumerStatefulWidget {
  const NewOrderScreen({
    super.key,
    required this.onGoActive,
    this.addToArgs,
  });
  final VoidCallback onGoActive;
  final AddToOrderArgs? addToArgs;

  @override
  ConsumerState<NewOrderScreen> createState() => _NewOrderScreenState();
}

class _NewOrderScreenState extends ConsumerState<NewOrderScreen> {
  final _customer = TextEditingController();
  final Map<String, int> _qty = {};
  String? _selectedCategoryId;
  bool _sending = false;

  bool get _isAddMode => widget.addToArgs != null;

  @override
  void didUpdateWidget(covariant NewOrderScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.addToArgs != oldWidget.addToArgs && widget.addToArgs != null) {
      _customer.text = widget.addToArgs!.customerName;
      _qty.clear();
    }
  }

  @override
  void dispose() {
    _customer.dispose();
    super.dispose();
  }

  int get _totalItems => _qty.values.fold(0, (a, b) => a + b);

  double _computeTotal(List<Product> products) {
    double t = 0;
    for (final p in products) {
      final q = _qty[p.id] ?? 0;
      if (q > 0) t += p.price * q;
    }
    return t;
  }

  void _reset() {
    setState(() {
      _customer.clear();
      _qty.clear();
    });
  }

  Future<void> _send(List<Product> products) async {
    final session = ref.read(sessionProvider);
    if (session == null) return;
    if (_totalItems == 0) {
      _snack('Agrega al menos un producto');
      return;
    }
    if (!_isAddMode && _customer.text.trim().isEmpty) {
      _snack('Escribe el nombre del cliente');
      return;
    }

    setState(() => _sending = true);

    try {
      if (_isAddMode) {
        await _addToExisting(products, session);
      } else {
        await _createNew(products, session);
      }
      if (!mounted) return;
      _reset();
      widget.onGoActive();
      _snack(
        _isAddMode ? 'Ítems agregados al pedido' : 'Pedido enviado a cocina',
        ok: true,
      );
    } catch (e) {
      if (mounted) _snack('Error: $e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _createNew(List<Product> products, Session session) async {
    final db = FirebaseFirestore.instance;
    final batch = db.batch();
    final orderRef = db.collection('orders').doc();
    final name = _customer.text.trim();

    final subtotal = _computeTotal(products);
    const tax = 0.0;
    final total = subtotal + tax;

    batch.set(orderRef, {
      'orgId': session.orgId,
      'branchId': session.branchId,
      'tableId': '',
      'tableNumber': name,
      'customerName': name,
      'source': 'waiter',
      'status': 'pending',
      'subtotal': subtotal,
      'taxAmount': tax,
      'taxPercent': 0,
      'tipAmount': 0,
      'total': total,
      'itemCount': _totalItems,
      'payment': {
        'method': null,
        'status': null,
        'yappyOrderId': null,
        'confirmationNumber': null,
        'paidAt': null,
      },
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    _addItemsToBatch(batch, db, orderRef.id, name, products, session);
    await batch.commit();
  }

  Future<void> _addToExisting(List<Product> products, Session session) async {
    final args = widget.addToArgs!;
    final db = FirebaseFirestore.instance;
    final batch = db.batch();

    _addItemsToBatch(
      batch, db, args.orderId, args.customerName, products, session,
    );

    final addedSubtotal = _computeTotal(products);
    batch.update(db.collection('orders').doc(args.orderId), {
      'subtotal': FieldValue.increment(addedSubtotal),
      'total': FieldValue.increment(addedSubtotal),
      'itemCount': FieldValue.increment(_totalItems),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  void _addItemsToBatch(
    WriteBatch batch,
    FirebaseFirestore db,
    String orderId,
    String customerName,
    List<Product> products,
    Session session,
  ) {
    for (final p in products) {
      final q = _qty[p.id] ?? 0;
      if (q <= 0) continue;
      final stationId = session.categoryToStation[p.categoryId] ?? '';
      final itemRef = db.collection('order_items').doc();
      batch.set(itemRef, {
        'id': itemRef.id,
        'orgId': session.orgId,
        'branchId': session.branchId,
        'orderId': orderId,
        'stationId': stationId,
        'tableNumber': customerName,
        'productId': p.id,
        'productName': p.name,
        'categoryId': p.categoryId,
        'quantity': q,
        'unitPrice': p.price,
        'totalPrice': p.price * q,
        'modifiers': const <Map<String, dynamic>>[],
        'specialInstructions': null,
        'status': 'queued',
        'sentToStationAt': FieldValue.serverTimestamp(),
      });
    }
  }

  void _snack(String s, {bool ok = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(s),
        backgroundColor: ok ? WaiterColors.kGreen : WaiterColors.kError,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final productsAsync = ref.watch(menuProductsProvider);
    final categoriesAsync = ref.watch(menuCategoriesProvider);

    final products = productsAsync.asData?.value ?? const <Product>[];
    final categories = categoriesAsync.asData?.value ?? const <Category>[];

    final visibleProducts = _selectedCategoryId == null
        ? products
        : products.where((p) => p.categoryId == _selectedCategoryId).toList();

    return Column(
      children: [
        _Header(
          branchName: session?.branchName ?? '',
          email: session?.email ?? '',
          addToName: widget.addToArgs?.customerName,
        ),
        _CustomerField(
          controller: _customer,
          readOnly: _isAddMode,
        ),
        if (categories.isNotEmpty)
          _CategoryTabs(
            categories: categories,
            selectedId: _selectedCategoryId,
            onSelect: (id) => setState(() => _selectedCategoryId = id),
          ),
        Expanded(
          child: productsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Error cargando menú: $e',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.dmSans(color: WaiterColors.kError),
                ),
              ),
            ),
            data: (_) {
              if (visibleProducts.isEmpty) {
                return Center(
                  child: Text(
                    'Sin productos',
                    style: GoogleFonts.dmSans(color: WaiterColors.kText3),
                  ),
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.fromLTRB(18, 6, 18, 12),
                itemCount: visibleProducts.length,
                itemBuilder: (_, i) {
                  final p = visibleProducts[i];
                  return _MenuRow(
                    name: p.name,
                    price: p.price,
                    qty: _qty[p.id] ?? 0,
                    onMinus: () => setState(() {
                      final q = _qty[p.id] ?? 0;
                      if (q > 0) _qty[p.id] = q - 1;
                    }),
                    onPlus: () => setState(
                        () => _qty[p.id] = (_qty[p.id] ?? 0) + 1),
                  );
                },
              );
            },
          ),
        ),
        _SendBar(
          total: _computeTotal(products),
          items: _totalItems,
          sending: _sending,
          onSend: () => _send(products),
        ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.branchName,
    required this.email,
    this.addToName,
  });
  final String branchName;
  final String email;
  final String? addToName;

  @override
  Widget build(BuildContext context) {
    final isAdd = addToName != null;
    return Container(
      padding: EdgeInsets.fromLTRB(
        18,
        MediaQuery.of(context).padding.top + 12,
        18,
        14,
      ),
      decoration: const BoxDecoration(color: WaiterColors.kHeader),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isAdd ? 'Agregar a $addToName' : 'Nuevo pedido',
            style: GoogleFonts.fraunces(
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            isAdd
                ? 'Agrega más ítems al pedido activo'
                : (branchName.isEmpty ? email : branchName),
            style: GoogleFonts.dmSans(
              fontSize: 12,
              color: Colors.white70,
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomerField extends StatelessWidget {
  const _CustomerField({required this.controller, this.readOnly = false});
  final TextEditingController controller;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CLIENTE / MESA',
            style: GoogleFonts.dmSans(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
              color: WaiterColors.kText3,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            textCapitalization: TextCapitalization.words,
            readOnly: readOnly,
            decoration: InputDecoration(
              hintText: 'Ej. Mesa 5, Juan, barra…',
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: WaiterColors.kBorder, width: 1.5),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: WaiterColors.kBorder, width: 1.5),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: WaiterColors.kBrand, width: 1.8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryTabs extends StatelessWidget {
  const _CategoryTabs({
    required this.categories,
    required this.selectedId,
    required this.onSelect,
  });
  final List<Category> categories;
  final String? selectedId;
  final void Function(String?) onSelect;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
        children: [
          _Chip(
            label: 'Todos',
            selected: selectedId == null,
            onTap: () => onSelect(null),
          ),
          ...categories.map((c) => _Chip(
                label: c.name,
                selected: selectedId == c.id,
                onTap: () => onSelect(c.id),
              )),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? WaiterColors.kBrand : Colors.white,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? WaiterColors.kBrand : WaiterColors.kBorder,
              width: 1.2,
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.dmSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : WaiterColors.kText2,
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.name,
    required this.price,
    required this.qty,
    required this.onMinus,
    required this.onPlus,
  });
  final String name;
  final double price;
  final int qty;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: WaiterColors.kBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: WaiterColors.kText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '\$${price.toStringAsFixed(2)}',
                  style: GoogleFonts.dmMono(
                    fontSize: 13,
                    color: WaiterColors.kText2,
                  ),
                ),
              ],
            ),
          ),
          _QtyBtn(icon: Icons.remove, enabled: qty > 0, onTap: onMinus),
          SizedBox(
            width: 36,
            child: Text(
              '$qty',
              textAlign: TextAlign.center,
              style: GoogleFonts.dmMono(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: qty > 0 ? WaiterColors.kBrand : WaiterColors.kText3,
              ),
            ),
          ),
          _QtyBtn(icon: Icons.add, enabled: true, onTap: onPlus),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  const _QtyBtn({
    required this.icon,
    required this.enabled,
    required this.onTap,
  });
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: enabled ? WaiterColors.kSurface2 : WaiterColors.kSurface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WaiterColors.kBorder, width: 1.2),
        ),
        child: Icon(
          icon,
          size: 16,
          color: enabled ? WaiterColors.kText : WaiterColors.kText3,
        ),
      ),
    );
  }
}

class _SendBar extends StatelessWidget {
  const _SendBar({
    required this.total,
    required this.items,
    required this.sending,
    required this.onSend,
  });
  final double total;
  final int items;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: WaiterColors.kBorder)),
        ),
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$items ${items == 1 ? 'producto' : 'productos'}',
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    color: WaiterColors.kText3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: GoogleFonts.fraunces(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: WaiterColors.kText,
                  ),
                ),
              ],
            ),
            const Spacer(),
            SizedBox(
              height: 48,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: WaiterColors.kBrand,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 22),
                ),
                onPressed: sending ? null : onSend,
                icon: sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded, size: 18),
                label: Text(
                  sending ? 'Enviando…' : 'Enviar a cocina',
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

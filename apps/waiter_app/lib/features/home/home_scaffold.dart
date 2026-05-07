import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_colors.dart';
import '../active_orders/active_orders_screen.dart';
import '../new_order/add_to_order_args.dart';
import '../new_order/new_order_screen.dart';
import 'active_orders_count_provider.dart';

class HomeScaffold extends ConsumerStatefulWidget {
  const HomeScaffold({super.key});

  @override
  ConsumerState<HomeScaffold> createState() => _HomeScaffoldState();
}

class _HomeScaffoldState extends ConsumerState<HomeScaffold> {
  int _tab = 0;
  AddToOrderArgs? _addToArgs;

  void _goAddTo(String orderId, String customerName) {
    setState(() {
      _addToArgs = AddToOrderArgs(
        orderId: orderId,
        customerName: customerName,
      );
      _tab = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = ref.watch(activeOrdersCountProvider);

    return Scaffold(
      backgroundColor: WaiterColors.kSurface,
      body: IndexedStack(
        index: _tab,
        children: [
          NewOrderScreen(
            onGoActive: () => setState(() {
              _tab = 1;
              _addToArgs = null;
            }),
            addToArgs: _addToArgs,
          ),
          ActiveOrdersScreen(onAddTo: _goAddTo),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: WaiterColors.kBorder, width: 1),
          ),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 68,
            child: Row(
              children: [
                _NavItem(
                  icon: Icons.add,
                  label: 'Nuevo',
                  active: _tab == 0,
                  onTap: () => setState(() => _tab = 0),
                ),
                _NavItem(
                  icon: Icons.receipt_long_outlined,
                  label: 'Pedidos',
                  active: _tab == 1,
                  badge: activeCount,
                  onTap: () => setState(() => _tab = 1),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final String label;
  final bool active;
  final int badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? WaiterColors.kBrand : WaiterColors.kText3;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(height: 3),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: color,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            if (badge > 0)
              Positioned(
                top: 8,
                left: MediaQuery.of(context).size.width / 4 + 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  constraints: const BoxConstraints(minWidth: 18),
                  decoration: BoxDecoration(
                    color: WaiterColors.kBrand,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: Text(
                    '$badge',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
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

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../active_orders/active_orders_provider.dart';

/// Convenience provider — count of active orders shown as the nav badge.
final activeOrdersCountProvider = Provider<int>((ref) {
  final async = ref.watch(activeOrdersStreamProvider);
  return async.asData?.value.length ?? 0;
});

import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';

class KitchenApp extends ConsumerWidget {
  const KitchenApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(kitchenRouterProvider);

    return MaterialApp.router(
      title: 'RestaurantOS KDS',
      theme: AppTheme.dark(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.dark,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

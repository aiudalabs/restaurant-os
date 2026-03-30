import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'features/auth/screens/login_screen.dart';
import 'features/kds/screens/kds_screen.dart';
import 'features/settings/screens/settings_screen.dart';

part 'router.g.dart';

@Riverpod(keepAlive: true)
GoRouter kitchenRouter(Ref ref) {
  final session = ref.watch(sessionNotifierProvider);

  return GoRouter(
    initialLocation: session == null ? '/login' : '/kds',
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/kds',
        builder: (_, __) => const KdsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (_, __) => const SettingsScreen(),
      ),
    ],
    redirect: (context, state) {
      final isLoggedIn = session != null;
      final isOnLogin = state.uri.path == '/login';

      if (!isLoggedIn && !isOnLogin) return '/login';
      if (isLoggedIn && isOnLogin) return '/kds';
      return null;
    },
    errorBuilder: (_, state) => Scaffold(
      body: Center(
        child: Text('Ruta no encontrada: ${state.uri}'),
      ),
    ),
  );
}

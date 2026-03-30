import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'features/cart/screens/cart_screen.dart';
import 'features/menu/screens/category_screen.dart';
import 'features/menu/screens/menu_screen.dart';
import 'features/menu/screens/product_detail_screen.dart';
import 'features/splash/splash_screen.dart';
import 'features/tracking/screens/tracking_screen.dart';
import 'shared/error_screen.dart';

part 'router.g.dart';

@Riverpod(keepAlive: true)
GoRouter router(Ref ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (_, state) => SplashScreen(
          orgId: state.uri.queryParameters['org'],
          branchId: state.uri.queryParameters['branch'],
          tableId: state.uri.queryParameters['table'],
        ),
      ),
      // Deep link from QR: https://aiudalabs.github.io/restaurant/qr/?org=X&branch=Y&table=Z
      GoRoute(
        path: '/restaurant/qr',
        builder: (_, state) => SplashScreen(
          orgId: state.uri.queryParameters['org'],
          branchId: state.uri.queryParameters['branch'],
          tableId: state.uri.queryParameters['table'],
        ),
      ),
      GoRoute(
        path: '/error',
        builder: (_, state) => ErrorScreen(
          message: state.uri.queryParameters['msg'] ?? 'Error desconocido',
        ),
      ),
      GoRoute(
        path: '/menu',
        builder: (_, __) => const MenuScreen(),
      ),
      GoRoute(
        path: '/category/:id',
        builder: (_, state) => CategoryScreen(
          categoryId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/product/:id',
        builder: (_, state) => ProductDetailScreen(
          productId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/cart',
        builder: (_, __) => const CartScreen(),
      ),
      GoRoute(
        path: '/tracking/:orderId',
        builder: (_, state) => TrackingScreen(
          orderId: state.pathParameters['orderId']!,
        ),
      ),
    ],
    errorBuilder: (_, state) => ErrorScreen(
      message: 'Ruta no encontrada: ${state.uri}',
    ),
  );
}

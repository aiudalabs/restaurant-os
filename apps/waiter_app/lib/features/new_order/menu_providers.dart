import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:core/core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/session_provider.dart';

final _menuRepoProvider = Provider<MenuRepository>((ref) {
  return MenuRepository(FirebaseFirestore.instance);
});

final menuProductsProvider =
    StreamProvider.autoDispose<List<Product>>((ref) {
  final session = ref.watch(sessionProvider);
  if (session == null) return const Stream.empty();
  final repo = ref.watch(_menuRepoProvider);
  return repo.watchProductsByMenu(menuId: session.menuId);
});

final menuCategoriesProvider =
    StreamProvider.autoDispose<List<Category>>((ref) {
  final session = ref.watch(sessionProvider);
  if (session == null) return const Stream.empty();
  final repo = ref.watch(_menuRepoProvider);
  return repo.watchCategories(menuId: session.menuId);
});

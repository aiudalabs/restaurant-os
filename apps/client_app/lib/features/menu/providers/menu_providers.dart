import 'package:core/core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core_client/table_session.dart';

part 'menu_providers.g.dart';

/// Watches all active categories for the current branch's menu.
@riverpod
Stream<List<Category>> categoriesStream(Ref ref) {
  final session = ref.watch(tableSessionNotifierProvider);
  if (session == null) return const Stream.empty();
  final repo = ref.watch(menuRepositoryProvider);
  return repo.watchCategories(menuId: session.menuId);
}

/// Watches all active products for a given category.
/// Using manual provider.family to avoid complex codegen.
final productsByCategoryProvider =
    StreamProvider.family<List<Product>, String>((ref, categoryId) {
  final repo = ref.watch(menuRepositoryProvider);
  return repo.watchProducts(categoryId: categoryId);
});

/// Fetches a single product by ID.
final productByIdProvider =
    FutureProvider.family<Product?, String>((ref, productId) {
  final repo = ref.watch(menuRepositoryProvider);
  return repo.getProduct(productId);
});

/// Watches all products for the entire menu.
@riverpod
Stream<List<Product>> allMenuProducts(Ref ref) {
  final session = ref.watch(tableSessionNotifierProvider);
  if (session == null) return const Stream.empty();
  final repo = ref.watch(menuRepositoryProvider);
  return repo.watchProductsByMenu(menuId: session.menuId);
}

/// Fetches the Organization document for the current session.
@riverpod
Future<Organization?> currentOrganization(Ref ref) async {
  final session = ref.watch(tableSessionNotifierProvider);
  if (session == null) return null;
  final firestore = ref.watch(firestoreProvider);
  final doc = await firestore
      .collection(FirestorePaths.organizations)
      .doc(session.orgId)
      .get();
  if (!doc.exists) return null;
  return Organization.fromFirestore(doc);
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core_client/table_session.dart';
import '../providers/menu_providers.dart';
import 'widgets/cart_fab.dart';
import 'widgets/category_card.dart';

class MenuScreen extends ConsumerWidget {
  const MenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(tableSessionNotifierProvider);
    final categoriesAsync = ref.watch(categoriesStreamProvider);

    if (session == null) {
      return const Scaffold(
        body: Center(child: Text('Sesion no iniciada.')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Mesa ${session.tableNumber}'),
        centerTitle: true,
      ),
      floatingActionButton: const CartFab(),
      body: categoriesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Error al cargar el menu',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(error.toString()),
              ],
            ),
          ),
        ),
        data: (categories) {
          if (categories.isEmpty) {
            return const Center(
              child: Text('No hay categorias disponibles.'),
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.85,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: categories.length,
            itemBuilder: (context, index) {
              final category = categories[index];
              return CategoryCard(
                category: category,
                onTap: () => context.push('/category/${category.id}'),
              );
            },
          );
        },
      ),
    );
  }
}

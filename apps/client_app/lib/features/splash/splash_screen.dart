import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core_client/anon_auth.dart';
import '../../core_client/table_session.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({
    super.key,
    this.orgId,
    this.branchId,
    this.tableId,
  });

  final String? orgId;
  final String? branchId;
  final String? tableId;

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  bool _initializing = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      // 1. Validate QR params
      final orgId = widget.orgId;
      final branchId = widget.branchId;
      final tableId = widget.tableId;

      if (orgId == null || branchId == null || tableId == null) {
        _navigateToError('Escanea un QR valido para acceder al menu.');
        return;
      }

      // 2. Anonymous auth
      await ref.read(anonAuthProvider.future);

      // 3. Validate table exists and is active
      final tableRepo = ref.read(tableRepositoryProvider);
      final table = await tableRepo.getById(tableId);

      if (table == null || !table.isActive) {
        _navigateToError('Mesa no disponible. Consulta al personal.');
        return;
      }

      if (table.orgId != orgId || table.branchId != branchId) {
        _navigateToError('QR invalido para esta sucursal.');
        return;
      }

      // 4. Get branch to obtain menuId
      final firestore = ref.read(firestoreProvider);
      final branchDoc = await firestore
          .collection(FirestorePaths.branches)
          .doc(branchId)
          .get();

      if (!branchDoc.exists) {
        _navigateToError('Sucursal no encontrada.');
        return;
      }

      final branch = Branch.fromFirestore(branchDoc);

      // 5. Create session
      final session = TableSession(
        orgId: orgId,
        branchId: branchId,
        tableId: tableId,
        tableNumber: table.number,
        menuId: branch.menuId,
      );

      ref.read(tableSessionNotifierProvider.notifier).setSession(session);

      // 6. Navigate to menu
      if (mounted) {
        context.go('/menu');
      }
    } on AppException catch (e) {
      _navigateToError(e.message);
    } catch (e) {
      _navigateToError('Error inesperado. Intenta de nuevo.');
    }
  }

  void _navigateToError(String message) {
    if (mounted) {
      setState(() {
        _initializing = false;
        _error = message;
      });
      context.go('/error?msg=${Uri.encodeComponent(message)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: _error != null
            ? Text(_error!, style: Theme.of(context).textTheme.bodyLarge)
            : _initializing
                ? const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 16),
                      Text('Cargando menu...'),
                    ],
                  )
                : const SizedBox.shrink(),
      ),
    );
  }
}

import 'package:core/core.dart';
import 'package:flutter/material.dart';
import 'package:client_app/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core_client/anon_auth.dart';
import '../../core_client/table_session.dart';
import '../../theme/app_colors.dart';

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
    // Delay initialization to after the first frame so that
    // context has access to AppLocalizations and navigation.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initialize();
    });
  }

  Future<void> _initialize() async {
    try {
      final orgId = widget.orgId;
      final branchId = widget.branchId;
      final tableId = widget.tableId;

      if (orgId == null || branchId == null || tableId == null) {
        _navigateToError('scan_valid_qr');
        return;
      }

      await ref.read(anonAuthProvider.future);

      final tableRepo = ref.read(tableRepositoryProvider);
      final table = await tableRepo.getById(tableId);

      if (table == null || !table.isActive) {
        _navigateToError('table_not_available');
        return;
      }

      if (table.orgId != orgId || table.branchId != branchId) {
        _navigateToError('invalid_qr');
        return;
      }

      final firestore = ref.read(firestoreProvider);
      final branchDoc = await firestore
          .collection(FirestorePaths.branches)
          .doc(branchId)
          .get();

      if (!branchDoc.exists) {
        _navigateToError('branch_not_found');
        return;
      }

      final branch = Branch.fromFirestore(branchDoc);

      final session = TableSession(
        orgId: orgId,
        branchId: branchId,
        tableId: tableId,
        tableNumber: table.number,
        menuId: branch.menuId,
      );

      ref.read(tableSessionNotifierProvider.notifier).setSession(session);

      if (mounted) {
        context.go('/menu');
      }
    } on AppException catch (e) {
      _navigateToError(e.message);
    } catch (e) {
      _navigateToError('unexpected');
    }
  }

  void _navigateToError(String errorKey) {
    if (!mounted) return;

    setState(() {
      _initializing = false;
      _error = errorKey;
    });

    final l10n = AppLocalizations.of(context);
    final message = switch (errorKey) {
      'scan_valid_qr' => l10n.scanValidQr,
      'table_not_available' => l10n.tableNotAvailable,
      'invalid_qr' => l10n.invalidQr,
      'branch_not_found' => l10n.branchNotFound,
      'unexpected' => l10n.unexpectedError,
      _ => errorKey,
    };

    context.go('/error?msg=${Uri.encodeComponent(message)}');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: ClientColors.kSurface,
      body: Center(
        child: _initializing
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(
                    color: ClientColors.kBrandRed,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    l10n.loadingMenu,
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      color: ClientColors.kTextSecondary,
                    ),
                  ),
                ],
              )
            : const SizedBox.shrink(),
      ),
    );
  }
}

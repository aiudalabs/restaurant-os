import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Everything the waiter app needs after a successful login.
@immutable
class Session {
  const Session({
    required this.uid,
    required this.email,
    required this.orgId,
    required this.branchId,
    required this.branchName,
    required this.menuId,
    required this.categoryToStation,
  });

  final String uid;
  final String email;
  final String orgId;
  final String branchId;
  final String branchName;
  final String menuId;
  final Map<String, String> categoryToStation;
}

/// Null = not authenticated yet.
final sessionProvider = StateProvider<Session?>((ref) => null);

/// Exposed so screens can show inline errors / retry.
final sessionErrorProvider = StateProvider<String?>((ref) => null);

/// Attempts email/password login + resolves orgId/branchId/categoryIds.
/// On success, populates [sessionProvider].
class SessionController {
  SessionController(this._ref);
  final Ref _ref;

  FirebaseAuth get _auth => FirebaseAuth.instance;
  FirebaseFirestore get _db => FirebaseFirestore.instance;

  Future<void> signIn(String email, String password) async {
    _ref.read(sessionErrorProvider.notifier).state = null;
    try {
      final cred = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await _resolveSession(cred.user!);
    } on FirebaseAuthException catch (e) {
      _ref.read(sessionErrorProvider.notifier).state = _authErrorLabel(e);
      rethrow;
    } catch (e) {
      _ref.read(sessionErrorProvider.notifier).state = e.toString();
      rethrow;
    }
  }

  /// Restore session on app launch if Firebase Auth already has a user.
  Future<void> restoreIfPossible() async {
    final user = _auth.currentUser;
    if (user == null) return;
    try {
      await _resolveSession(user);
    } catch (_) {
      // If resolution fails (user doc missing, etc.) stay logged out.
      await _auth.signOut();
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
    _ref.read(sessionProvider.notifier).state = null;
  }

  Future<void> _resolveSession(User user) async {
    final userDoc = await _db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      throw Exception(
        'Tu usuario no tiene perfil en users/. Pide al admin que te agregue.',
      );
    }
    final u = userDoc.data()!;
    final orgId = (u['orgId'] as String?) ?? '';
    final branchIds = (u['branchIds'] as List?)?.cast<String>() ?? const [];
    if (orgId.isEmpty || branchIds.isEmpty) {
      throw Exception('Usuario sin orgId o branchIds asignados.');
    }
    final branchId = branchIds.first;

    final branchDoc = await _db.collection('branches').doc(branchId).get();
    final branchData = branchDoc.data() ?? const {};
    final branchName = (branchData['name'] as String?) ?? 'Sucursal';
    final menuId = (branchData['menuId'] as String?) ?? '';
    if (menuId.isEmpty) {
      throw Exception('La sucursal no tiene menú asignado.');
    }

    final stationsSnap = await _db
        .collection('stations')
        .where('orgId', isEqualTo: orgId)
        .where('branchId', isEqualTo: branchId)
        .where('isActive', isEqualTo: true)
        .get();

    if (stationsSnap.docs.isEmpty) {
      throw Exception(
        'No hay estaciones activas en el branch. Configura al menos una en el admin.',
      );
    }

    final categoryToStation = <String, String>{};
    for (final d in stationsSnap.docs) {
      final data = d.data();
      final cats = (data['categoryIds'] as List?)?.cast<String>() ?? const [];
      for (final c in cats) {
        categoryToStation[c] = d.id;
      }
    }

    _ref.read(sessionProvider.notifier).state = Session(
      uid: user.uid,
      email: user.email ?? '',
      orgId: orgId,
      branchId: branchId,
      branchName: branchName,
      menuId: menuId,
      categoryToStation: categoryToStation,
    );
  }

  String _authErrorLabel(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return 'Email inválido';
      case 'user-disabled':
        return 'Usuario deshabilitado';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Email o contraseña incorrectos';
      case 'network-request-failed':
        return 'Sin conexión a internet';
      default:
        return e.message ?? e.code;
    }
  }
}

final sessionControllerProvider = Provider<SessionController>(
  (ref) => SessionController(ref),
);


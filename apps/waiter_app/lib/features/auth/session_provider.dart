import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../core/constants.dart';

/// Everything the waiter app needs after a successful login.
@immutable
class Session {
  const Session({
    required this.uid,
    required this.displayName,
    required this.role,
    required this.orgId,
    required this.branchId,
    required this.branchName,
    required this.menuId,
    required this.categoryToStation,
  });

  final String uid;
  final String displayName;
  final String role;
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

/// Handles BFF-based authentication flow:
///   1. POST /auth/login  → receives firebase_token + employee data from BFF
///   2. signInWithCustomToken()  → exchanges for a Firebase session
///   3. _resolveSession()  → reads branch + stations from Firestore
class SessionController {
  SessionController(this._ref);
  final Ref _ref;

  FirebaseAuth get _auth => FirebaseAuth.instance;
  FirebaseFirestore get _db => FirebaseFirestore.instance;

  Future<void> signIn(String username, String password) async {
    _ref.read(sessionErrorProvider.notifier).state = null;
    try {
      // 1. Call BFF — validates against Odoo and returns a Firebase custom token.
      final response = await http.post(
        Uri.parse('$kBffUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 401) {
        throw Exception('Usuario o contraseña incorrectos');
      }
      if (response.statusCode != 200) {
        throw Exception('Error del servidor (${response.statusCode})');
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final firebaseToken = body['firebase_token'] as String;
      final employee = body['employee'] as Map<String, dynamic>;

      // 2. Exchange custom token for a Firebase Auth session.
      final cred = await _auth.signInWithCustomToken(firebaseToken);

      // 3. Resolve branch + station data from Firestore using BFF-provided identifiers.
      await _resolveSession(
        // safe: signInWithCustomToken always returns a non-null user on success.
        cred.user!,
        displayName: employee['name'] as String,
        role: employee['role'] as String,
        orgId: employee['org_id'] as String,
        branchId: employee['branch_id'] as String,
      );
    } catch (e) {
      final msg = e is Exception
          ? e.toString().replaceAll('Exception: ', '')
          : e.toString();
      _ref.read(sessionErrorProvider.notifier).state = msg;
      rethrow;
    }
  }

  /// Restore session on app launch if Firebase Auth already has a current user.
  /// Reads claims from the ID token so we don't need to hit the BFF again.
  Future<void> restoreIfPossible() async {
    final user = _auth.currentUser;
    if (user == null) return;
    try {
      final tokenResult = await user.getIdTokenResult();
      final claims = tokenResult.claims ?? {};
      final role = (claims['role'] as String?) ?? 'operator';
      final orgId = (claims['org_id'] as String?) ?? '';
      final branchId = (claims['branch_id'] as String?) ?? '';

      if (orgId.isEmpty || branchId.isEmpty) {
        // Token has no required claims — force re-login via BFF.
        await _auth.signOut();
        return;
      }

      await _resolveSession(
        user,
        displayName: user.displayName ?? user.uid,
        role: role,
        orgId: orgId,
        branchId: branchId,
      );
    } catch (_) {
      // If resolution fails for any reason, stay logged out and let the user
      // authenticate again through the BFF flow.
      await _auth.signOut();
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
    _ref.read(sessionProvider.notifier).state = null;
  }

  /// Reads branch metadata and active stations from Firestore.
  /// orgId and branchId come from the BFF response (signIn) or ID token claims (restore).
  Future<void> _resolveSession(
    User user, {
    required String displayName,
    required String role,
    required String orgId,
    required String branchId,
  }) async {
    final branchDoc = await _db.collection('branches').doc(branchId).get();
    final branchData = branchDoc.data() ?? {};
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

    final categoryToStation = <String, String>{};
    for (final d in stationsSnap.docs) {
      final cats =
          (d.data()['categoryIds'] as List?)?.cast<String>() ?? const [];
      for (final c in cats) {
        categoryToStation[c] = d.id;
      }
    }

    _ref.read(sessionProvider.notifier).state = Session(
      uid: user.uid,
      displayName: displayName,
      role: role,
      orgId: orgId,
      branchId: branchId,
      branchName: branchName,
      menuId: menuId,
      categoryToStation: categoryToStation,
    );
  }
}

final sessionControllerProvider = Provider<SessionController>(
  (ref) => SessionController(ref),
);

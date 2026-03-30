import 'package:firebase_auth/firebase_auth.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:core/core.dart';

part 'anon_auth.g.dart';

/// Ensures an anonymous Firebase Auth session is active.
/// Reuses existing session if available.
@Riverpod(keepAlive: true)
Future<User> anonAuth(AnonAuthRef ref) async {
  final auth = ref.watch(firebaseAuthProvider);
  final current = auth.currentUser;
  if (current != null) {
    return current;
  }
  final credential = await auth.signInAnonymously();
  // credential.user is guaranteed non-null after successful signInAnonymously
  return credential.user!; // safe: signInAnonymously always returns a user
}

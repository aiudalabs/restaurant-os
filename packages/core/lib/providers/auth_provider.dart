import 'package:firebase_auth/firebase_auth.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'firebase_providers.dart';

part 'auth_provider.g.dart';

@Riverpod(keepAlive: true)
Stream<User?> authStateChanges(AuthStateChangesRef ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return auth.authStateChanges();
}

@Riverpod(keepAlive: true)
User? currentUser(CurrentUserRef ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return auth.currentUser;
}

import 'package:core/core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_notifier.g.dart';

@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = const AsyncLoading();

    try {
      final auth = ref.read(firebaseAuthProvider);
      final credential = await auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final uid = credential.user!.uid; // safe: signIn succeeded
      final firestore = ref.read(firestoreProvider);

      // Read AppUser from Firestore to get stationId and org info
      final userDoc = await firestore
          .collection(FirestorePaths.users)
          .doc(uid)
          .get();

      if (!userDoc.exists) {
        await auth.signOut();
        state = AsyncError(
          const NotFoundException(),
          StackTrace.current,
        );
        return;
      }

      final appUser = AppUser.fromFirestore(userDoc);

      if (!appUser.isActive) {
        await auth.signOut();
        state = AsyncError(
          const PermissionDeniedException(),
          StackTrace.current,
        );
        return;
      }

      // Set session with user data
      ref.read(sessionNotifierProvider.notifier).setSession(
            UserSession(
              userId: uid,
              orgId: appUser.orgId,
              branchId: appUser.branchIds.first,
              role: appUser.role,
              stationId: appUser.stationId,
            ),
          );

      state = const AsyncData(null);
    } on FirebaseAuthException catch (e, st) {
      state = AsyncError(e, st);
    } on FirebaseException catch (e, st) {
      state = AsyncError(AppException.fromFirebase(e), st);
    }
  }

  Future<void> logout() async {
    final auth = ref.read(firebaseAuthProvider);
    await auth.signOut();
    ref.read(sessionNotifierProvider.notifier).clearSession();
    state = const AsyncData(null);
  }
}

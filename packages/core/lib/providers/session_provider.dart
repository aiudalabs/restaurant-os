import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/app_user.dart';

part 'session_provider.freezed.dart';
part 'session_provider.g.dart';

@freezed
class UserSession with _$UserSession {
  const factory UserSession({
    required String userId,
    required String orgId,
    required String branchId,
    required UserRole role,
    String? stationId,
  }) = _UserSession;
}

@Riverpod(keepAlive: true)
class SessionNotifier extends _$SessionNotifier {
  @override
  UserSession? build() => null;

  void setSession(UserSession session) => state = session;
  void clearSession() => state = null;

  String get orgId => state!.orgId;
  String get branchId => state!.branchId;
  bool get isAdmin => state?.role == UserRole.admin;
}

import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'table_session.freezed.dart';
part 'table_session.g.dart';

@freezed
class TableSession with _$TableSession {
  const factory TableSession({
    required String orgId,
    required String branchId,
    required String tableId,
    required String tableNumber,
    required String menuId,
  }) = _TableSession;
}

@Riverpod(keepAlive: true)
class TableSessionNotifier extends _$TableSessionNotifier {
  @override
  TableSession? build() => null;

  void setSession(TableSession session) => state = session;
}

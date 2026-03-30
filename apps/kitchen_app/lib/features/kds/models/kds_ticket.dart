import 'package:core/core.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'kds_ticket.freezed.dart';

enum TicketUrgency { normal, warning, critical }

@freezed
class KdsTicket with _$KdsTicket {
  const factory KdsTicket({
    required String orderId,
    required String tableNumber,
    required String displayNumber,
    required DateTime receivedAt,
    required List<KdsItem> items,
  }) = _KdsTicket;

  const KdsTicket._();

  bool get isAllDone => items.every((i) => i.status == ItemStatus.done);
  Duration get elapsed => DateTime.now().difference(receivedAt);

  TicketUrgency get urgency {
    final mins = elapsed.inMinutes;
    if (mins >= 15) return TicketUrgency.critical;
    if (mins >= 8) return TicketUrgency.warning;
    return TicketUrgency.normal;
  }
}

@freezed
class KdsItem with _$KdsItem {
  const factory KdsItem({
    required String itemId,
    required String productName,
    required int quantity,
    required List<String> modifiersSummary,
    String? specialInstructions,
    required ItemStatus status,
  }) = _KdsItem;
}

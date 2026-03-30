import 'package:core/core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kitchen_app/features/kds/models/kds_ticket.dart';

void main() {
  group('KdsTicket', () {
    test('isAllDone returns true when all items are done', () {
      final ticket = KdsTicket(
        orderId: 'order1',
        tableNumber: '5',
        displayNumber: '#ORDE',
        receivedAt: DateTime.now().subtract(const Duration(minutes: 5)),
        items: [
          const KdsItem(
            itemId: 'item1',
            productName: 'Hamburguesa',
            quantity: 1,
            modifiersSummary: [],
            status: ItemStatus.done,
          ),
          const KdsItem(
            itemId: 'item2',
            productName: 'Papas fritas',
            quantity: 1,
            modifiersSummary: [],
            status: ItemStatus.done,
          ),
        ],
      );
      expect(ticket.isAllDone, isTrue);
    });

    test('isAllDone returns false when some items are not done', () {
      final ticket = KdsTicket(
        orderId: 'order1',
        tableNumber: '5',
        displayNumber: '#ORDE',
        receivedAt: DateTime.now(),
        items: [
          const KdsItem(
            itemId: 'item1',
            productName: 'Hamburguesa',
            quantity: 1,
            modifiersSummary: [],
            status: ItemStatus.done,
          ),
          const KdsItem(
            itemId: 'item2',
            productName: 'Papas fritas',
            quantity: 1,
            modifiersSummary: [],
            status: ItemStatus.queued,
          ),
        ],
      );
      expect(ticket.isAllDone, isFalse);
    });

    test('urgency is normal under 8 minutes', () {
      final ticket = KdsTicket(
        orderId: 'order1',
        tableNumber: '5',
        displayNumber: '#ORDE',
        receivedAt: DateTime.now().subtract(const Duration(minutes: 3)),
        items: [],
      );
      expect(ticket.urgency, TicketUrgency.normal);
    });

    test('urgency is warning at 8+ minutes', () {
      final ticket = KdsTicket(
        orderId: 'order1',
        tableNumber: '5',
        displayNumber: '#ORDE',
        receivedAt: DateTime.now().subtract(const Duration(minutes: 10)),
        items: [],
      );
      expect(ticket.urgency, TicketUrgency.warning);
    });

    test('urgency is critical at 15+ minutes', () {
      final ticket = KdsTicket(
        orderId: 'order1',
        tableNumber: '5',
        displayNumber: '#ORDE',
        receivedAt: DateTime.now().subtract(const Duration(minutes: 20)),
        items: [],
      );
      expect(ticket.urgency, TicketUrgency.critical);
    });
  });
}

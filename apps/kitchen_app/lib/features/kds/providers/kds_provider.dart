import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:core/core.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/kds_ticket.dart';

part 'kds_provider.g.dart';

@riverpod
Stream<List<KdsTicket>> kdsTickets(Ref ref) {
  final session = ref.watch(sessionNotifierProvider);
  if (session?.stationId == null) return Stream.value([]);

  final db = ref.watch(realtimeDatabaseProvider);
  final stationId = session!.stationId!; // safe: null check above

  return db.ref('order_items/$stationId').onValue.map((event) {
    if (event.snapshot.value == null) return <KdsTicket>[];

    final raw = Map<String, dynamic>.from(
      event.snapshot.value! as Map<dynamic, dynamic>, // safe: null check above
    );

    // Group by orderId
    final Map<String, List<MapEntry<String, Map<String, dynamic>>>> byOrder =
        {};
    for (final entry in raw.entries) {
      final data = Map<String, dynamic>.from(entry.value as Map);
      // Only active items (queued or in_progress)
      if (data['status'] == 'done' || data['status'] == 'cancelled') continue;
      final orderId = (entry.key).split('_').first;
      byOrder
          .putIfAbsent(orderId, () => [])
          .add(MapEntry(entry.key, data));
    }

    return byOrder.entries.map((order) {
      final items = order.value.map((e) {
        final data = e.value;
        return KdsItem(
          itemId: e.key,
          productName: data['productName'] as String? ?? '',
          quantity: data['quantity'] as int? ?? 1,
          modifiersSummary:
              List<String>.from(data['modifiersSummary'] as List? ?? []),
          specialInstructions: data['specialInstructions'] as String?,
          status: ItemStatus.fromString(data['status'] as String),
        );
      }).toList();

      return KdsTicket(
        orderId: order.key,
        tableNumber:
            order.value.first.value['tableNumber'] as String? ?? '?',
        displayNumber: '#${order.key.substring(0, 4).toUpperCase()}',
        receivedAt: DateTime.fromMillisecondsSinceEpoch(
          order.value.first.value['sentToStationAt'] as int? ??
              DateTime.now().millisecondsSinceEpoch,
        ),
        items: items,
      );
    }).toList()
      ..sort((a, b) => a.receivedAt.compareTo(b.receivedAt));
  });
}

/// Tracks completed tickets for the recall drawer.
/// Shows last 10 tickets completed in the last 2 hours.
@riverpod
Stream<List<KdsTicket>> completedTickets(Ref ref) {
  final session = ref.watch(sessionNotifierProvider);
  if (session?.stationId == null) return Stream.value([]);

  final db = ref.watch(realtimeDatabaseProvider);
  final stationId = session!.stationId!; // safe: null check above

  return db.ref('order_items/$stationId').onValue.map((event) {
    if (event.snapshot.value == null) return <KdsTicket>[];

    final raw = Map<String, dynamic>.from(
      event.snapshot.value! as Map<dynamic, dynamic>, // safe: null check above
    );

    final twoHoursAgo =
        DateTime.now().subtract(const Duration(hours: 2)).millisecondsSinceEpoch;

    // Group by orderId, only done items
    final Map<String, List<MapEntry<String, Map<String, dynamic>>>> byOrder =
        {};
    for (final entry in raw.entries) {
      final data = Map<String, dynamic>.from(entry.value as Map);
      if (data['status'] != 'done') continue;
      final updatedAt = data['updatedAt'] as int? ?? 0;
      if (updatedAt < twoHoursAgo) continue;
      final orderId = (entry.key).split('_').first;
      byOrder
          .putIfAbsent(orderId, () => [])
          .add(MapEntry(entry.key, data));
    }

    final tickets = byOrder.entries.map((order) {
      final items = order.value.map((e) {
        final data = e.value;
        return KdsItem(
          itemId: e.key,
          productName: data['productName'] as String? ?? '',
          quantity: data['quantity'] as int? ?? 1,
          modifiersSummary:
              List<String>.from(data['modifiersSummary'] as List? ?? []),
          specialInstructions: data['specialInstructions'] as String?,
          status: ItemStatus.fromString(data['status'] as String),
        );
      }).toList();

      return KdsTicket(
        orderId: order.key,
        tableNumber:
            order.value.first.value['tableNumber'] as String? ?? '?',
        displayNumber: '#${order.key.substring(0, 4).toUpperCase()}',
        receivedAt: DateTime.fromMillisecondsSinceEpoch(
          order.value.first.value['sentToStationAt'] as int? ??
              DateTime.now().millisecondsSinceEpoch,
        ),
        items: items,
      );
    }).toList()
      ..sort((a, b) => b.receivedAt.compareTo(a.receivedAt));

    // Return last 10
    return tickets.take(10).toList();
  });
}

/// Updates item status in both Realtime DB (speed) and Firestore (truth).
@riverpod
class ItemStatusUpdater extends _$ItemStatusUpdater {
  @override
  void build() {}

  Future<void> update({
    required String stationId,
    required String orderId,
    required String itemId,
    required ItemStatus newStatus,
  }) async {
    final db = ref.read(realtimeDatabaseProvider);
    final firestore = ref.read(firestoreProvider);

    // itemId is already the full RTDB key: "{orderId}_{firestoreItemId}"
    final rtdbKey = itemId;
    // Extract the Firestore document ID (part after first underscore)
    final firestoreItemId = itemId.substring(itemId.indexOf('_') + 1);

    // Realtime DB first (speed - KDS sees it in <50ms)
    await db.ref('order_items/$stationId/$rtdbKey').update({
      'status': newStatus.toFirestore(),
      'updatedAt': ServerValue.timestamp,
    });

    // Then Firestore (source of truth)
    await firestore.doc(FirestorePaths.orderItem(firestoreItemId)).update({
      'status': newStatus.toFirestore(),
      'updatedAt': FieldValue.serverTimestamp(),
      if (newStatus == ItemStatus.inProgress)
        'startedAt': FieldValue.serverTimestamp(),
      if (newStatus == ItemStatus.done)
        'completedAt': FieldValue.serverTimestamp(),
    });
  }
}

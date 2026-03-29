import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'order_item.freezed.dart';
part 'order_item.g.dart';

enum ItemStatus {
  queued,
  inProgress,
  done,
  cancelled;

  static ItemStatus fromString(String v) => ItemStatus.values
      .firstWhere((e) => e.name == _toCamel(v), orElse: () => queued);

  static String _toCamel(String s) => s.replaceAllMapped(
      RegExp(r'_([a-z])'), (m) => m[1]!.toUpperCase());

  String toFirestore() => name.replaceAllMapped(
      RegExp(r'[A-Z]'), (m) => '_${m[0]!.toLowerCase()}');
}

@freezed
class OrderItemModifier with _$OrderItemModifier {
  const factory OrderItemModifier({
    required String name,
    required String value,
    required double extraPrice,
  }) = _OrderItemModifier;

  factory OrderItemModifier.fromJson(Map<String, dynamic> json) =>
      _$OrderItemModifierFromJson(json);
}

@freezed
class OrderItem with _$OrderItem {
  @JsonSerializable(explicitToJson: true)
  const factory OrderItem({
    required String id,
    required String orgId,
    required String branchId,
    required String orderId,
    required String stationId,
    required String tableNumber,
    required String productId,
    required String productName,
    required String categoryId,
    required int quantity,
    required double unitPrice,
    required double totalPrice,
    required List<OrderItemModifier> modifiers,
    String? specialInstructions,
    required ItemStatus status,
    required DateTime sentToStationAt,
    DateTime? startedAt,
    DateTime? completedAt,
  }) = _OrderItem;

  factory OrderItem.fromJson(Map<String, dynamic> json) =>
      _$OrderItemFromJson(json);

  factory OrderItem.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return OrderItem.fromJson({
      ...data,
      'id': doc.id,
      'status': ItemStatus.fromString(data['status'] as String).name,
      'sentToStationAt':
          (data['sentToStationAt'] as Timestamp).toDate().toIso8601String(),
      'startedAt': data['startedAt'] != null
          ? (data['startedAt'] as Timestamp).toDate().toIso8601String()
          : null,
      'completedAt': data['completedAt'] != null
          ? (data['completedAt'] as Timestamp).toDate().toIso8601String()
          : null,
    });
  }

  const OrderItem._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id')..remove('startedAt')..remove('completedAt'),
        'status': status.toFirestore(),
        'sentToStationAt': Timestamp.fromDate(sentToStationAt),
        if (startedAt != null) 'startedAt': Timestamp.fromDate(startedAt!),
        if (completedAt != null)
          'completedAt': Timestamp.fromDate(completedAt!),
      };
}

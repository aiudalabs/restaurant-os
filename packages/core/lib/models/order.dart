import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'order.freezed.dart';
part 'order.g.dart';

enum OrderStatus {
  pending,
  confirmed,
  inPreparation,
  ready,
  delivered,
  cancelled,
  closed;

  static OrderStatus fromString(String v) => OrderStatus.values
      .firstWhere((e) => e.name == _toCamel(v), orElse: () => pending);

  static String _toCamel(String s) => s.replaceAllMapped(
      RegExp(r'_([a-z])'), (m) => m[1]!.toUpperCase());

  String toFirestore() => name.replaceAllMapped(
      RegExp(r'[A-Z]'), (m) => '_${m[0]!.toLowerCase()}');
}

@freezed
class PaymentInfo with _$PaymentInfo {
  const factory PaymentInfo({
    String? method,
    String? status,
    String? yappyOrderId,
    String? confirmationNumber,
    DateTime? paidAt,
  }) = _PaymentInfo;

  factory PaymentInfo.fromJson(Map<String, dynamic> json) =>
      _$PaymentInfoFromJson(json);

  static PaymentInfo empty() => const PaymentInfo();
}

@freezed
class Order with _$Order {
  const factory Order({
    required String id,
    required String orgId,
    required String branchId,
    required String tableId,
    required String tableNumber,
    required OrderStatus status,
    required double subtotal,
    required double taxAmount,
    required double taxPercent,
    required double tipAmount,
    required double total,
    String? notes,
    required int itemCount,
    required PaymentInfo payment,
    required DateTime createdAt,
    required DateTime updatedAt,
    DateTime? completedAt,
  }) = _Order;

  factory Order.fromJson(Map<String, dynamic> json) => _$OrderFromJson(json);

  factory Order.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Order.fromJson({
      ...data,
      'id': doc.id,
      'status': data['status'] as String,
      'createdAt':
          (data['createdAt'] as Timestamp).toDate().toIso8601String(),
      'updatedAt':
          (data['updatedAt'] as Timestamp).toDate().toIso8601String(),
      'completedAt': data['completedAt'] != null
          ? (data['completedAt'] as Timestamp).toDate().toIso8601String()
          : null,
    });
  }

  const Order._();

  Map<String, dynamic> toFirestore() => {
        ...toJson()..remove('id'),
        'status': status.toFirestore(),
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
        if (completedAt != null)
          'completedAt': Timestamp.fromDate(completedAt!),
      };
}

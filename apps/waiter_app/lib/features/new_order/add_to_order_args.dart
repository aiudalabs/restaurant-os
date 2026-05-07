import 'package:flutter/foundation.dart';

@immutable
class AddToOrderArgs {
  const AddToOrderArgs({
    required this.orderId,
    required this.customerName,
  });
  final String orderId;
  final String customerName;
}

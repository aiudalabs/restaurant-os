import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

extension DateTimeX on DateTime {
  /// Formato legible para UI: "29 mar 2026, 10:30 PM"
  String toDisplay() => DateFormat('d MMM yyyy, h:mm a').format(this);

  /// Formato corto: "10:30 PM"
  String toTimeOnly() => DateFormat('h:mm a').format(this);

  /// Convierte a Timestamp de Firestore.
  Timestamp toTimestamp() => Timestamp.fromDate(this);
}

extension TimestampX on Timestamp {
  /// Convierte a DateTime de Dart.
  DateTime toDateTime() => toDate();
}

extension StringX on String {
  /// Capitaliza la primera letra.
  String capitalize() =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';
}

extension DoubleX on double {
  /// Formato de moneda: "12.50"
  String toCurrency({String symbol = '\$'}) =>
      '$symbol${toStringAsFixed(2)}';

  /// Formato de porcentaje: "7%"
  String toPercent() => '${(this * 100).toStringAsFixed(0)}%';
}

import 'package:flutter/material.dart';

abstract class AppColors {
  // Brand
  static const Color brandRed = Color(0xFFC8392B);
  static const Color brandGold = Color(0xFFD4A853);

  // Status — para indicadores de estado de pedidos/items
  static const Color statusPending = Color(0xFFFFA726);
  static const Color statusConfirmed = Color(0xFF42A5F5);
  static const Color statusInProgress = Color(0xFFAB47BC);
  static const Color statusReady = Color(0xFF66BB6A);
  static const Color statusDelivered = Color(0xFF26A69A);
  static const Color statusCancelled = Color(0xFFEF5350);
  static const Color statusClosed = Color(0xFF78909C);

  // Surfaces
  static const Color surface = Color(0xFFFAFAFA);
  static const Color surfaceDark = Color(0xFF121212);
}

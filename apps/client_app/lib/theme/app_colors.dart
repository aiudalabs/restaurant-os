import 'package:flutter/material.dart';

abstract final class ClientColors {
  // Brand
  static const Color kBrandRed = Color(0xFFC8392B);
  static const Color kBrandRedDark = Color(0xFF9E2A1F);
  static const Color kBrandRedLight = Color(0xFFF5E6E4);
  static const Color kGoldAccent = Color(0xFFD4A853);

  // Surfaces
  static const Color kSurface = Color(0xFFFEFAF7);
  static const Color kSurface2 = Color(0xFFF5EDE8);
  static const Color kBorder = Color(0xFFEDE0D8);

  // Text
  static const Color kTextPrimary = Color(0xFF1A1008);
  static const Color kTextSecondary = Color(0xFF5C4033);
  static const Color kTextHint = Color(0xFF9E8070);

  // Semantic
  static const Color kSuccess = Color(0xFF2D7A4F);
  static const Color kSuccessLight = Color(0xFFE8F5EE);
  static const Color kWarning = Color(0xFFF59E0B);
  static const Color kError = Color(0xFFEF4444);
  static const Color kInfo = Color(0xFF3B82F6);

  // Gradients
  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment(-0.5, -1),
    end: Alignment(0.5, 1),
    colors: [Color(0xFF8B1A0E), kBrandRed, kGoldAccent],
    stops: [0.0, 0.6, 1.0],
  );

  static const LinearGradient etaGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [kBrandRed, kBrandRedDark],
  );
}

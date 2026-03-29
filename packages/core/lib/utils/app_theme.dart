import 'package:flutter/material.dart';

abstract class AppTheme {
  static const Color brandRed = Color(0xFFC8392B);
  static const Color brandGold = Color(0xFFD4A853);

  static ThemeData light() => ThemeData(
        useMaterial3: true,
        colorSchemeSeed: brandRed,
        brightness: Brightness.light,
        materialTapTargetSize: MaterialTapTargetSize.padded,
      );

  static ThemeData dark() => ThemeData(
        useMaterial3: true,
        colorSchemeSeed: brandRed,
        brightness: Brightness.dark,
        materialTapTargetSize: MaterialTapTargetSize.padded,
      );
}

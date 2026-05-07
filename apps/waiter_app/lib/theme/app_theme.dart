import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

abstract final class WaiterTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: WaiterColors.kSurface,
      colorScheme: const ColorScheme.light(
        primary: WaiterColors.kBrand,
        onPrimary: Colors.white,
        secondary: WaiterColors.kGold,
        surface: WaiterColors.kSurface,
        error: WaiterColors.kError,
        outline: WaiterColors.kBorder,
        outlineVariant: WaiterColors.kBorder,
      ),
      materialTapTargetSize: MaterialTapTargetSize.padded,
    );

    return base.copyWith(
      textTheme: GoogleFonts.dmSansTextTheme(base.textTheme).copyWith(
        headlineMedium: GoogleFonts.fraunces(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: WaiterColors.kText,
        ),
        titleLarge: GoogleFonts.fraunces(
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: WaiterColors.kText,
        ),
        titleMedium: GoogleFonts.dmSans(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: WaiterColors.kText,
        ),
        bodyLarge: GoogleFonts.dmSans(
          fontSize: 15,
          color: WaiterColors.kText,
        ),
        bodyMedium: GoogleFonts.dmSans(
          fontSize: 13,
          color: WaiterColors.kText2,
        ),
        bodySmall: GoogleFonts.dmSans(
          fontSize: 12,
          color: WaiterColors.kText3,
        ),
        labelSmall: GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
          color: WaiterColors.kText3,
        ),
      ),
    );
  }
}

TextStyle kMonoStyle({
  double size = 14,
  FontWeight weight = FontWeight.w600,
  Color color = WaiterColors.kText,
}) =>
    GoogleFonts.dmMono(fontSize: size, fontWeight: weight, color: color);

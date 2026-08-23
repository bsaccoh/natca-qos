import 'package:flutter/material.dart';

class AppColors {
  static const primaryBlue = Color(0xFF1A3C8F);
  static const accentGreen = Color(0xFF00A651);
  static const warningOrange = Color(0xFFF5A623);
  static const errorRed = Color(0xFFE53935);
  static const successGreen = Color(0xFF43A047);
  static const progressYellow = Color(0xFFFBC02D);
  static const closedGrey = Color(0xFF9E9E9E);
  static const background = Color(0xFFF5F7FA);
  static const cardWhite = Color(0xFFFFFFFF);
  static const textPrimary = Color(0xFF1A1A2E);
  static const textSecondary = Color(0xFF757575);
  static const textMuted = Color(0xFF757575);
  static const textLight = Color(0xFFBDBDBD);
  static const border = Color(0xFFE0E0E0);

  static const blueLightBG = Color(0xFFEEF2FF);
  static const greenLightBG = Color(0xFFE8F5E9);
  static const orangeLightBG = Color(0xFFFFF3E0);
  static const redLightBG = Color(0xFFFFEBEE);

  // Theme support
  static bool isDark = false;
  static Color get dynamicBackground => isDark ? const Color(0xFF121212) : background;
  static Color get dynamicCard => isDark ? const Color(0xFF1E1E1E) : cardWhite;
  static Color get dynamicTextPrimary => isDark ? const Color(0xFFF5F5F5) : textPrimary;
  static Color get dynamicTextSecondary => isDark ? const Color(0xFFA0A0A0) : textSecondary;
  static Color get dynamicBorder => isDark ? const Color(0xFF2D2D2D) : border;
}

const _displayFont = 'Poppins';
const _bodyFont = 'Inter';
const _fallback = ['SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'];

class AppTextStyles {
  static TextStyle get h1 => TextStyle(
        fontFamily: _displayFont,
        fontFamilyFallback: _fallback,
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: AppColors.dynamicTextPrimary,
      );

  static TextStyle get h2 => TextStyle(
        fontFamily: _displayFont,
        fontFamilyFallback: _fallback,
        fontSize: 22,
        fontWeight: FontWeight.bold,
        color: AppColors.dynamicTextPrimary,
      );

  static TextStyle get h3 => TextStyle(
        fontFamily: _displayFont,
        fontFamilyFallback: _fallback,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.dynamicTextPrimary,
      );

  static TextStyle get body => TextStyle(
        fontFamily: _bodyFont,
        fontFamilyFallback: _fallback,
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: AppColors.dynamicTextPrimary,
      );

  static TextStyle get small => TextStyle(
        fontFamily: _bodyFont,
        fontFamilyFallback: _fallback,
        fontSize: 12,
        fontWeight: FontWeight.normal,
        color: AppColors.dynamicTextSecondary,
      );

  static TextStyle get micro => TextStyle(
        fontFamily: _bodyFont,
        fontFamilyFallback: _fallback,
        fontSize: 10,
        fontWeight: FontWeight.normal,
        color: AppColors.textLight,
      );
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Centralized CSS-like design tokens for Typography.
/// Tailored to light-theme charcoal hierarchy.
class AppTypography {
  static TextStyle getHeadlineLarge(BuildContext context) {
    return GoogleFonts.outfit(
      fontSize: 28,
      fontWeight: FontWeight.bold,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle getHeadlineMedium(BuildContext context) {
    return GoogleFonts.outfit(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle getHeadlineSmall(BuildContext context) {
    return GoogleFonts.outfit(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle getBodyLarge(BuildContext context) {
    return GoogleFonts.outfit(
      fontSize: 16,
      fontWeight: FontWeight.normal,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle getBodyMedium(BuildContext context) {
    return GoogleFonts.outfit(
      fontSize: 14,
      fontWeight: FontWeight.normal,
      color: AppColors.textSecondary,
    );
  }

  static TextStyle getCaption(BuildContext context) {
    return GoogleFonts.outfit(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      color: AppColors.textLight,
    );
  }
}

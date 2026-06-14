import 'package:flutter/material.dart';

/// Centralized CSS-like design tokens for Colors.
/// Customized for a Light Theme focus, with no card outlines and soft light-blue/charcoal accents.
class AppColors {
  // Brand colors
  static const Color primary = Color(0xFF3A86F5); // Light Blue
  static const Color secondary = Color(0xFF5856D6); // Purple accent

  // Light Theme Colors (Default)
  static const Color background = Color(0xFFF8F9FA); // Very light grey
  static const Color surface = Color(0xFFFFFFFF); // Pure white for cards/inputs
  static const Color border = Color(0xFFE9ECEF); // Soft divider border (if needed, but no card outlines)

  // Charcoal/Grey Scale for Typography & UI
  static const Color textPrimary = Color(0xFF212529); // Charcoal dark
  static const Color textSecondary = Color(0xFF495057); // Medium charcoal
  static const Color textLight = Color(0xFF868E96); // Light charcoal/grey
  static const Color textLink = Color(0xFF3A86F5); // Link blue

  // Status/Alert Colors
  static const Color success = Color(0xFF2B8A3E); // Soft green
  static const Color warning = Color(0xFFE67E22); // Soft orange
  static const Color error = Color(0xFFC92A2A); // Soft red
}

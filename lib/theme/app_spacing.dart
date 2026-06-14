import 'package:flutter/material.dart';

/// Centralized CSS-like design tokens for Layout Spacing & Borders.
class AppSpacing {
  // Padding & Margin Tokens
  static const double xs = 4.0;
  static const double s = 8.0;
  static const double m = 16.0;
  static const double l = 24.0;
  static const double xl = 32.0;

  // Border Radius Tokens (iOS standard rounded corners)
  static const double radiusS = 6.0;
  static const double radiusM = 12.0;
  static const double radiusL = 20.0;
  static const double radiusMax = 999.0; // Pill shapes

  // EdgeInsets Helper Utilities for layouts
  static const EdgeInsets paddingAllS = EdgeInsets.all(s);
  static const EdgeInsets paddingAllM = EdgeInsets.all(m);
  static const EdgeInsets paddingAllL = EdgeInsets.all(l);
  
  static const EdgeInsets paddingHorizontalM = EdgeInsets.symmetric(horizontal: m);
  static const EdgeInsets paddingVerticalM = EdgeInsets.symmetric(vertical: m);

  // Spacing boxes for list and layout separations
  static const SizedBox heightXS = SizedBox(height: xs);
  static const SizedBox heightS = SizedBox(height: s);
  static const SizedBox heightM = SizedBox(height: m);
  static const SizedBox heightL = SizedBox(height: l);

  static const SizedBox widthXS = SizedBox(width: xs);
  static const SizedBox widthS = SizedBox(width: s);
  static const SizedBox widthM = SizedBox(width: m);
}

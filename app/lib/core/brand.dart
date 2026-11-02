import 'package:flutter/material.dart';

/// Single place to rebrand. Name and contact are placeholders until the real brand is decided.
/// Bright/light palette only (no dark mode): "Ocean Breeze" — cool near-white background, bright
/// cyan primary, punchy magenta accent for CTAs and highlights.
class Brand {
  static const name = 'Travila';
  static const tagline = 'Travel data, sorted before you land.';
  static const supportEmail = 'support@example.com'; // TODO: replace with the real support address
  static const fontFamily = 'Delius';

  static const bg = Color(0xFFF5FAFF);
  static const surface = Color(0xFFFFFFFF);
  // Fixed dark ink for text that sits on a fixed-color surface (e.g. a white pill on the
  // always-vivid gradient banner) regardless of theme — not meant to be read as "the text color".
  static const ink = Color(0xFF10243E);

  static const primary = Color(0xFF00B8D9);
  static const accent = Color(0xFFFF4D8D);

  static const seed = primary;
  static const gradient = LinearGradient(
    colors: [primary, accent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

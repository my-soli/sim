import 'package:flutter/material.dart';

/// Single place to rebrand. Name and contact are placeholders until the real brand is decided.
/// Palette from https://www.realtimecolors.com/?colors=02040e-f0f2fd-253ddd-d87ceb-e558cb
/// (their role order is Text, Background, Primary, Secondary, Accent) — the site is dark-only,
/// so the roles are inverted here: their near-black "Text" becomes our dark background, and
/// their near-white "Background" becomes our on-dark text.
class Brand {
  static const name = 'Tembea';
  static const tagline = 'Travel data, sorted before you land.';
  static const supportEmail = 'support@example.com'; // TODO: replace with the real support address
  static const fontFamily = 'Delius';

  // Dark mode (default): their "Text" hex as our background, their "Background" hex as our text.
  static const bg = Color(0xFF02040E);
  static const onBg = Color(0xFFF0F2FD);
  // Light mode: the same two hexes in their original, non-inverted roles.
  static const lightBg = onBg;
  static const lightOnBg = bg;

  static const primary = Color(0xFF253DDD);
  static const secondary = Color(0xFFD87CEB);
  static const accent = Color(0xFFE558CB);

  static const seed = primary;
  static const gradient = LinearGradient(
    colors: [primary, accent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

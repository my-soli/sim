import 'package:flutter/material.dart';

/// Single place to rebrand. Name, contact and colors are placeholders until the real brand is decided.
class Brand {
  static const name = 'Tembea';
  static const tagline = 'Travel data, sorted before you land.';
  static const supportEmail = 'support@example.com'; // TODO: replace with the real support address
  static const seed = Color(0xFF0B6E4F);
  static const gradient = LinearGradient(
    colors: [Color(0xFF064E3B), Color(0xFF0B6E4F), Color(0xFF14906A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

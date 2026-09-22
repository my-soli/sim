import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

final themeController = ThemeController();

/// Persists the user's light/dark preference. Defaults to dark (the brand look); the toggle in
/// the nav lets someone check the site in light mode without that becoming the app-wide default.
class ThemeController extends ChangeNotifier {
  static const _key = 'theme_mode';
  ThemeMode mode = ThemeMode.dark;

  Future<void> restore() async {
    try {
      final saved = (await SharedPreferences.getInstance()).getString(_key);
      if (saved == 'light') mode = ThemeMode.light;
    } catch (_) {/* storage unavailable: keep the default */}
    notifyListeners();
  }

  Future<void> toggle() async {
    mode = mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    try {
      await (await SharedPreferences.getInstance()).setString(_key, mode == ThemeMode.light ? 'light' : 'dark');
    } catch (_) {}
  }
}

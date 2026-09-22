import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

final api = ApiClient();
final session = Session();

/// Holds the login token. Extends ChangeNotifier so the router re-evaluates redirects on sign in/out.
class Session extends ChangeNotifier {
  static const _key = 'auth_token';
  bool get signedIn => api.token != null;

  Future<void> restore() async {
    try {
      api.token = (await SharedPreferences.getInstance()).getString(_key);
    } catch (_) {/* storage unavailable: start signed out */}
    notifyListeners();
  }

  Future<void> signIn(String token) async {
    api.token = token;
    try {
      await (await SharedPreferences.getInstance()).setString(_key, token);
    } catch (_) {}
    notifyListeners();
  }

  Future<void> signOut() async {
    api.token = null;
    try {
      await (await SharedPreferences.getInstance()).remove(_key);
    } catch (_) {}
    notifyListeners();
  }
}

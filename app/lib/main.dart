import 'package:flutter/material.dart';

import 'app.dart';
import 'core/session.dart';
import 'core/theme_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Future.wait([session.restore(), themeController.restore()]);
  runApp(const EsimApp());
}

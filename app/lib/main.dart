import 'package:flutter/material.dart';

import 'app.dart';
import 'core/session.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await session.restore();
  runApp(const EsimApp());
}

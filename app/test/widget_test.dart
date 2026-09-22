import 'package:esim_app/core/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('money formats cents', () => expect(money(334), '\$3.34'));
  test('data labels', () {
    expect(dataLabel(5 * 1024 * 1024 * 1024), '5 GB');
    expect(dataLabel(512 * 1024 * 1024), '512 MB');
  });
  test('flag emoji for ISO code', () => expect(flagFor('KE'), '🇰🇪'));
}

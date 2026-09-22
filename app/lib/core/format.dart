String money(int cents) => '\$${(cents / 100).toStringAsFixed(2)}';

String dataLabel(int bytes) {
  final gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return '${gb == gb.roundToDouble() ? gb.toInt() : gb.toStringAsFixed(1)} GB';
  return '${(bytes / (1024 * 1024)).round()} MB';
}

String daysLabel(int days) => days == 1 ? '1 day' : '$days days';

/// Regional indicator flag emoji for an ISO alpha-2 code; falls back to a globe for region codes.
String flagFor(String code, {bool regional = false}) {
  if (regional || code.length != 2) return '🌍';
  final base = 0x1F1E6 - 0x41;
  return String.fromCharCodes(code.toUpperCase().codeUnits.map((c) => base + c));
}

/// Short label for when a plan's validity countdown starts (provider's `activeType`: 1 = install, 2 = connection).
String activeTypeLabel(int activeType) =>
    activeType == 2 ? 'Countdown starts when you connect abroad' : 'Countdown starts as soon as you install it';

String expiryLabel(DateTime? at) {
  if (at == null) return '';
  final d = at.toLocal().difference(DateTime.now());
  if (d.isNegative) return 'Expired';
  if (d.inDays >= 1) return 'Expires in ${d.inDays} day${d.inDays == 1 ? '' : 's'}';
  return 'Expires in ${d.inHours}h';
}

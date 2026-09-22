import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/site.dart';

enum _Os { ios, android }

const _steps = {
  _Os.ios: [
    ('Check your iPhone is compatible', 'You need an eSIM-capable, carrier-unlocked iPhone (XS/XR or newer) on iOS 12.1 or later.'),
    ('Connect to Wi-Fi', 'You need an internet connection to download the eSIM.'),
    ('Open Settings › Cellular', 'Tap “Add eSIM” (on some versions: “Add Cellular Plan”).'),
    ('Scan the QR code', 'Tap “Use QR Code” and scan the QR from your order. Bought on this phone? Choose “Enter Details Manually” and paste the SM-DP+ address and activation code.'),
    ('Label your plan', 'Name it something like “Travel data” so it\'s easy to find.'),
    ('Turn on data roaming when you land', 'Settings › Cellular › your travel plan › enable “Data Roaming”, and set it as your Cellular Data line.'),
  ],
  _Os.android: [
    ('Check your phone is compatible', 'You need an eSIM-capable, unlocked Android phone (e.g. Pixel 3+, Galaxy S20+).'),
    ('Connect to Wi-Fi', 'You need an internet connection to download the eSIM.'),
    ('Open Settings › Network & internet › SIMs', 'Tap “Add eSIM” or “+”. Menu names vary slightly by brand (Samsung: Connections › SIM manager › Add eSIM).'),
    ('Scan the QR code', 'Choose “Scan QR code” and scan the QR from your order. Bought on this phone? Choose “Need help?” › “Enter it manually” and paste the activation string.'),
    ('Confirm the download', 'Tap “Continue” / “Activate” when prompted.'),
    ('Turn on data roaming when you land', 'Set the travel eSIM as your mobile data SIM and enable “Roaming” for it.'),
  ],
};

class InstallScreen extends StatefulWidget {
  const InstallScreen({super.key});
  @override
  State<InstallScreen> createState() => _InstallScreenState();
}

class _InstallScreenState extends State<InstallScreen> {
  // Web users see the same guide (they install on their phone, not the browser); default to iOS there.
  _Os _os = !kIsWeb && defaultTargetPlatform == TargetPlatform.android ? _Os.android : _Os.ios;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final steps = _steps[_os]!;
    return PageBody(
      crumbs: const [Crumb('Home', '/'), Crumb('How it works', '/how-it-works'), Crumb('Install guide')],
      title: 'How to install your eSIM',
      max: 720,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(
          child: SegmentedButton<_Os>(
            segments: const [
              ButtonSegment(value: _Os.ios, icon: Icon(Icons.phone_iphone), label: Text('iPhone')),
              ButtonSegment(value: _Os.android, icon: Icon(Icons.phone_android), label: Text('Android')),
            ],
            selected: {_os},
            onSelectionChanged: (s) => setState(() => _os = s.first),
          ),
        ),
        const SizedBox(height: 8),
        if (kIsWeb)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('Installing happens on your phone, not in this browser. Pick your phone type above.',
                textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
          ),
        const SizedBox(height: 8),
        for (var i = 0; i < steps.length; i++)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              CircleAvatar(radius: 14, child: Text('${i + 1}', style: const TextStyle(fontSize: 13))),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(steps[i].$1, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(steps[i].$2),
                ]),
              ),
            ]),
          ),
        const SizedBox(height: 16),
        Text('Tip: install while you have Wi-Fi, and switch the eSIM on when you arrive at your destination.',
            style: theme.textTheme.bodySmall),
      ]),
    );
  }
}

import 'package:flutter/material.dart';

/// Phone < 600, tablet 600-1000, desktop >= 1000 logical px.
class Bp {
  static const tablet = 600.0;
  static const desktop = 1000.0;
  static bool isWide(BuildContext c) => MediaQuery.sizeOf(c).width >= tablet;
  static bool isDesktop(BuildContext c) => MediaQuery.sizeOf(c).width >= desktop;
}

/// Centers page content and caps its width so wide browser windows don't stretch lists edge to edge.
class ContentWidth extends StatelessWidget {
  const ContentWidth({super.key, required this.child, this.max = 1080, this.padding});
  final Widget child;
  final double max;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: max),
          child: Padding(
            padding: padding ?? EdgeInsets.symmetric(horizontal: Bp.isWide(context) ? 32 : 16),
            child: child,
          ),
        ),
      );
}

class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.cloud_off, size: 40, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 12),
            Text('$error', textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.tonal(onPressed: onRetry, child: const Text('Try again')),
          ]),
        ),
      );
}

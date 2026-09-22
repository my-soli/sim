import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/responsive.dart';
import '../../core/site.dart';
import '../../core/session.dart';

class OrderScreen extends StatefulWidget {
  const OrderScreen({super.key, required this.orderId});
  final String orderId;
  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  OrderInfo? _order;
  Object? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final o = await api.order(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = o;
        _error = null;
      });
      if (const {'READY', 'FAILED', 'REFUNDED'}.contains(o.status)) _timer?.cancel();
    } catch (e) {
      if (mounted && _order == null) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _order;
    return SubPage(
      crumbs: const [Crumb('Home', '/'), Crumb('My eSIMs', '/esims'), Crumb('Order')],
      child: _error != null && o == null
          ? ErrorRetry(error: _error!, onRetry: _load)
          : o == null
              ? const Center(child: CircularProgressIndicator())
              : switch (o.status) {
                  'READY' => _Ready(order: o),
                  'FAILED' => _Message(
                      icon: Icons.error_outline,
                      title: 'We couldn\'t deliver your eSIM',
                      body: 'Your order hit a problem on our side. You haven\'t lost anything: contact support and we\'ll refund you.',
                    ),
                  'REFUNDED' => _Message(icon: Icons.undo, title: 'Order refunded', body: 'This order was refunded.'),
                  'PENDING_PAYMENT' => _Message(
                      icon: Icons.payments_outlined,
                      title: 'Payment needed',
                      body: 'This order hasn\'t been paid yet.',
                      action: FilledButton(onPressed: () => context.go('/checkout/${o.id}'), child: const Text('Go to checkout')),
                    ),
                  _ => const _Message(
                      busy: true,
                      title: 'Preparing your eSIM…',
                      body: 'Payment received. This usually takes a few seconds.',
                    ),
                },
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({this.icon, this.busy = false, required this.title, required this.body, this.action});
  final IconData? icon;
  final bool busy;
  final String title, body;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            busy ? const CircularProgressIndicator() : Icon(icon, size: 48, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 20),
            Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(body, textAlign: TextAlign.center),
            if (action != null) ...[const SizedBox(height: 20), action!],
          ]),
        ),
      );
}

class _Ready extends StatelessWidget {
  const _Ready({required this.order});
  final OrderInfo order;

  @override
  Widget build(BuildContext context) {
    final e = order.esim!;
    final theme = Theme.of(context);
    final wide = Bp.isWide(context);

    final qr = Column(children: [
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: theme.colorScheme.outlineVariant)),
        child: e.lpaString == null
            ? const SizedBox(width: 220, height: 220, child: Center(child: Text('QR unavailable. Use manual details.')))
            : QrImageView(data: e.lpaString!, size: 220, backgroundColor: Colors.white),
      ),
      const SizedBox(height: 12),
      // eSIMs are installed on a phone: if you bought on a computer, scan; if on the phone itself, use the manual details.
      SizedBox(
        width: 260,
        child: Text(
          kIsWeb || wide
              ? 'Scan with the phone you want to install the eSIM on.'
              : 'Can\'t scan your own screen? Use the manual details below, or open this page on another device.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall,
        ),
      ),
    ]);

    final details = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('${order.plan.countryName} · ${dataLabel(order.plan.dataBytes)} · ${daysLabel(order.plan.validityDays)}',
          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
      const SizedBox(height: 4),
      Text('Ready to install. Keep these details handy; you can find them again in My eSIMs.', style: theme.textTheme.bodyMedium),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.info_outline, size: 16, color: theme.colorScheme.onSecondaryContainer),
          const SizedBox(width: 8),
          Flexible(child: Text(activeTypeLabel(e.activeType), style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSecondaryContainer))),
        ]),
      ),
      const SizedBox(height: 20),
      Text('Manual activation', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      _Field(label: 'SM-DP+ address', value: e.smdpAddress ?? ''),
      _Field(label: 'Activation code', value: e.activationCode ?? ''),
      if (e.lpaString != null) _Field(label: 'Full activation string (LPA)', value: e.lpaString!),
      const SizedBox(height: 16),
      FilledButton.icon(
        onPressed: () => context.push('/install'),
        icon: const Icon(Icons.download_for_offline_outlined),
        label: const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('How to install')),
      ),
      const SizedBox(height: 8),
      OutlinedButton(onPressed: () => context.go('/esims'), child: const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('View in My eSIMs'))),
    ]);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: wide
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              qr,
              const SizedBox(width: 40),
              Expanded(child: details),
            ])
          : Column(children: [qr, const SizedBox(height: 24), details]),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.value});
  final String label, value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(14, 8, 4, 8),
      decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: theme.textTheme.bodySmall),
            SelectableText(value, style: const TextStyle(fontWeight: FontWeight.w600, fontFamily: 'monospace')),
          ]),
        ),
        IconButton(
          tooltip: 'Copy',
          icon: const Icon(Icons.copy, size: 18),
          onPressed: () {
            Clipboard.setData(ClipboardData(text: value));
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label copied'), duration: const Duration(seconds: 1)));
          },
        ),
      ]),
    );
  }
}

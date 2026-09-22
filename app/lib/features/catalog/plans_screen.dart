import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/brand.dart';
import '../../core/format.dart';
import '../../core/responsive.dart';
import '../../core/site.dart';
import '../../core/session.dart';

class PlansScreen extends StatefulWidget {
  const PlansScreen({super.key, required this.code});
  final String code;
  @override
  State<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends State<PlansScreen> {
  late Future<List<Plan>> _future = api.plans(widget.code);
  String? _buying;
  int? _days; // validity filter; null = all
  bool _smsOnly = false;

  Future<void> _buy(Plan p) async {
    if (!session.signedIn) {
      context.push('/login?next=${Uri.encodeComponent('/country/${widget.code}')}');
      return;
    }
    setState(() => _buying = p.id);
    try {
      final order = await api.createOrder(p.id);
      if (mounted) context.push('/checkout/${order.id}');
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _buying = null);
    }
  }

  @override
  void didUpdateWidget(PlansScreen old) {
    super.didUpdateWidget(old);
    if (old.code != widget.code) {
      _future = api.plans(widget.code);
      _days = null;
      _smsOnly = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Plan>>(
      future: _future,
      builder: (context, snap) {
        final plans = snap.data;
        final title = plans == null || plans.isEmpty ? 'Plans' : plans.first.countryName;
        return PageBody(
          crumbs: [const Crumb('Home', '/'), const Crumb('Destinations', '/destinations'), Crumb(title)],
          max: 900,
          child: snap.hasError
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: ErrorRetry(error: snap.error!, onRetry: () => setState(() => _future = api.plans(widget.code))),
                )
              : plans == null
                  ? const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Center(child: CircularProgressIndicator()))
                  : _content(context, title, plans),
        );
      },
    );
  }

  Widget _content(BuildContext context, String title, List<Plan> plans) {
    final theme = Theme.of(context);
    final durations = ({for (final p in plans) p.validityDays}.toList()..sort());
    final hasSms = plans.any((p) => p.receivesSms);
    final shown = plans.where((p) => (_days == null || p.validityDays == _days) && (!_smsOnly || p.receivesSms)).toList();
    final from = plans.map((p) => p.priceCents).reduce((a, b) => a < b ? a : b);

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // Destination summary card
      Container(
        padding: EdgeInsets.all(Bp.isWide(context) ? 32 : 20),
        decoration: BoxDecoration(
          gradient: Brand.gradient,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(flagFor(widget.code, regional: widget.code.contains('-')), style: const TextStyle(fontSize: 52)),
            const SizedBox(width: 16),
            Expanded(
              child: Text('$title eSIMs',
                  style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900, color: Colors.white)),
            ),
          ]),
          const SizedBox(height: 16),
          Wrap(spacing: 10, runSpacing: 10, children: [
            _Chip(Icons.sell_outlined, 'From ${money(from)}'),
            _Chip(Icons.layers_outlined, '${plans.length} plans'),
            const _Chip(Icons.qr_code_2, 'QR code install'),
          ]),
          const SizedBox(height: 20),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF064E3B)),
            onPressed: () => _showCompat(context),
            icon: const Icon(Icons.smartphone),
            label: const Text('Check compatibility'),
          ),
        ]),
      ),
      const SizedBox(height: 20),
      // Package picker card
      Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: EdgeInsets.all(Bp.isWide(context) ? 28 : 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Choose your package', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SegmentedButton<int?>(
                showSelectedIcon: false,
                segments: [
                  const ButtonSegment(value: null, label: Text('All')),
                  for (final d in durations) ButtonSegment(value: d, label: Text(daysLabel(d))),
                ],
                selected: {_days},
                onSelectionChanged: (s) => setState(() => _days = s.first),
              ),
            ),
            if (hasSms) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: FilterChip(
                  avatar: const Icon(Icons.sms_outlined, size: 18),
                  label: const Text('Can receive SMS'),
                  selected: _smsOnly,
                  onSelected: (v) => setState(() => _smsOnly = v),
                ),
              ),
            ],
            const SizedBox(height: 14),
            if (shown.isEmpty)
              const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('No plans match these filters.')),
            for (final p in shown) _PlanRow(plan: p, busy: _buying == p.id, onBuy: () => _buy(p)),
          ]),
        ),
      ),
      const SectionHeading('Good to know'),
      const FaqList(items: [
        Faq('Can I use this eSIM on my phone?', 'Your phone needs to support eSIM and be carrier-unlocked. Tap “Check compatibility” above for how to check.'),
        Faq('How do I install it?', 'After payment you get a QR code and manual details. Scan the QR (or enter the details) from your phone\'s eSIM settings. See the install guide for step-by-step help.'),
        Faq('Can I top up later?', 'Yes. Buy another plan for this destination any time from My eSIMs › Top up.'),
      ]),
    ]);
  }

  void _showCompat(BuildContext context) => showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Is my phone compatible?'),
          content: const Text(
            'You need an eSIM-capable phone that is carrier-unlocked. For example: iPhone XS/XR and newer, Google Pixel 3 and newer, and recent Samsung Galaxy S and Z models.\n\n'
            'Tip: on iPhone, go to Settings › General › About and look for an “EID”. On Android, check Settings › About phone, or your manufacturer\'s website.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                context.go('/install');
              },
              child: const Text('Install guide'),
            ),
          ],
        ),
      );
}

class _Chip extends StatelessWidget {
  const _Chip(this.icon, this.label);
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 16, color: Colors.white),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        ]),
      );
}

class _PlanRow extends StatelessWidget {
  const _PlanRow({required this.plan, required this.busy, required this.onBuy});
  final Plan plan;
  final bool busy;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final compact = !Bp.isWide(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: EdgeInsets.symmetric(horizontal: compact ? 14 : 20, vertical: 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(dataLabel(plan.dataBytes), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 2),
            Row(children: [
              Icon(Icons.schedule, size: 15, color: theme.colorScheme.outline),
              const SizedBox(width: 4),
              Text(daysLabel(plan.validityDays), style: theme.textTheme.bodyMedium),
              if (plan.receivesSms) ...[
                const SizedBox(width: 12),
                Icon(Icons.sms_outlined, size: 15, color: theme.colorScheme.primary),
                const SizedBox(width: 4),
                Text('SMS', style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w700)),
              ],
            ]),
          ]),
        ),
        Text(money(plan.priceCents), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
        SizedBox(width: compact ? 12 : 20),
        FilledButton(
          onPressed: busy ? null : onBuy,
          child: busy
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Buy now'),
        ),
      ]),
    );
  }
}

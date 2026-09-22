import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/responsive.dart';
import '../../core/site.dart';
import '../../core/session.dart';

enum _Method { card, mpesa }

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.orderId});
  final String orderId;
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  late Future<OrderInfo> _future = api.order(widget.orderId);
  final _phone = TextEditingController();
  _Method _method = _Method.card;
  bool _busy = false, _waiting = false;
  String? _error, _waitingMsg;
  Timer? _poll;
  DateTime? _pollUntil;

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// The server is the only source of truth for payment (Stripe / Daraja webhooks); we just watch the order.
  void _startPolling(String message) {
    _poll?.cancel();
    _pollUntil = DateTime.now().add(const Duration(minutes: 3));
    setState(() {
      _waiting = true;
      _waitingMsg = message;
    });
    _poll = Timer.periodic(const Duration(seconds: 2), (t) async {
      try {
        final o = await api.order(widget.orderId);
        if (o.status != 'PENDING_PAYMENT') {
          t.cancel();
          if (mounted) context.go('/orders/${widget.orderId}');
        } else if (DateTime.now().isAfter(_pollUntil!)) {
          t.cancel();
          if (mounted) {
            setState(() {
              _waiting = false;
              _error = 'We didn\'t get a payment confirmation. If you were charged, it will show up here shortly, otherwise try again.';
            });
          }
        }
      } catch (_) {/* transient; keep polling */}
    });
  }

  Future<void> _pay(OrderInfo order) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_method == _Method.card) {
        final url = await api.stripeCheckout(order.id);
        if (url == null) {
          _startPolling('Processing your card payment…'); // mock mode: completes server-side
        } else {
          // Web: same tab so Stripe returns to /#/orders/<id>. Mobile: opens the browser; the app resumes on return.
          await launchUrl(Uri.parse(url), webOnlyWindowName: '_self');
          _startPolling('Waiting for payment confirmation…');
        }
      } else {
        final kes = await api.mpesaStk(order.id, _phone.text.trim());
        _startPolling('Check your phone: enter your M-Pesa PIN to approve KES $kes.');
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<OrderInfo>(
      future: _future,
      builder: (context, snap) {
        final p = snap.data?.plan;
        return SubPage(
          crumbs: [
            const Crumb('Home', '/'),
            const Crumb('Destinations', '/destinations'),
            if (p != null) Crumb(p.countryName, '/country/${p.country}'),
            const Crumb('Checkout'),
          ],
          child: snap.hasError
              ? ErrorRetry(error: snap.error!, onRetry: () => setState(() => _future = api.order(widget.orderId)))
              : !snap.hasData
                  ? const Center(child: CircularProgressIndicator())
                  : _body(context, snap.data!),
        );
      },
    );
  }

  Widget _body(BuildContext context, OrderInfo order) {
    if (order.status != 'PENDING_PAYMENT' && !_waiting) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/orders/${order.id}');
      });
      return const Center(child: CircularProgressIndicator());
    }
    final summary = _Summary(order: order);
    final payment = _waiting ? _Waiting(message: _waitingMsg ?? '') : _paymentForm(context, order);
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Bp.isWide(context)
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(flex: 5, child: summary),
              const SizedBox(width: 24),
              Expanded(flex: 6, child: payment),
            ])
          : Column(children: [summary, const SizedBox(height: 16), payment]),
    );
  }

  Widget _paymentForm(BuildContext context, OrderInfo order) {
    final theme = Theme.of(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Pay with', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
      const SizedBox(height: 12),
      SegmentedButton<_Method>(
        segments: const [
          ButtonSegment(value: _Method.card, icon: Icon(Icons.credit_card), label: Text('Card')),
          ButtonSegment(value: _Method.mpesa, icon: Icon(Icons.phone_android), label: Text('M-Pesa')),
        ],
        selected: {_method},
        onSelectionChanged: (s) => setState(() {
          _method = s.first;
          _error = null;
        }),
      ),
      const SizedBox(height: 16),
      if (_method == _Method.mpesa) ...[
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'M-Pesa phone number',
            hintText: '0712 345 678',
            border: OutlineInputBorder(),
            helperText: 'You\'ll get a PIN prompt on this phone, even if you\'re browsing on a computer.',
            helperMaxLines: 2,
          ),
        ),
      ] else
        Text('You\'ll be taken to Stripe\'s secure page to pay by card.', style: theme.textTheme.bodyMedium),
      if (_error != null) ...[
        const SizedBox(height: 12),
        Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
      ],
      const SizedBox(height: 20),
      FilledButton(
        onPressed: _busy ? null : () => _pay(order),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: _busy
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : Text(_method == _Method.card ? 'Pay ${money(order.priceCents)}' : 'Send M-Pesa prompt'),
        ),
      ),
    ]);
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.order});
  final OrderInfo order;
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final p = order.plan;
    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(flagFor(p.country, regional: p.country.contains('-')), style: const TextStyle(fontSize: 32)),
            const SizedBox(width: 12),
            Expanded(child: Text(p.countryName, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800))),
          ]),
          const SizedBox(height: 16),
          _row('Data', dataLabel(p.dataBytes)),
          _row('Validity', daysLabel(p.validityDays)),
          const Divider(height: 28),
          _row('Total', money(order.priceCents), bold: true),
        ]),
      ),
    );
  }

  Widget _row(String k, String v, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Text(k),
          const Spacer(),
          Text(v, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500, fontSize: bold ? 18 : null)),
        ]),
      );
}

class _Waiting extends StatelessWidget {
  const _Waiting({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 20),
          Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          const Text('Please keep this page open.', textAlign: TextAlign.center),
        ]),
      );
}

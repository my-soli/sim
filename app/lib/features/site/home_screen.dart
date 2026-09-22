import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/brand.dart';
import '../../core/format.dart';
import '../../core/responsive.dart';
import '../../core/site.dart';
import '../catalog/destination_widgets.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      child: Column(children: [
        const _Hero(),
        ContentWidth(
          max: 1200,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const _TrustStrip(),
            SectionHeading(
              'Popular destinations',
              subtitle: 'Most-loved by travellers, ready in minutes.',
              action: TextButton(onPressed: () => context.go('/destinations'), child: const Text('See all →')),
            ),
            CountriesLoader(builder: (_, all) => PopularGrid(countries: all.where((c) => c.popular).toList())),
            const SectionHeading('How it works', subtitle: 'From checkout to connected in three steps.'),
            const _Steps(),
            const SectionHeading('Why travellers choose ${Brand.name}'),
            const Wrap(spacing: 16, runSpacing: 16, children: [
              InfoCard(icon: Icons.sim_card_outlined, title: 'Keep your number', body: 'Your regular SIM stays active. Add a data eSIM alongside it.', width: 280),
              InfoCard(icon: Icons.sell_outlined, title: 'Clear pricing', body: 'The price you see is the price you pay. No roaming surprises.', width: 280),
              InfoCard(icon: Icons.phone_android, title: 'Pay your way', body: 'Card via Stripe or M-Pesa, right from your phone.', width: 280),
              InfoCard(icon: Icons.data_usage, title: 'Track your data', body: 'See what\'s left and when each plan expires in My eSIMs.', width: 280),
            ]),
            SectionHeading(
              'Questions? We\'ve got answers',
              action: TextButton(onPressed: () => context.go('/help'), child: const Text('All FAQs →')),
            ),
            FaqList(items: allFaqs.take(4).toList()),
            const SizedBox(height: 48),
            _CtaBanner(theme: theme),
          ]),
        ),
        const SiteFooter(),
      ]),
    );
  }
}

class _Hero extends StatefulWidget {
  const _Hero();
  @override
  State<_Hero> createState() => _HeroState();
}

class _HeroState extends State<_Hero> {
  final _search = TextEditingController();

  void _go(String q) {
    final t = q.trim();
    context.go(t.isEmpty ? '/destinations' : '/destinations?q=${Uri.encodeQueryComponent(t)}');
  }

  @override
  Widget build(BuildContext context) {
    final wide = Bp.isDesktop(context);
    final phone = !Bp.isWide(context);
    final text = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(
        'Travel data,\nsorted before\nyou land.',
        style: TextStyle(color: Colors.white, fontSize: wide ? 56 : (phone ? 34 : 44), height: 1.05, fontWeight: FontWeight.w900, letterSpacing: -1),
      ),
      const SizedBox(height: 16),
      Text(
        'eSIM data plans for travellers. No roaming fees, no SIM swapping. Scan a QR code and you\'re online.',
        style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: phone ? 15 : 18, height: 1.4),
      ),
      const SizedBox(height: 28),
      ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: SearchBar(
          controller: _search,
          hintText: 'Where are you travelling to?',
          leading: const Icon(Icons.search),
          trailing: [
            FilledButton(onPressed: () => _go(_search.text), child: const Text('Search')),
          ],
          padding: const WidgetStatePropertyAll(EdgeInsets.only(left: 16, right: 8)),
          constraints: const BoxConstraints(minHeight: 60),
          onSubmitted: _go,
        ),
      ),
    ]);

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(gradient: Brand.gradient),
      child: ContentWidth(
        max: 1200,
        padding: EdgeInsets.symmetric(horizontal: phone ? 20 : 32),
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: phone ? 36 : 72),
          child: wide
              ? Row(children: [
                  Expanded(flex: 6, child: text),
                  const SizedBox(width: 48),
                  const Expanded(flex: 4, child: _HeroCards()),
                ])
              : text,
        ),
      ),
    );
  }
}

/// Decorative phone-style stack showing real "from" prices for popular destinations.
class _HeroCards extends StatelessWidget {
  const _HeroCards();

  @override
  Widget build(BuildContext context) {
    return CountriesLoader(
      builder: (context, all) {
        final picks = all.where((c) => c.popular).take(3).toList();
        return Column(children: [
          for (final c in picks)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
              ),
              child: Row(children: [
                Text(flagFor(c.code), style: const TextStyle(fontSize: 34)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(c.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                    Text('${c.planCount} plans', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                  ]),
                ),
                Text('from ${money(c.fromPriceCents)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
              ]),
            ),
        ]);
      },
    );
  }
}

class _TrustStrip extends StatelessWidget {
  const _TrustStrip();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const items = [
      (Icons.bolt, 'Delivered in minutes'),
      (Icons.lock_outline, 'Secure card & M-Pesa payments'),
      (Icons.wifi_off, 'No roaming fees'),
      (Icons.support_agent, 'Install guides for iPhone & Android'),
    ];
    return Padding(
      padding: const EdgeInsets.only(top: 28),
      child: Wrap(spacing: 28, runSpacing: 12, children: [
        for (final i in items)
          Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(i.$1, size: 20, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
            Text(i.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
          ]),
      ]),
    );
  }
}

class _Steps extends StatelessWidget {
  const _Steps();

  @override
  Widget build(BuildContext context) => const Wrap(spacing: 16, runSpacing: 16, children: [
        InfoCard(icon: Icons.travel_explore, title: '1. Pick a destination', body: 'Choose a country or region and the data plan that fits your trip.', width: 380),
        InfoCard(icon: Icons.lock_outline, title: '2. Pay securely', body: 'Pay by card, or with M-Pesa: approve the prompt on your phone.', width: 380),
        InfoCard(icon: Icons.qr_code_2, title: '3. Scan & connect', body: 'Scan the QR code on your phone and switch on data when you land.', width: 380),
      ]);
}

class _CtaBanner extends StatelessWidget {
  const _CtaBanner({required this.theme});
  final ThemeData theme;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(gradient: Brand.gradient, borderRadius: BorderRadius.circular(24)),
        child: Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 24, runSpacing: 16, children: [
          const Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text('Ready for your next trip?', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
            SizedBox(height: 6),
            Text('Find a plan for your destination in seconds.', style: TextStyle(color: Colors.white70)),
          ]),
          FilledButton(
            // Fixed white pill on the fixed brand gradient: fixed dark ink, not theme.colorScheme.surface
            // (which goes near-white and vanishes in light mode).
            style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Brand.lightOnBg, padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18)),
            onPressed: () => context.go('/destinations'),
            child: const Text('Browse destinations'),
          ),
        ]),
      );
}

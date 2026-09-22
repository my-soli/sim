import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/brand.dart';
import '../../core/site.dart';

class HowItWorksScreen extends StatelessWidget {
  const HowItWorksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PageBody(
      crumbs: const [Crumb('Home', '/'), Crumb('How it works')],
      title: 'How ${Brand.name} works',
      subtitle: 'Get travel data without a physical SIM, roaming bills or shop visits.',
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Wrap(spacing: 16, runSpacing: 16, children: [
          InfoCard(icon: Icons.travel_explore, title: '1. Choose your plan', body: 'Search your destination, compare data amounts and validity, and pick a plan.', width: 340),
          InfoCard(icon: Icons.lock_outline, title: '2. Pay securely', body: 'Pay by card, or with M-Pesa: enter your number and approve the prompt on your phone.', width: 340),
          InfoCard(icon: Icons.qr_code_2, title: '3. Get your QR code', body: 'Your QR code and manual activation details appear right after payment and stay in My eSIMs.', width: 340),
          InfoCard(icon: Icons.download_for_offline_outlined, title: '4. Install on your phone', body: 'Scan the QR (or enter the details manually) from your phone\'s eSIM settings.', width: 340),
          InfoCard(icon: Icons.public, title: '5. Connect on arrival', body: 'Switch the eSIM on and enable data roaming for it when you land.', width: 340),
          InfoCard(icon: Icons.add_circle_outline, title: '6. Top up if you need', body: 'Running low? Buy more data for the same destination from My eSIMs.', width: 340),
        ]),
        const SectionHeading('Before you buy'),
        Text('Make sure your phone supports eSIM and is carrier-unlocked. You can usually check under Settings › About (look for an “EID” or “Digital SIM”), or on your manufacturer\'s website.', style: theme.textTheme.bodyLarge),
        const SizedBox(height: 20),
        Wrap(spacing: 12, runSpacing: 12, children: [
          FilledButton(onPressed: () => context.go('/destinations'), child: const Text('Browse destinations')),
          OutlinedButton(onPressed: () => context.go('/install'), child: const Text('Read the install guide')),
        ]),
      ]),
    );
  }
}

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});
  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final q = _q.trim().toLowerCase();
    final filtered = q.isEmpty
        ? allFaqs
        : allFaqs.where((f) => f.q.toLowerCase().contains(q) || f.a.toLowerCase().contains(q)).toList();
    final groups = <String>[];
    for (final f in filtered) {
      if (!groups.contains(f.group)) groups.add(f.group);
    }
    return PageBody(
      crumbs: const [Crumb('Home', '/'), Crumb('Help')],
      title: 'Help centre',
      subtitle: 'Answers to common questions about eSIMs, payments and installing.',
      max: 820,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SearchBar(
          hintText: 'Search help',
          leading: const Icon(Icons.search),
          elevation: const WidgetStatePropertyAll(0),
          onChanged: (v) => setState(() => _q = v),
        ),
        const SizedBox(height: 12),
        if (filtered.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Text('No answers found. Try different words, or contact us below.', style: theme.textTheme.bodyLarge),
          ),
        for (final g in groups) ...[
          Padding(
            padding: const EdgeInsets.only(top: 24, bottom: 12),
            child: Text(g, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          ),
          FaqList(items: filtered.where((f) => f.group == g).toList()),
        ],
        const SectionHeading('Still stuck?'),
        Row(children: [
          Expanded(child: Text('Our support team can help with orders, installs and payments.', style: theme.textTheme.bodyLarge)),
          const SizedBox(width: 16),
          FilledButton(onPressed: () => context.go('/contact'), child: const Text('Contact us')),
        ]),
      ]),
    );
  }
}

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PageBody(
      crumbs: const [Crumb('Home', '/'), Crumb('About')],
      title: 'About ${Brand.name}',
      max: 820,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
          'We make staying connected while travelling simple. ${Brand.name} sells eSIM data plans so you can skip the airport SIM queue and the roaming bill, and get online the moment you land.',
          style: theme.textTheme.bodyLarge?.copyWith(height: 1.6),
        ),
        const SizedBox(height: 16),
        Text(
          'We built our checkout around how people actually pay. That includes M-Pesa, so customers in East Africa can pay straight from their phones, alongside card payments.',
          style: theme.textTheme.bodyLarge?.copyWith(height: 1.6),
        ),
        const SectionHeading('What we care about'),
        const Wrap(spacing: 16, runSpacing: 16, children: [
          InfoCard(icon: Icons.visibility_outlined, title: 'Clarity', body: 'Plain plan details and prices, with no fine-print surprises.', width: 260),
          InfoCard(icon: Icons.bolt, title: 'Speed', body: 'From checkout to QR code in minutes, not days.', width: 260),
          InfoCard(icon: Icons.handshake_outlined, title: 'Support', body: 'Real help when an install doesn\'t go to plan.', width: 260),
        ]),
      ]),
    );
  }
}

class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PageBody(
      crumbs: const [Crumb('Home', '/'), Crumb('Contact')],
      title: 'Contact us',
      subtitle: 'We\'re happy to help with orders, installs and payments.',
      max: 820,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Card(
          elevation: 0,
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.email_outlined, color: theme.colorScheme.primary),
                const SizedBox(width: 12),
                SelectableText(Brand.supportEmail, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 12),
              const Text('When you write, include your order reference and the email or phone number you signed in with so we can find your order quickly.'),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => emailSupport('Support request'),
                icon: const Icon(Icons.send_outlined),
                label: const Text('Email support'),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 16),
        Text('Many questions are answered in our Help centre.', style: theme.textTheme.bodyLarge),
        TextButton(onPressed: () => context.go('/help'), child: const Text('Visit Help →')),
      ]),
    );
  }
}

enum LegalKind { terms, privacy }

/// DRAFT placeholder text. Must be replaced with lawyer-reviewed Terms and Privacy Policy before launch.
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.kind});
  final LegalKind kind;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final terms = kind == LegalKind.terms;
    final sections = terms
        ? const [
            ('Using the service', 'You must be old enough to enter a contract and use an eSIM-compatible, carrier-unlocked device.'),
            ('Plans and delivery', 'Each plan lists its data allowance and validity period. eSIM details are delivered digitally after payment is confirmed.'),
            ('Payments and refunds', 'Payments are processed by our payment partners. If we cannot deliver your eSIM you will be refunded. Other refund requests are handled case by case.'),
            ('Acceptable use', 'Do not use the service unlawfully or in a way that harms networks or other users.'),
          ]
        : const [
            ('What we collect', 'Your email or phone number for sign-in, your orders, and technical data needed to run the service.'),
            ('How we use it', 'To deliver your eSIM, process payments, send order and usage notifications, and provide support.'),
            ('Sharing', 'We share the minimum necessary data with our eSIM supplier and payment processors to fulfil your order.'),
            ('Your choices', 'You can contact us to access or delete your data, subject to legal obligations.'),
          ];
    return PageBody(
      crumbs: [const Crumb('Home', '/'), Crumb(terms ? 'Terms of service' : 'Privacy policy')],
      title: terms ? 'Terms of service' : 'Privacy policy',
      max: 820,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: theme.colorScheme.errorContainer, borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            Icon(Icons.warning_amber_rounded, color: theme.colorScheme.onErrorContainer),
            const SizedBox(width: 12),
            Expanded(
              child: Text('DRAFT placeholder, not legal advice. Have a lawyer review and replace this before launch.',
                  style: TextStyle(color: theme.colorScheme.onErrorContainer, fontWeight: FontWeight.w600)),
            ),
          ]),
        ),
        for (final s in sections) ...[
          Padding(
            padding: const EdgeInsets.only(top: 24, bottom: 6),
            child: Text(s.$1, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          ),
          Text(s.$2, style: theme.textTheme.bodyLarge?.copyWith(height: 1.6)),
        ],
      ]),
    );
  }
}

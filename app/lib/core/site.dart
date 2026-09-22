import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'brand.dart';
import 'responsive.dart';
import 'session.dart';

class _NavItem {
  const _NavItem(this.label, this.path);
  final String label, path;
}

const _navItems = [
  _NavItem('Destinations', '/destinations'),
  _NavItem('How it works', '/how-it-works'),
  _NavItem('Help', '/help'),
];

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.onDark = false});
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => context.go('/'),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(gradient: Brand.gradient, borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.sim_card, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 10),
        Text(Brand.name,
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.5)),
      ]),
    );
  }
}

/// Site chrome shared by every marketing/app page: top navbar (wide) or app bar + bottom nav (phone).
class SiteShell extends StatelessWidget {
  const SiteShell({super.key, required this.location, required this.child});
  final String location;
  final Widget child;

  int get _bottomIndex {
    if (location.startsWith('/esims')) return 2;
    if (location.startsWith('/destinations') || location.startsWith('/country')) return 1;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final wide = Bp.isWide(context);
    if (wide) {
      return Scaffold(
        appBar: PreferredSize(preferredSize: const Size.fromHeight(68), child: _NavBar(location: location)),
        body: child,
      );
    }
    return Scaffold(
      appBar: AppBar(title: const BrandMark(), titleSpacing: 16, actions: [_AuthButton(compact: true)]),
      drawer: Drawer(
        child: SafeArea(
          child: ListView(padding: const EdgeInsets.all(8), children: [
            const Padding(padding: EdgeInsets.all(16), child: Align(alignment: Alignment.centerLeft, child: BrandMark())),
            for (final item in _navItems)
              ListTile(
                title: Text(item.label),
                onTap: () {
                  Navigator.of(context).pop();
                  context.go(item.path);
                },
              ),
            ListTile(title: const Text('About'), onTap: () { Navigator.of(context).pop(); context.go('/about'); }),
            ListTile(title: const Text('Contact'), onTap: () { Navigator.of(context).pop(); context.go('/contact'); }),
          ]),
        ),
      ),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _bottomIndex,
        onDestinationSelected: (i) => context.go(const ['/', '/destinations', '/esims'][i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.public_outlined), selectedIcon: Icon(Icons.public), label: 'Destinations'),
          NavigationDestination(icon: Icon(Icons.sim_card_outlined), selectedIcon: Icon(Icons.sim_card), label: 'My eSIMs'),
        ],
      ),
    );
  }
}

class _AuthButton extends StatelessWidget {
  const _AuthButton({this.compact = false});
  final bool compact;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: session,
        builder: (context, _) => session.signedIn
            ? (compact
                ? IconButton(
                    tooltip: 'Sign out',
                    icon: const Icon(Icons.logout),
                    onPressed: () async {
                      await session.signOut();
                      if (context.mounted) context.go('/');
                    })
                : TextButton(
                    onPressed: () async {
                      await session.signOut();
                      if (context.mounted) context.go('/');
                    },
                    child: const Text('Sign out')))
            : FilledButton(onPressed: () => context.push('/login'), child: const Text('Sign in')),
      );
}

class _NavBar extends StatelessWidget {
  const _NavBar({required this.location});
  final String location;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      elevation: 0,
      child: Container(
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.colorScheme.outlineVariant))),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1200),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Row(children: [
                const BrandMark(),
                const SizedBox(width: 32),
                for (final item in _navItems)
                  Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: TextButton(
                      onPressed: () => context.go(item.path),
                      style: location.startsWith(item.path)
                          ? TextButton.styleFrom(backgroundColor: theme.colorScheme.primaryContainer.withValues(alpha: 0.5))
                          : null,
                      child: Text(item.label),
                    ),
                  ),
                const Spacer(),
                // Search stays reachable from every page, like a store header.
                SizedBox(
                  width: 240,
                  child: SearchBar(
                    hintText: 'Where to?',
                    leading: const Icon(Icons.search, size: 20),
                    elevation: const WidgetStatePropertyAll(0),
                    constraints: const BoxConstraints(minHeight: 42),
                    padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 12)),
                    onSubmitted: (q) => context.go(q.trim().isEmpty ? '/destinations' : '/destinations?q=${Uri.encodeQueryComponent(q.trim())}'),
                  ),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: () => context.go('/esims'),
                  icon: const Icon(Icons.sim_card_outlined, size: 18),
                  label: const Text('My eSIMs'),
                ),
                const SizedBox(width: 8),
                const _AuthButton(),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class SiteFooter extends StatelessWidget {
  const SiteFooter({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget col(String title, List<(String, String)> links) => SizedBox(
          width: 180,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            for (final l in links)
              InkWell(
                onTap: () => context.go(l.$2),
                child: Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Text(l.$1, style: theme.textTheme.bodyMedium)),
              ),
          ]),
        );
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 56),
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      child: ContentWidth(
        max: 1200,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 48, runSpacing: 32, children: [
              SizedBox(
                width: 280,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const BrandMark(),
                  const SizedBox(height: 12),
                  Text('eSIM data plans for travellers. Pay by card or M-Pesa and get connected in minutes.', style: theme.textTheme.bodyMedium),
                ]),
              ),
              col('Explore', const [('Destinations', '/destinations'), ('How it works', '/how-it-works'), ('Install guide', '/install')]),
              col('Support', const [('Help & FAQ', '/help'), ('Contact us', '/contact'), ('My eSIMs', '/esims')]),
              col('Company', const [('About', '/about'), ('Terms', '/terms'), ('Privacy', '/privacy')]),
            ]),
            const SizedBox(height: 32),
            Divider(color: theme.colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text('© ${DateTime.now().year} ${Brand.name}. Your phone must be eSIM-compatible and carrier-unlocked.',
                style: theme.textTheme.bodySmall),
          ]),
        ),
      ),
    );
  }
}

class Crumb {
  const Crumb(this.label, [this.path]);
  final String label;
  final String? path; // null = current page
}

class Breadcrumbs extends StatelessWidget {
  const Breadcrumbs(this.crumbs, {super.key});
  final List<Crumb> crumbs;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = <Widget>[];
    for (var i = 0; i < crumbs.length; i++) {
      final c = crumbs[i];
      final last = i == crumbs.length - 1;
      if (i > 0) items.add(Icon(Icons.chevron_right, size: 18, color: theme.colorScheme.outline));
      items.add(last || c.path == null
          ? Text(c.label, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700))
          : InkWell(
              borderRadius: BorderRadius.circular(4),
              onTap: () => context.go(c.path!),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
                child: Text(c.label, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.primary)),
              ),
            ));
    }
    return Semantics(
      label: 'Breadcrumb',
      child: Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 2, runSpacing: 4, children: items),
    );
  }
}

/// Focused pages (login, checkout, order) that live outside the site shell: brand header, breadcrumbs, no footer clutter.
class SubPage extends StatelessWidget {
  const SubPage({super.key, required this.crumbs, required this.child, this.max = 1080});
  final List<Crumb> crumbs;
  final Widget child;
  final double max;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          titleSpacing: 16,
          title: const BrandMark(),
        ),
        body: SafeArea(
          child: ContentWidth(
            max: max,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Padding(padding: const EdgeInsets.only(top: 16, bottom: 4), child: Breadcrumbs(crumbs)),
              Expanded(child: child),
            ]),
          ),
        ),
      );
}

/// Body for pages inside the site shell: centered content, page title, and the footer at the end of the scroll.
class PageBody extends StatelessWidget {
  const PageBody({super.key, this.crumbs, this.title, this.subtitle, required this.child, this.max = 1080});
  final List<Crumb>? crumbs;
  final String? title, subtitle;
  final Widget child;
  final double max;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      child: Column(children: [
        ContentWidth(
          max: max,
          child: Padding(
            padding: const EdgeInsets.only(top: 24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (crumbs != null) ...[Breadcrumbs(crumbs!), const SizedBox(height: 16)],
              if (title != null) ...[
                Text(title!, style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
                if (subtitle != null) ...[
                  const SizedBox(height: 8),
                  Text(subtitle!, style: theme.textTheme.bodyLarge),
                ],
                const SizedBox(height: 24),
              ],
              child,
            ]),
          ),
        ),
        const SiteFooter(),
      ]),
    );
  }
}

class SectionHeading extends StatelessWidget {
  const SectionHeading(this.title, {super.key, this.subtitle, this.action});
  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 56, bottom: 20),
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
            if (subtitle != null) ...[const SizedBox(height: 4), Text(subtitle!)],
          ]),
        ),
        ?action,
      ]),
    );
  }
}

class InfoCard extends StatelessWidget {
  const InfoCard({super.key, required this.icon, required this.title, required this.body, this.width = 320});
  final IconData icon;
  final String title, body;
  final double width;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: width, minWidth: 240),
      child: Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CircleAvatar(
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Icon(icon, color: theme.colorScheme.onPrimaryContainer),
            ),
            const SizedBox(height: 14),
            Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(body),
          ]),
        ),
      ),
    );
  }
}

class Faq {
  const Faq(this.q, this.a, {this.group = 'General'});
  final String q, a, group;
}

const allFaqs = [
  Faq('What is an eSIM?',
      'An eSIM is a SIM that is built into your phone. Instead of swapping a plastic card, you download a data plan by scanning a QR code, so you can switch on local data the moment you land.',
      group: 'Getting started'),
  Faq('Is my phone compatible?',
      'Most phones from around 2018 onward support eSIM (for example iPhone XS/XR and newer, Google Pixel 3 and newer, and recent Samsung Galaxy S and Z models). Your phone must also be carrier-unlocked. Check your phone\'s settings or your manufacturer\'s website to be sure.',
      group: 'Getting started'),
  Faq('How do I get my eSIM after paying?',
      'As soon as your payment is confirmed we prepare your eSIM. Your QR code and manual activation details appear on the order page and stay available under My eSIMs.',
      group: 'Getting started'),
  Faq('Can I install it on the phone I\'m buying on?',
      'Yes. You can\'t scan a QR code on the same screen, so use the manual details (SM-DP+ address and activation code) instead. If you\'re buying on a computer, scan the QR with your phone\'s camera.',
      group: 'Getting started'),
  Faq('How do I pay?',
      'Pay by card through Stripe, or with M-Pesa. For M-Pesa, enter your phone number and approve the PIN prompt that arrives on your phone. This works even if you\'re browsing on a computer.',
      group: 'Payments'),
  Faq('Can I make calls and send texts?',
      'Our plans are built around mobile data and don\'t include calls. Some plans can also receive SMS, and those are marked with an SMS badge on the plan list. Keep your regular SIM active for your usual number, and use apps like WhatsApp for calls and messages over data.',
      group: 'Using your eSIM'),
  Faq('How do I check how much data I have left?',
      'Open My eSIMs to see your data used and remaining, and when each plan expires. Usage figures update every few hours, so they aren\'t real-time.',
      group: 'Using your eSIM'),
  Faq('Can I top up?',
      'Yes. In My eSIMs, tap Top up on a plan to see the available plans for that destination and buy more data.',
      group: 'Using your eSIM'),
  Faq('What if my eSIM doesn\'t arrive?',
      'If we can\'t deliver your eSIM you\'ll be refunded. If something else goes wrong, contact support with your order details and we\'ll help.',
      group: 'Payments'),
];

class FaqList extends StatelessWidget {
  const FaqList({super.key, required this.items});
  final List<Faq> items;

  @override
  Widget build(BuildContext context) => Column(children: [
        for (final f in items)
          Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
            ),
            child: ExpansionTile(
              shape: const Border(),
              collapsedShape: const Border(),
              title: Text(f.q, style: const TextStyle(fontWeight: FontWeight.w700)),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              expandedCrossAxisAlignment: CrossAxisAlignment.start,
              children: [Text(f.a)],
            ),
          ),
      ]);
}

Future<void> emailSupport([String subject = 'Support request']) => launchUrl(
      Uri(scheme: 'mailto', path: Brand.supportEmail, queryParameters: {'subject': subject}),
    );

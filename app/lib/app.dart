import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'core/brand.dart';
import 'core/session.dart';
import 'core/site.dart';
import 'features/auth/login_screen.dart';
import 'features/catalog/plans_screen.dart';
import 'features/checkout/checkout_screen.dart';
import 'features/esims/my_esims_screen.dart';
import 'features/orders/install_screen.dart';
import 'features/orders/order_screen.dart';
import 'features/site/destinations_screen.dart';
import 'features/site/home_screen.dart';
import 'features/site/info_pages.dart';

final _router = GoRouter(
  refreshListenable: session,
  redirect: (context, state) {
    final path = state.uri.path;
    final needsAuth = path.startsWith('/checkout') || path.startsWith('/orders');
    if (needsAuth && !session.signedIn) {
      return '/login?next=${Uri.encodeComponent(state.uri.toString())}';
    }
    return null;
  },
  errorBuilder: (context, state) => SiteShell(
    location: '',
    child: PageBody(
      title: 'Page not found',
      subtitle: 'The page you\'re looking for doesn\'t exist.',
      child: FilledButton(onPressed: () => context.go('/'), child: const Text('Back to home')),
    ),
  ),
  routes: [
    ShellRoute(
      builder: (context, state, child) => SiteShell(location: state.uri.path, child: child),
      routes: [
        GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
        GoRoute(path: '/destinations', builder: (_, s) => DestinationsScreen(initialQuery: s.uri.queryParameters['q'] ?? '')),
        GoRoute(path: '/country/:code', builder: (_, s) => PlansScreen(code: s.pathParameters['code']!)),
        GoRoute(path: '/how-it-works', builder: (_, _) => const HowItWorksScreen()),
        GoRoute(path: '/install', builder: (_, _) => const InstallScreen()),
        GoRoute(path: '/help', builder: (_, _) => const HelpScreen()),
        GoRoute(path: '/about', builder: (_, _) => const AboutScreen()),
        GoRoute(path: '/contact', builder: (_, _) => const ContactScreen()),
        GoRoute(path: '/terms', builder: (_, _) => const LegalScreen(kind: LegalKind.terms)),
        GoRoute(path: '/privacy', builder: (_, _) => const LegalScreen(kind: LegalKind.privacy)),
        GoRoute(path: '/esims', builder: (_, _) => const MyEsimsScreen()),
      ],
    ),
    GoRoute(path: '/checkout/:id', builder: (_, s) => CheckoutScreen(orderId: s.pathParameters['id']!)),
    GoRoute(path: '/orders/:id', builder: (_, s) => OrderScreen(orderId: s.pathParameters['id']!)),
    GoRoute(path: '/login', builder: (_, s) => LoginScreen(next: s.uri.queryParameters['next'])),
  ],
);

class EsimApp extends StatelessWidget {
  const EsimApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp.router(
        title: '${Brand.name}: ${Brand.tagline}',
        debugShowCheckedModeBanner: false,
        routerConfig: _router,
        // Dark is the brand look; light theme kept defined in case we add a toggle later.
        themeMode: ThemeMode.dark,
        theme: ThemeData(colorSchemeSeed: Brand.seed, useMaterial3: true),
        darkTheme: ThemeData(colorSchemeSeed: Brand.seed, brightness: Brightness.dark, useMaterial3: true),
      );
}

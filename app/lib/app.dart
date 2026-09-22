import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'core/brand.dart';
import 'core/session.dart';
import 'core/site.dart';
import 'core/theme_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/catalog/plans_screen.dart';
import 'features/checkout/checkout_screen.dart';
import 'features/esims/my_esims_screen.dart';
import 'features/orders/install_screen.dart';
import 'features/orders/order_screen.dart';
import 'features/site/destinations_screen.dart';
import 'features/site/help_article_screen.dart';
import 'features/site/help_center_screen.dart';
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
        GoRoute(path: '/help', builder: (_, _) => const HelpCenterScreen()),
        GoRoute(path: '/help/:slug', builder: (_, s) => HelpArticleScreen(slug: s.pathParameters['slug']!)),
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

// Delius is a fairly small-looking face at Material's default sizes, so every named text style
// (body, titles, headlines, ...) is scaled up uniformly rather than just bumping specific spots.
// Done via TextScaler (in the MaterialApp builder below), not TextTheme.apply(fontSizeFactor:) -
// that throws on any style with no explicit fontSize (ThemeData.primaryTextTheme has exactly that).
const _fontSizeFactor = 1.15;

// M3-derive the roles the brand palette doesn't specify (error, outline, container tones, ...)
// from the primary color, then force the five explicit brand colors over the top.
final _darkTheme = ThemeData(
  useMaterial3: true,
  fontFamily: Brand.fontFamily,
  colorScheme: ColorScheme.fromSeed(seedColor: Brand.primary, brightness: Brightness.dark).copyWith(
    primary: Brand.primary,
    onPrimary: Brand.onBg,
    secondary: Brand.secondary,
    onSecondary: Brand.bg,
    tertiary: Brand.accent,
    onTertiary: Brand.bg,
    surface: Brand.bg,
    onSurface: Brand.onBg,
  ),
  scaffoldBackgroundColor: Brand.bg,
);

// Same palette, non-inverted: the light "Text"/"Background" hexes in their original roles.
final _lightTheme = ThemeData(
  useMaterial3: true,
  fontFamily: Brand.fontFamily,
  colorScheme: ColorScheme.fromSeed(seedColor: Brand.primary, brightness: Brightness.light).copyWith(
    primary: Brand.primary,
    onPrimary: Brand.lightBg,
    secondary: Brand.secondary,
    onSecondary: Brand.lightOnBg,
    tertiary: Brand.accent,
    onTertiary: Brand.lightOnBg,
    surface: Brand.lightBg,
    onSurface: Brand.lightOnBg,
  ),
  scaffoldBackgroundColor: Brand.lightBg,
);

class EsimApp extends StatelessWidget {
  const EsimApp({super.key});

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: themeController,
        builder: (context, _) => MaterialApp.router(
          title: '${Brand.name}: ${Brand.tagline}',
          debugShowCheckedModeBanner: false,
          routerConfig: _router,
          themeMode: themeController.mode,
          theme: _lightTheme,
          darkTheme: _darkTheme,
          // Flat scale, not composed with the OS/browser's own text-size setting - simple and
          // predictable for now, at the cost of not respecting a user's system accessibility scaling.
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(_fontSizeFactor)),
            child: child!,
          ),
        ),
      );
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/responsive.dart';
import '../../core/session.dart';

/// Loads the destination list once and hands it to [builder]; failure shows an inline retry instead of blanking the page.
class CountriesLoader extends StatefulWidget {
  const CountriesLoader({super.key, required this.builder});
  final Widget Function(BuildContext, List<Country>) builder;
  @override
  State<CountriesLoader> createState() => _CountriesLoaderState();
}

class _CountriesLoaderState extends State<CountriesLoader> {
  late Future<List<Country>> _future = api.countries();

  @override
  Widget build(BuildContext context) => FutureBuilder<List<Country>>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: ErrorRetry(error: snap.error!, onRetry: () => setState(() => _future = api.countries())),
            );
          }
          if (!snap.hasData) {
            return const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Center(child: CircularProgressIndicator()));
          }
          return widget.builder(context, snap.data!);
        },
      );
}

class PopularGrid extends StatelessWidget {
  const PopularGrid({super.key, required this.countries});
  final List<Country> countries;

  @override
  Widget build(BuildContext context) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 200, mainAxisExtent: 132, mainAxisSpacing: 12, crossAxisSpacing: 12),
        itemCount: countries.length,
        itemBuilder: (_, i) => _PopularCard(country: countries[i]),
      );
}

class CountryGrid extends StatelessWidget {
  const CountryGrid({super.key, required this.countries});
  final List<Country> countries;

  @override
  Widget build(BuildContext context) {
    if (countries.isEmpty) {
      return const Padding(padding: EdgeInsets.symmetric(vertical: 32), child: Text('No destinations match your search.'));
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 360, mainAxisExtent: 68, mainAxisSpacing: 4, crossAxisSpacing: 12),
      itemCount: countries.length,
      itemBuilder: (_, i) {
        final c = countries[i];
        return ListTile(
          leading: Text(flagFor(c.code, regional: c.isRegional), style: const TextStyle(fontSize: 28)),
          title: Text(c.name, maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: Text('${c.planCount} plans · from ${money(c.fromPriceCents)}'),
          trailing: const Icon(Icons.chevron_right),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          onTap: () => context.go('/country/${c.code}'),
        );
      },
    );
  }
}

class _PopularCard extends StatelessWidget {
  const _PopularCard({required this.country});
  final Country country;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go('/country/${country.code}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(flagFor(country.code), style: const TextStyle(fontSize: 32)),
            Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(country.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text('from ${money(country.fromPriceCents)}', style: theme.textTheme.bodySmall),
            ]),
          ]),
        ),
      ),
    );
  }
}

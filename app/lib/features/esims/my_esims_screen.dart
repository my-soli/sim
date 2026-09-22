import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/responsive.dart';
import '../../core/site.dart';
import '../../core/session.dart';

class MyEsimsScreen extends StatelessWidget {
  const MyEsimsScreen({super.key});

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: session,
        builder: (context, _) => session.signedIn
            ? const _EsimList()
            : Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.sim_card_outlined, size: 48),
                  const SizedBox(height: 12),
                  const Text('Sign in to see your eSIMs'),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: () => context.push('/login?next=/esims'), child: const Text('Sign in')),
                ]),
              ),
      );
}

class _EsimList extends StatefulWidget {
  const _EsimList();
  @override
  State<_EsimList> createState() => _EsimListState();
}

class _EsimListState extends State<_EsimList> {
  late Future<List<EsimInfo>> _future = api.esims();

  Future<void> _refresh() async {
    setState(() => _future = api.esims());
    await _future.catchError((_) => <EsimInfo>[]);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<EsimInfo>>(
      future: _future,
      builder: (context, snap) {
        if (snap.hasError) return ErrorRetry(error: snap.error!, onRetry: _refresh);
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final active = snap.data!.where((e) => !e.isExpired).toList();
        final expired = snap.data!.where((e) => e.isExpired).toList();
        return DefaultTabController(
          length: 2,
          child: ContentWidth(
            child: Column(children: [
              const Align(
                alignment: Alignment.centerLeft,
                child: Padding(padding: EdgeInsets.only(top: 20, bottom: 12), child: Breadcrumbs([Crumb('Home', '/'), Crumb('My eSIMs')])),
              ),
              TabBar(tabs: [Tab(text: 'Active (${active.length})'), Tab(text: 'Expired (${expired.length})')]),
              Expanded(
                child: TabBarView(children: [
                  _grid(active, 'No active eSIMs yet.\nPick a destination to get started.'),
                  _grid(expired, 'No expired eSIMs.'),
                ]),
              ),
            ]),
          ),
        );
      },
    );
  }

  Widget _grid(List<EsimInfo> items, String empty) => RefreshIndicator(
        onRefresh: _refresh,
        child: items.isEmpty
            ? ListView(children: [Padding(padding: const EdgeInsets.only(top: 80), child: Text(empty, textAlign: TextAlign.center))])
            : GridView.builder(
                padding: const EdgeInsets.symmetric(vertical: 16),
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 480, mainAxisExtent: 196, mainAxisSpacing: 12, crossAxisSpacing: 12),
                itemCount: items.length,
                itemBuilder: (_, i) => _EsimCard(esim: items[i]),
              ),
      );
}

class _EsimCard extends StatelessWidget {
  const _EsimCard({required this.esim});
  final EsimInfo esim;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final left = esim.dataTotalBytes - esim.dataUsedBytes;
    final low = !esim.isExpired && esim.usedFraction >= 0.8;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(flagFor(esim.country, regional: esim.country.contains('-')), style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 10),
            Expanded(child: Text(esim.countryName, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis)),
            Text(esim.isExpired ? 'Expired' : expiryLabel(esim.expiresAt), style: theme.textTheme.bodySmall),
          ]),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: esim.usedFraction,
              minHeight: 10,
              color: low ? theme.colorScheme.error : null,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            esim.isExpired
                ? '${dataLabel(esim.dataUsedBytes)} of ${dataLabel(esim.dataTotalBytes)} used'
                : '${dataLabel(left < 0 ? 0 : left)} left of ${dataLabel(esim.dataTotalBytes)}',
            style: theme.textTheme.bodySmall?.copyWith(color: low ? theme.colorScheme.error : null),
          ),
          const Spacer(),
          Row(children: [
            if (!esim.isExpired)
              TextButton.icon(
                onPressed: () => context.push('/orders/${esim.orderId}'),
                icon: const Icon(Icons.qr_code_2),
                label: const Text('QR & details'),
              ),
            const Spacer(),
            // Manual top-up for now: opens the destination's plans to buy more data.
            FilledButton.tonalIcon(
              onPressed: () => context.push('/country/${esim.country}'),
              icon: const Icon(Icons.add),
              label: const Text('Top up'),
            ),
          ]),
        ]),
      ),
    );
  }
}

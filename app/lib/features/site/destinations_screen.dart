import 'package:flutter/material.dart';

import '../../core/site.dart';
import '../catalog/destination_widgets.dart';

class DestinationsScreen extends StatefulWidget {
  const DestinationsScreen({super.key, this.initialQuery = ''});
  final String initialQuery;
  @override
  State<DestinationsScreen> createState() => _DestinationsScreenState();
}

class _DestinationsScreenState extends State<DestinationsScreen> {
  late final _controller = TextEditingController(text: widget.initialQuery);
  bool _regions = false;

  @override
  void didUpdateWidget(DestinationsScreen old) {
    super.didUpdateWidget(old);
    // Navbar search re-enters this route with a new ?q= while the state is kept alive.
    if (old.initialQuery != widget.initialQuery) _controller.text = widget.initialQuery;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _controller.text.trim().toLowerCase();
    return PageBody(
      crumbs: const [Crumb('Home', '/'), Crumb('Destinations')],
      title: 'Find your destination',
      subtitle: 'Search by country or region, then pick the data plan that suits your trip.',
      child: CountriesLoader(
        builder: (context, all) {
          final matches = all.where((c) => c.name.toLowerCase().contains(q) || c.code.toLowerCase() == q).toList();
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: SearchBar(
                controller: _controller,
                hintText: 'Search country or region',
                leading: const Icon(Icons.search),
                trailing: [
                  if (q.isNotEmpty)
                    IconButton(
                      tooltip: 'Clear',
                      icon: const Icon(Icons.close),
                      onPressed: () => setState(_controller.clear),
                    ),
                ],
                elevation: const WidgetStatePropertyAll(0),
                onChanged: (_) => setState(() {}),
              ),
            ),
            if (q.isNotEmpty) ...[
              SectionHeading('${matches.length} result${matches.length == 1 ? '' : 's'} for “${_controller.text.trim()}”'),
              CountryGrid(countries: matches),
            ] else ...[
              const SizedBox(height: 20),
              SegmentedButton<bool>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: false, label: Text('Countries')),
                  ButtonSegment(value: true, label: Text('Regions')),
                ],
                selected: {_regions},
                onSelectionChanged: (s) => setState(() => _regions = s.first),
              ),
              if (!_regions) ...[
                const SectionHeading('Popular destinations'),
                PopularGrid(countries: all.where((c) => c.popular).toList()),
                const SectionHeading('All countries'),
                CountryGrid(countries: all.where((c) => !c.isRegional).toList()),
              ] else ...[
                const SectionHeading('Regional plans', subtitle: 'One plan that works across several countries.'),
                CountryGrid(countries: all.where((c) => c.isRegional).toList()),
              ],
            ],
          ]);
        },
      ),
    );
  }
}

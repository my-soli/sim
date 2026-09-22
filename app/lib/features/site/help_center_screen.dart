import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/site.dart';
import 'help_articles.dart';

/// Help centre index: a browsable grid of articles (like a normal help/blog index), with the
/// existing click-to-expand FAQ kept underneath, unchanged.
class HelpCenterScreen extends StatefulWidget {
  const HelpCenterScreen({super.key});
  @override
  State<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends State<HelpCenterScreen> {
  String _q = '';
  String? _category;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final q = _q.trim().toLowerCase();
    final articles = helpArticles.where((a) {
      final matchesCategory = _category == null || a.category == _category;
      final matchesQuery = q.isEmpty || a.title.toLowerCase().contains(q) || a.excerpt.toLowerCase().contains(q);
      return matchesCategory && matchesQuery;
    }).toList();

    final faqQ = _q.trim().toLowerCase();
    final filteredFaqs = faqQ.isEmpty ? allFaqs : allFaqs.where((f) => f.q.toLowerCase().contains(faqQ) || f.a.toLowerCase().contains(faqQ)).toList();
    final faqGroups = <String>[];
    for (final f in filteredFaqs) {
      if (!faqGroups.contains(f.group)) faqGroups.add(f.group);
    }

    return PageBody(
      crumbs: const [Crumb('Home', '/'), Crumb('Help')],
      title: 'Help centre',
      subtitle: 'Browse articles by topic, or jump straight to a quick answer below.',
      max: 1100,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SearchBar(
          hintText: 'Search help articles and FAQs',
          leading: const Icon(Icons.search),
          elevation: const WidgetStatePropertyAll(0),
          onChanged: (v) => setState(() => _q = v),
        ),
        const SizedBox(height: 16),
        Wrap(spacing: 8, runSpacing: 8, children: [
          ChoiceChip(label: const Text('All topics'), selected: _category == null, onSelected: (_) => setState(() => _category = null)),
          for (final c in helpCategories)
            ChoiceChip(label: Text(c), selected: _category == c, onSelected: (_) => setState(() => _category = _category == c ? null : c)),
        ]),
        if (articles.isEmpty && _q.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text('No articles match "${_q.trim()}". Try the FAQs below, or contact us.', style: theme.textTheme.bodyLarge),
          )
        else ...[
          const SectionHeading('Articles'),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 340, mainAxisExtent: 200, mainAxisSpacing: 16, crossAxisSpacing: 16),
            itemCount: articles.length,
            itemBuilder: (_, i) => _ArticleCard(article: articles[i]),
          ),
        ],
        if (_q.isEmpty || filteredFaqs.isNotEmpty) ...[
          const SectionHeading('Quick answers', subtitle: 'Tap a question to expand it.'),
          for (final g in faqGroups) ...[
            Padding(
              padding: const EdgeInsets.only(top: 16, bottom: 8),
              child: Text(g, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
            ),
            FaqList(items: filteredFaqs.where((f) => f.group == g).toList()),
          ],
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

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article});
  final HelpArticle article;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: theme.colorScheme.outlineVariant)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/help/${article.slug}'),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              CircleAvatar(backgroundColor: theme.colorScheme.primaryContainer, child: Icon(article.icon, color: theme.colorScheme.onPrimaryContainer, size: 20)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(999)),
                child: Text(article.category, style: theme.textTheme.labelSmall),
              ),
            ]),
            const SizedBox(height: 12),
            Text(article.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Expanded(
              child: Text(article.excerpt, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodySmall),
            ),
            Row(children: [
              Icon(Icons.schedule, size: 13, color: theme.colorScheme.outline),
              const SizedBox(width: 4),
              Text('${article.minutesRead} min read', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
            ]),
          ]),
        ),
      ),
    );
  }
}

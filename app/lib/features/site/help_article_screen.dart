import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/site.dart';
import 'help_articles.dart';

class HelpArticleScreen extends StatelessWidget {
  const HelpArticleScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final matches = helpArticles.where((a) => a.slug == slug);
    final article = matches.isEmpty ? null : matches.first;

    if (article == null) {
      return PageBody(
        crumbs: const [Crumb('Home', '/'), Crumb('Help', '/help'), Crumb('Article')],
        title: 'Article not found',
        child: FilledButton(onPressed: () => context.go('/help'), child: const Text('Back to Help centre')),
      );
    }

    final related = helpArticles.where((a) => a.category == article.category && a.slug != article.slug).take(3).toList();

    return PageBody(
      crumbs: [const Crumb('Home', '/'), const Crumb('Help', '/help'), Crumb(article.category, '/help'), Crumb(article.title)],
      max: 780,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(radius: 22, backgroundColor: theme.colorScheme.primaryContainer, child: Icon(article.icon, color: theme.colorScheme.onPrimaryContainer)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(article.category, style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w700)),
              Text(article.title, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
            ]),
          ),
        ]),
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.only(left: 58),
          child: Row(children: [
            Icon(Icons.schedule, size: 14, color: theme.colorScheme.outline),
            const SizedBox(width: 4),
            Text('${article.minutesRead} min read', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
          ]),
        ),
        const SizedBox(height: 24),
        Text(article.intro, style: theme.textTheme.bodyLarge?.copyWith(height: 1.6)),
        for (final s in article.sections) ...[
          Padding(
            padding: const EdgeInsets.only(top: 24, bottom: 8),
            child: Text(s.$1, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          ),
          Text(s.$2, style: theme.textTheme.bodyLarge?.copyWith(height: 1.6)),
        ],
        const SizedBox(height: 12),
        Wrap(spacing: 12, runSpacing: 12, children: [
          FilledButton.icon(onPressed: () => emailSupport('Question about: ${article.title}'), icon: const Icon(Icons.email_outlined), label: const Text('Still need help? Contact us')),
        ]),
        if (related.isNotEmpty) ...[
          const SectionHeading('Related articles'),
          for (final a in related)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(backgroundColor: theme.colorScheme.surfaceContainerHighest, child: Icon(a.icon, size: 18)),
              title: Text(a.title, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(a.excerpt, maxLines: 1, overflow: TextOverflow.ellipsis),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/help/${a.slug}'),
            ),
        ],
      ]),
    );
  }
}

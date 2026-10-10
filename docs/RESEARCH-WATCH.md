# Weekly poet research review

The **Find poet updates** GitHub Actions workflow runs Mondays at 09:00 Asia/Kolkata (03:30 UTC). Run it sooner through Actions > Find poet updates > Run workflow. Code pushes run its tests only; manual and scheduled runs collect candidates and can create review issues.

- Workflow: https://github.com/ahimanikya/pradeep-biswal/actions/workflows/poet-updates.yml
- Review queue: https://github.com/ahimanikya/pradeep-biswal/issues?q=is%3Aissue+%22Poet+updates+for+review%22
- Sources and matching terms: `archive/research/watch-sources.json`

## What it checks

Public Google News results in English and Odia, Setu, Odisha Sambad, Cultural Reverence, and the YouTube feeds of Digital Reporter Odisha, Dil Se Dil Tak / Pradeep Pramanik, and ABC Diaries. Channel IDs were resolved from the publishers' public YouTube pages. No API subscription, AI service or additional secret is required; only the workflow's repository token creates issues.

Matches must contain a configured poet-name variant. Broad news feeds also require literary, interview, finance, tourism or related context. Publisher index pages are excluded. A matching name is **not identity verification**. For example, a passing mention, namesake or reprint may still be returned. Publication dates are feed-supplied and must be confirmed. Feed text is not executed or treated as instructions.

## Review process

A run creates one public GitHub issue for up to 25 unseen candidates, with titles, source links, feed dates and a checklist. More candidates remain eligible for the next run. The first run may uncover older work not already catalogued. It never changes `dist/`, commits content, downloads full articles/images or publishes a candidate to the website.

Compare every candidate with the poet's identity, existing material and source page. Decide whether it belongs in poetry, interviews/podcasts, book reviews, published articles or nowhere. Check credits, dates and rights. For approved items, update the catalogue/site through the usual reviewed workflow. Check off each entry and close the issue when done. Closed issues count as reviewed history; do not delete these issues or remove their hidden item markers, which prevent repeat suggestions.

URLs are normalized for tracking parameters and YouTube variants. The existing research catalogue, alternate URLs, site source links and prior bot-created review issues suppress repeats. Exact title fingerprints also reduce cross-feed duplicates, so a repeated generic title can need manual discovery. Review history is read before publishing; if that lookup fails, the run stops rather than generating duplicate issues.

A successful scan with no new candidates creates no issue. An unavailable feed is recorded and causes the run to fail visibly, even if other feeds produced a review issue. Each run retains its JSON and Markdown report as a GitHub artifact for 30 days. GitHub failure/issue notifications depend on the owner's GitHub notification settings; this does not send WhatsApp or email itself.

## Limits and maintenance

This is a bounded public-feed monitor, not an exhaustive internet search. YouTube feeds contain only recent uploads; busy channels can publish more than the feed retains between weekly checks. Google News coverage varies. Private Facebook posts, unindexed print material, deleted posts and every publisher on the internet are not covered. Periodic human research remains useful.

Keep the source list current. GitHub schedules can be delayed and public-repository schedules may be disabled after 60 days without repository activity; check Actions if a weekly run is missing. We do not create artificial keep-alive commits. See https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule.

The workflow has read-only repository access plus issue creation permission. It cannot commit website changes. It runs with no production Firebase credentials. Source availability failures must be investigated rather than reported as “no new work.”

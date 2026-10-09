# Pradeep Biswal — literary website

Standalone source repository for https://pb.kabitawithoutborders.org/.

## Development

The maintained static HTML, CSS, JavaScript and local assets are in `dist/`. This directory is source, not disposable build output. Preview with `python3 -m http.server 4173 --directory dist`.

The site includes 41 separately shareable memories, books, poetry, galleries, awards and testimonials. Contact, likes and comments are interfaces only; their backend is deferred.

## Publication

Production is hosted with Sites. `.openai/hosting.json` identifies the existing site. Publishing uses the Sites source workflow, then saves and deploys the exact artifact; keep its audience public. GitHub push alone does not trigger a Sites deployment. Do not create a second hosted site or redirect DNS to GitHub Pages without an explicit hosting migration.

The GitHub repository is independent of Kabita Live and Singhasan. The source snapshot contains the current public website only. Research archives and private Facebook captures are maintained separately.

## Content and assets

Preserve the poet’s wording and reviewed attributions. Local font licenses are in `dist/assets/fonts/`. Article content, photographs and artwork retain their respective rights; publication of this repository does not grant a blanket reuse license.

Search-engine indexing remains deferred in the existing robots directives pending launch review.

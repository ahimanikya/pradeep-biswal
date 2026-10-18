# Pradeep Biswal — literary website

Live website: https://pradeepbiswal.in/

## Edit and publish

This independent repository is the source of truth. The maintained HTML, CSS, JavaScript and local assets are in `dist/`; this directory is source, not disposable build output. Push to `main` to publish through GitHub Actions and GitHub Pages. No ChatGPT Sites account or deployment is needed.

Run `python3 tools/build_pages.py` to validate sharing metadata and build `_site/`. Preview with `python3 -m http.server 4173 --directory _site`. The build preserves `.html` links and creates complete HTML aliases for existing extensionless URLs, so crawlers can read the page and preview without JavaScript.

The permanent domain is `pradeepbiswal.in`, with GitHub Pages A records at the apex and `www` pointing to `ahimanikya.github.io`. The custom domain is also configured in this repository’s Pages settings. The former temporary address forwards existing links through the separate `ahimanikya/pradeep-biswal-redirect` repository, preserving paths, queries and fragments.

## Sharing images

All maintained source pages have static Open Graph and Twitter card metadata, canonical URLs, and a local JPEG preview. Memory articles use their own existing banner; section pages use relevant existing artwork or the poet's portrait. `tools/sharing-images.json` records each association. The website's visible images and authored text are unchanged.

To refresh previews after changing artwork, install `beautifulsoup4` and `Pillow`, then run `python3 tools/prepare_sharing.py`. The regular publish build uses only the Python standard library.

## Content and deferred features

Preserve the poet's wording and reviewed attributions. Guest likes and moderated comments use Firebase; readers need no account. Owner moderation is at `/moderation.html`. See `backend/README.md`. The contact form uses a private Firebase inbox. Finished public pages are indexable; search-engine submission remains deferred until explicitly approved. Social preview crawlers may fetch public pages and images.

This repository is independent of Kabita Live and Singhasan. Private research and Facebook capture archives are excluded. Font licenses are in `dist/assets/fonts/`. Content, photographs and artwork retain their respective rights; a public repository does not grant blanket reuse rights.

## Owner guide

See [Caring for the website](docs/OWNER-GUIDE.md) for inbox handling, moderation, updates and deferred work.

## Homepage curation

Keep all twelve books in the homepage slider and leave testimonials unchanged. Show ten photographs, six interviews, eight memories and six awards, each followed by a card linking to the complete collection. The policy is recorded in `tools/homepage-curation.json`. Preserve lazy image loading, native scrolling and no autoplay. Keep the compact In the Poet’s Voice link.

Do not add a new homepage section for each publication, recording or announcement. Preserve the existing typography, spacing, image treatment and restrained line art. Avoid autoplay, rotating promotional banners, extra badges and new decorative imagery without a specific reason.

## Workspace housekeeping

Generated `_site/`, Python caches and emulator debug logs are disposable and ignored by Git. Keep build screenshots and temporary review exports outside this repository. The current audit is `tools/audit-2026-10-10-end-of-day.json`; superseded audit snapshots have been removed. Preserve the source/research records and the unlisted `dist/review-drafts.html` page until the poet completes his review.

## Two online books

The Books page has a compact “Read online” shelf. `reading-room.html` is the 52-chapter **Missing Memories** reader; `odisha-at-the-crossroads.html` is the 43-chapter companion reader. Both remain working previews (`noindex`) while author decisions are open. The two-book integration is released through the GitHub Pages workflow after release checks. Author approval and print-production clearance remain separate.

Each reader has a `book-config` JSON block, its own cover previews, and separate `dist/books/<book-id>/contents.json` and `text.json` files. The shared `collection-reader.js` provides reading tools. Chapter text follows the stage-7 working copies used in the Word/PDF manuscripts. Editorial notes and publication sources remain separate from article prose. Do not silently apply unresolved review suggestions.

`dist/book-routes.json` maps all selected chapters and the consolidated Twin Tower alias. Old combined-reader hashes route to the right book. Local bookmarks and progress are namespaced per book; legacy chapter bookmarks migrate without deleting their originals. Old spread numbers are discarded because the new sequence changes pagination. The earlier 61-entry JSON files remain as compatibility/source records; `prepare_collection_reader.py` must not overwrite the new reader pages.

Keep manuscript PDFs, Word files, review findings, correspondence and editorial archives outside `dist/`. The previously authorized shared review page is unchanged. Run the two-book tests alongside the standard release checks. Do not use the earlier single-book generator to resequence these books.

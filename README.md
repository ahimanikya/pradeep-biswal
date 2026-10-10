# Pradeep Biswal — literary website

Live website: https://pb.kabitawithoutborders.org/

## Edit and publish

This independent repository is the source of truth. The maintained HTML, CSS, JavaScript and local assets are in `dist/`; this directory is source, not disposable build output. Push to `main` to publish through GitHub Actions and GitHub Pages. No ChatGPT Sites account or deployment is needed.

Run `python3 tools/build_pages.py` to validate sharing metadata and build `_site/`. Preview with `python3 -m http.server 4173 --directory _site`. The build preserves `.html` links and creates complete HTML aliases for existing extensionless URLs, so crawlers can read the page and preview without JavaScript.

The `pb` DNS CNAME points to `ahimanikya.github.io`. The custom domain is configured in this repository's Pages settings. The root domain and other subdomains are independent.

## Sharing images

All 60 source pages have static Open Graph and Twitter card metadata, canonical URLs, and a local JPEG preview. Memory articles use their own existing banner; section pages use relevant existing artwork or the poet's portrait. `tools/sharing-images.json` records each association. The website's visible images and authored text are unchanged.

To refresh previews after changing artwork, install `beautifulsoup4` and `Pillow`, then run `python3 tools/prepare_sharing.py`. The regular publish build uses only the Python standard library.

## Content and deferred features

Preserve the poet's wording and reviewed attributions. Guest likes and moderated comments use Firebase; readers need no account. Owner moderation is at `/moderation.html`. See `backend/README.md`. The contact form uses a private Firebase inbox. Finished public pages are indexable; search-engine submission is deferred until the final domain is selected. Social preview crawlers may fetch public pages and images.

This repository is independent of Kabita Live and Singhasan. Private research and Facebook capture archives are excluded. Font licenses are in `dist/assets/fonts/`. Content, photographs and artwork retain their respective rights; a public repository does not grant blanket reuse rights.

## Owner guide

See [Caring for the website](docs/OWNER-GUIDE.md) for inbox handling, moderation, updates and deferred work.

# Move to pradeepbiswal.in

Permanent domain confirmed by the owner on 10 October 2026. The owner authorized the cutover on 18 October 2026 after the provider updated DNS. GitHub Pages is now assigned to `pradeepbiswal.in`; maintained sharing/discovery URLs and backend domain allowlists have been updated. The temporary address is retained for forwarding existing links. HTTPS and browser checks are recorded below. Search submission remains deferred.

## Before DNS changes

- Back up the existing DNS zone and retain the old hosting/site backup. Agree a cutover window and rollback contact with the provider.
- Verify ownership of pradeepbiswal.in in GitHub Pages with the exact TXT challenge GitHub issues; do not invent a verification value.
- Add pradeepbiswal.in and www.pradeepbiswal.in to Firebase Authentication authorized domains and the existing reCAPTCHA Enterprise key's allowed domains. Retain the temporary domain during migration. Keep App Check enforcement enabled.
- Change dist/CNAME to pradeepbiswal.in, replace the temporary site's internal absolute URLs in maintained HTML and generated discovery material, regenerate metadata/sitemap/llms.txt, then run the release and discovery checks. Publishing tools read the host from dist/CNAME. This file alone does not change GitHub Pages when using Actions: also set the custom domain in repository Settings > Pages.
- Coordinate repository Settings > Pages, publishing and DNS together. Do not announce the new address before HTTPS and submissions pass.

## Provider DNS changes

Root (@): four A records — 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153.

www: CNAME to ahimanikya.github.io (no protocol or repository path).

TTL: 3600 or provider default. Replace conflicting website records. The 10 October audit found old root A and AAAA records and a www Hostinger CDN CNAME. Remove the old root AAAA records when switching to the four A records above; leaving them can send IPv6 visitors to the old site. Optional GitHub IPv6 records must be confirmed against GitHub's current documentation.

Preserve all MX, email-related TXT (SPF, DKIM, DMARC), other verification records and unrelated subdomains. Current email uses mx1.hostinger.in and mx2.hostinger.in. No nameserver transfer is required.

Source: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Verify before announcement

- Root and www resolve correctly; GitHub HTTPS certificate is ready; Enforce HTTPS is enabled; www redirects to the root.
- Test home, clean URL aliases, a shared article URL and the unlisted review page. Check sitemap, robots.txt, llms.txt, canonical URLs and social images use the new host.
- Test guest like/unlike, one clearly labelled pending comment, owner sign-in, rejection, and one contact submission received in the private inbox. Clean up or archive test records.
- Check original-site incoming paths against the archived URL inventory and retain aliases where needed. A root change must not strand old article links.
- Arrange an HTTPS redirect from pb.kabitawithoutborders.org preserving path and query. One GitHub Pages site's custom-domain setting cannot be relied on to retain both custom hosts; use a separate redirect service/site if needed. Keep the old review link working or send the poet its replacement.
- Obtain the owner's go-ahead before Search Console/Bing submission, which remains deferred. Do not assume a DNS switch grants submission approval.

## Rollback

Restore the saved DNS records if old hosting must resume. If reverting the new site's domain configuration, restore its CNAME, metadata and GitHub Pages custom domain together; keep both Firebase domains authorized until the rollback is verified. Do not delete old hosting or mail services during the observation period.

## Cutover verification — 18 October 2026

- `https://pradeepbiswal.in/` serves the redesigned site. GitHub issued a certificate covering both apex and www; HTTPS is enforced. `www` redirects to the apex.
- Main deployment `98c87f4` and its backend security checks passed. The homepage, clean aliases, books, review page, social image, sitemap, robots.txt and llms.txt return successfully with permanent-domain URLs.
- Firebase Authentication and the existing reCAPTCHA Enterprise key allow apex, www and the former host. App Check enforcement was not changed. API-key restrictions did not require a domain change.
- A regular in-app browser passed review-room App Check and loaded public article comment/count data, enabling the response controls. A fresh headless browser was rejected by App Check; no bypass or policy relaxation was applied.
- Book opening/page navigation, mobile layout and forwarding of book fragments and review invitation fragments were verified. Owner Google sign-in was not completed in this test; the new domain is authorized and owners may need to sign in again. Browser-local reading progress remains stored under its original origin.
- No live contact message, comment or reaction was submitted: automatic approval review rejected the proposed production-write test without explicit authorization. Contact layout/validation and backend reads were checked instead. A real end-to-end submission test remains optional and requires specific approval.
- The former address is served by `ahimanikya/pradeep-biswal-redirect`, with unchanged DNS pointing to GitHub. It forwards in the browser, preserving path, query and fragment. This is not a server-side HTTP 301; non-JavaScript visitors see a destination link.
- No Search Console/Bing submission was performed. Existing mail, DNS nameservers and unrelated services were not changed. Private editorial responses and reader records were not modified.

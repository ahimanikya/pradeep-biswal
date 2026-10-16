# Reader responses

GitHub Pages hosts the website. Firebase project `pradeep-biswal` stores responses in Firestore (asia-south1), on the Spark plan. Source, rules and configuration are in Git; reader data is not committed to Git.

Readers can like without registering and submit a name and comment for review. Firebase creates an anonymous browser identity when they interact. Clearing browser storage or switching devices creates another identity, so likes are not verified unique people. Comments have a 60-second per-identity cooldown and size limits. Pending comments are private to their author and the owner; only approved text and display name are published. Anonymous identities can be recreated; these controls are not a complete anti-bot system. App Check now uses a domain-restricted reCAPTCHA Enterprise provider. Browser verification and production Firestore enforcement are enabled. Unverified requests are rejected by App Check.

## Moderation

Open https://pb.kabitawithoutborders.org/moderation.html and sign in with the owner's Google account. Approve or reject pending comments. Only an account with a corresponding `admins/{uid}` record can moderate. To remove an already published comment, delete its document under `articles/{slug}/comments` in Firebase Console. No owner email is embedded in website content.

## Development

Use Node.js 24 or newer, npm 11.13.0 or newer, and Java 21 or newer for Firebase CLI 15.33.0. npm 10 does not reliably apply the nested override lockfile; use the pinned npm version in packageManager and CI. Set JAVA_HOME to the Java 21 installation when older Java versions are also installed. The upgrade was tested locally with a checksum-verified Temurin 21 runtime without changing system Java. See https://firebase.google.com/docs/emulator-suite/connect_firestore for the Java requirement.

```
cd backend
npm ci --ignore-scripts
npm audit --audit-level=low
npm run test:tools
npm run build
_JAVA_OPTIONS='-Xms128m -Xmx1g' npm test
npx firebase deploy --only firestore --project pradeep-biswal
```

Commit the rebuilt `dist/community.js`. The main page loads only the small loader; Firebase downloads as the comments section approaches the viewport or on reader interaction. Firebase web configuration in `dist/reader-config.json` is public by design. Never commit administrator credentials or service-account keys.

`tools/setup-project.cjs` uses the already authenticated Firebase CLI owner to configure the existing project and resets the website configuration to disabled. `tools/seed-project.cjs` seeds the 41 known article slugs and the CLI owner's moderation role. Do not run either against a different account/project. `tools/smoke.mjs` verifies a temporary guest like and pending comment, then removes its test records and account.

To temporarily stop the interface, set `enabled:false` in `dist/reader-config.json` and publish. This only disables the UI; use Firestore rules to stop backend writes.

Twelve emulator tests cover public reads, ownership, validation, private submissions, moderation permissions, cooldown and privilege escalation. A live smoke test also verified guest likes and pending submissions, with cleanup. Contact messages now use a separate private inbox.


## Private contact inbox

Contact the Poet lazily loads Firebase when a reader sends a message. No reader registration is needed. Messages are stored in `contactMessages`, readable only by their sender (single-document lookup) and existing administrators. Only administrators can list the inbox and mark messages read, unread or archived. Archiving is reversible; it does not delete the record. Reply by email opens the administrator's own email application; the site does not send email or notifications.

Submission rules enforce field limits and a five-minute per-identity cooldown through an atomic `contactLimits` record. A hidden form field deters basic form bots. Neither prevents a determined attacker recreating anonymous identities. App Check browser verification and server-side enforcement are enabled. Sender email addresses are not verified. Failed requests retain the form text; a stable submission ID prevents duplicate delivery on retry in the same page session. User data is rendered as text, never HTML.

No contact content or sender details are committed to Git. Firebase Spark quotas still apply. Check the moderation inbox manually until a separate email notification service is configured. Twelve emulator tests cover the existing community rules and new contact restrictions.

## App Check rollout (2026-10-10)

The Enterprise SCORE key allows only `pb.kabitawithoutborders.org`; tokens refresh automatically with a one-hour lifetime. No billing account was linked or plan changed. Browser verification, public comment reads, and a temporary like/unlike were verified on the live domain. An earlier browser session had intermittent connection errors; a fresh session passed. No test comments or contact messages were submitted in this rollout.

`tools/audit-appcheck.cjs` reads the provider, enforcement and billing configuration. `tools/setup-appcheck.cjs` configures the provider without enforcement. Run `tools/enforce-appcheck.cjs` only after explicit approval for production-wide Firestore enforcement: it rejects unverified reads and writes, including older open tabs and unattested moderation clients. The user explicitly approved enforcement, which was enabled on 2026-10-10 at 00:41:37 UTC. Configuration readback confirmed ENFORCED. A direct unverified read returned HTTP 403, while the production browser loaded comments and saved then removed a temporary like. Post-enforcement live checks passed: guest contact delivery, owner Google sign-in, inbox receipt, mark-read/archive, guest comment submission, and owner rejection. The test comment was never published; two clearly labeled contact tests remain archived. Approval permissions are covered by emulator tests.

Local previews do not qualify for production-domain attestation. Use the Firebase emulator for local development; do not add a production debug bypass. Existing unauthenticated command-line smoke scripts will need an emulator or a suitable authorized test setup after enforcement. App Check complements the rules, moderation and cooldowns; it does not guarantee prevention of all abuse or DDoS traffic.

## Search and AI discovery

56 finished public pages are indexable, with canonical URLs, matching structured data, a sitemap, and crawlable HTML article text. Moderation, error and unfinished/retired pages remain excluded from indexing. `tools/prepare_discovery.py` regenerates the head metadata, sitemap and `llms.txt`; `tools/audit_discovery.py` validates the output in the publishing workflow. `llms.txt` is an optional reading directory, not a guarantee of search or AI inclusion. Search Console submission and actual indexing have not been verified.

## Operating ownership and domain migration

Ahimanikya is responsible for the private contact inbox and comment moderation, confirmed 2026-10-10. Check `/moderation.html` regularly; automatic email notifications are not enabled. Search Console and Bing submission are deferred at the owner's request until the final domain is selected; no submission was made. Before changing domains, update GitHub Pages/DNS, Firebase authorized domains, the App Check allowed domain, canonical/social URLs, sitemap and llms.txt, then re-test guest submissions and owner sign-in.

## Follow-up audit (10 October 2026)

All 12 emulator security tests pass after overriding the Firebase Node dependency `@grpc/grpc-js` to patched version 1.14.5. The browser bundle is unchanged; `npm audit --omit=dev` reports no vulnerabilities. The override addresses GHSA-m9gg-hp2v-232j and GHSA-f596-whhp-79r4. Remove it only after the upstream Firebase dependency is patched and audited.

The development-toolchain findings from the follow-up audit are resolved. Firebase CLI is pinned to 15.33.0; the full dependency audit (including development tools) now reports zero vulnerabilities. All 12 security-rule tests and four toolchain compatibility tests pass. The authenticated read-only App Check audit also passed with the existing CLI-internal APIs. No production mutation/setup scripts were run.

Scoped CLI overrides address dependencies still vulnerable in the upstream release: Chokidar 4.0.3 removes the unpatched braces path; PubSub 6.2.0 brings patched OpenTelemetry; uuid 11.1.1 patches the gaxios dependency; basic-ftp 6.2.3 patches the proxy dependency. These are scoped under firebase-tools, separate from the Firebase SDK gRPC override. Chokidar 4 removes glob support: this project watches a concrete Firestore rules file, verified by a file-change test. Compatibility validation covers this project’s Firestore emulator/admin workflow, not every Firebase CLI feature. Re-evaluate the overrides on the next CLI update instead of blindly removing or broadening them.

The Backend security checks workflow installs the lockfile on Node 24 / npm 11.13.0 / Temurin 21, runs the full audit, compatibility tests, security-rule tests and browser build, and checks that the generated browser bundle matches Git. It requires no production credentials. Audit results are a point-in-time dependency check, not a guarantee against all vulnerabilities.

Private Firestore backup and local restoration verification are available in `tools/private-backup.cjs`. GitHub does not contain reader data. See the procedure below; never put private inbox exports in this public repository.

## Private backup and recovery check

Run from `backend` using the authenticated Firebase CLI owner. Choose a new, private destination outside this public repository for each export:

```sh
node tools/private-backup.cjs export /absolute/private/location/dated-backup
node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --only firestore --project demo-pradeep-biswal 'node tools/private-backup.cjs verify-restore /absolute/private/location/dated-backup/firestore.json 127.0.0.1:8085 demo-pb-backup-check'
```

The first command reads production at one snapshot time and follows all document/subcollection pages, including subcollections whose parent documents do not exist. It preserves Firestore field types and large integer strings. The destination directory is owner-only (0700), files are owner-only (0600), and existing exports are never overwritten. A SHA-256 checksum detects accidental corruption. The second command writes only to an empty local emulator under a `demo-` project, then compares every document path and field value. It refuses a real project, remote host or populated target. There is deliberately no production-restore command. No private values are printed.

This is a document-level recovery copy, not a managed Firestore service export. Document creation/update metadata is recorded but server metadata changes on restoration. Field-level timestamps are preserved. It includes inbox submissions, comments, likes, admin-role documents and shared editorial records present at the snapshot. It does **not** back up Firebase Authentication users, rules, indexes, App Check configuration or account credentials. Rules/indexes are versioned here; recovering owner access also requires the original Firebase Authentication identity. A production recovery must be planned against the target project and existing data, with writes paused and conflicts reviewed before any write.

Keep an encrypted second copy in an owner-controlled location, restrict access, and define retention before relying on this as disaster recovery. This repository does not schedule live exports or hold production credentials. Re-run the export and isolated restoration check after important review activity and before backend migrations. The emulator test suite uses synthetic data only.

On 17 October 2026, the owner workspace captured 684 production documents to a private local folder and verified all 684 paths and field values through an isolated emulator restoration. Production data was not modified. This point-in-time check does not include later submissions or constitute an off-device backup.

## Shared editorial review

`/author-review.html` is an unlinked, noindex review room. Its public shell contains no manuscript or review findings. The private corpus is in `editorialProjects/two-books-2026`; build its payload outside this public Git repository using `editorial/two-books/tools/build_shared_review.py` in the parent workspace.

The existing owner signs in with Google and selects **Create poet’s review link**. The poet uses that revocable, one-year invitation without a Google or GitHub account. It is a bearer link: anyone receiving it can act under that invitation's reviewer name. The token is removed from the address bar on entry. Membership is checked against the active invitation on every protected operation, including token rotation and expiry. Owner access uses the existing `admins/{uid}` record; invitations never grant inbox or moderation access.

The workspace displays one finding at a time. Previous/Next and Save & next follow the selected book and filters across chapter boundaries. Unfinished wording is retained in page memory when navigating between items. Chapter/filter choices, optional comments, full chapter text, and saved response history open on demand.

Each response is immutable and bound to a SHA-256 fingerprint of the finding, recommendation, tracked changes, and chapter context. Further responses are appended; the latest response per reviewer is shown, with earlier responses available. Neither reviewer can overwrite the other's response. Approvals do not alter manuscripts or establish factual correctness. Export includes all saved response history. Unsaved input stays in page memory, with a warning before leaving; it is not a saved response.

After running the security tests, deploy `firestore.rules`, then seed from the private payload:

```
node tools/seed-editorial-review.cjs ../../editorial/two-books/shared-review/payload.json
```

The seed uses the authenticated Firebase CLI owner. It never modifies responses or invitations. The project's current item manifest determines which findings are displayed; archived documents can remain for history. Do not publish the payload, invitation tokens, browser exports, or manuscript files in this repository. No production App Check bypass is provided. Browser testing uses an isolated, temporary emulator bundle; production remains protected by the existing reCAPTCHA Enterprise App Check configuration.

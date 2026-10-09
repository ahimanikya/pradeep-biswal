# Reader responses

GitHub Pages hosts the website. Firebase project `pradeep-biswal` stores responses in Firestore (asia-south1), on the Spark plan. Source, rules and configuration are in Git; reader data is not committed to Git.

Readers can like without registering and submit a name and comment for review. Firebase creates an anonymous browser identity when they interact. Clearing browser storage or switching devices creates another identity, so likes are not verified unique people. Comments have a 60-second per-identity cooldown and size limits. Pending comments are private to their author and the owner; only approved text and display name are published. Anonymous identities can be recreated; these controls are not a complete anti-bot system. App Check is supported through `recaptchaSiteKey` but is not configured/enforced in this release.

## Moderation

Open https://pb.kabitawithoutborders.org/moderation.html and sign in with the owner's Google account. Approve or reject pending comments. Only an account with a corresponding `admins/{uid}` record can moderate. To remove an already published comment, delete its document under `articles/{slug}/comments` in Firebase Console. No owner email is embedded in website content.

## Development

Use modern Node.js (22+) and Java 11 for the pinned emulator tooling.

```
cd backend
npm ci
npm run build
_JAVA_OPTIONS='-Xms128m -Xmx1g' npm test
npx firebase deploy --only firestore --project pradeep-biswal
```

Commit the rebuilt `dist/community.js`. The main page loads only the small loader; Firebase downloads on reader interaction. Firebase web configuration in `dist/reader-config.json` is public by design. Never commit administrator credentials or service-account keys.

`tools/setup-project.cjs` uses the already authenticated Firebase CLI owner to configure the existing project and resets the website configuration to disabled. `tools/seed-project.cjs` seeds the 41 known article slugs and the CLI owner's moderation role. Do not run either against a different account/project. `tools/smoke.mjs` verifies a temporary guest like and pending comment, then removes its test records and account.

To temporarily stop the interface, set `enabled:false` in `dist/reader-config.json` and publish. This only disables the UI; use Firestore rules to stop backend writes.

Eight emulator tests cover public reads, ownership, validation, private submissions, moderation permissions, cooldown and privilege escalation. A live smoke test also verified guest likes and pending submissions, with cleanup. Contact messages now use a separate private inbox.


## Private contact inbox

Contact the Poet lazily loads Firebase when a reader sends a message. No reader registration is needed. Messages are stored in `contactMessages`, readable only by their sender (single-document lookup) and existing administrators. Only administrators can list the inbox and mark messages read, unread or archived. Archiving is reversible; it does not delete the record. Reply by email opens the administrator's own email application; the site does not send email or notifications.

Submission rules enforce field limits and a five-minute per-identity cooldown through an atomic `contactLimits` record. A hidden form field deters basic form bots. Neither prevents a determined attacker recreating anonymous identities. App Check remains unconfigured. Sender email addresses are not verified. Failed requests retain the form text; a stable submission ID prevents duplicate delivery on retry in the same page session. User data is rendered as text, never HTML.

No contact content or sender details are committed to Git. Firebase Spark quotas still apply. Check the moderation inbox manually until a separate email notification service is configured. Twelve emulator tests cover the existing community rules and new contact restrictions.

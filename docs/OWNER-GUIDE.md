# Caring for Pradeep Biswal’s website

You manage contact messages and reader comments. The website is published from GitHub; reader submissions are stored separately in Firebase. No reader needs a GitHub account.

## Check messages

1. Open [the moderation page](https://pb.kabitawithoutborders.org/moderation.html) and sign in with your existing authorized Google account.
2. In the private inbox, use **Refresh inbox** to check for messages. Use the load-more button for older messages.
3. **Reply by email** opens your email application. Review and send the reply there; the website does not send it for you.
4. Use **Mark read**, **Mark unread**, or **Archive** to track your work. Archiving changes the status and does not delete the message; archived messages remain in the inbox listing.

Check regularly: automatic email notifications are not enabled. Sender email addresses are not verified. Contact messages are private and are not published with comments.

## Review comments

Read the pending comment and its article name before choosing **Approve** or **Reject**. Approving publishes the submitted name and comment; rejecting keeps it off the public article. Use the load-more button for additional pending comments.

The current screen handles pending comments only. Removing a previously approved comment requires an administrator to remove its public comment document in Firebase. Ask for help with that specific comment rather than changing database records casually.

Likes use an anonymous browser identity. They are reader reactions, not a count of verified unique people.

## Add or correct content

For each new item, provide its title, original link or file, author or interviewer, publication date if known, and any translation credit. Explain what should change and preserve the poet’s wording unless he approves an edit.

- Published work is maintained in the [research catalogue](../archive/research/catalog.json).
- Book purchase sources are recorded in the [book catalogue](../archive/books/purchase-links.json).
- Related reading links are documented in [related work](../archive/research/related-work.json).
- The maintained website files are in `dist/`. The generated `_site/` folder is not the editing source.

A typical update is: prepare the change, preview it, check links and mobile layout, then push to the main GitHub branch. A successful **Publish website** run in [GitHub Actions](https://github.com/ahimanikya/pradeep-biswal/actions) confirms deployment. GitHub publishing does not back up Firebase reader data.

## When something fails

If sign-in fails, use the authorized owner account and the live domain, allow the Google sign-in popup, then retry. For a missing message, refresh the inbox before asking the sender to retry. Record the page URL and visible error if a problem persists; do not share private message contents publicly.

For a website regression, the maintainer can revert the relevant Git commit and republish. Database changes require separate handling.

## Deferred work

The poet should approve the proposed reading selection, timeline, new biography wording and personal note. Audio readings await recordings and approval. Search submission remains deferred until the final domain is chosen.

A domain change must also update Firebase sign-in and App Check settings, social previews, canonical URLs, sitemap and discovery files, followed by live checks of contact delivery, comments and owner sign-in. Change these together to avoid interrupting submissions.

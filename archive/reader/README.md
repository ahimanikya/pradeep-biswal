# Reading room sources

The reading room collects 41 existing memoir articles and 16 published articles.
On 14 October 2026 the site owner instructed us to extract the published articles,
confirming that the writer owns the copyright. Each publisher page identifies
Pradeep Biswal as its author. The downloaded HTML is retained here as evidence;
scripts, advertising and page furniture are excluded from the reader copies.

Existing memoir text and images are unchanged. All 16 published articles also
had publisher images, which are preserved locally with their original URLs in
the reader index. No replacement artwork was necessary after the owner's
instruction to retain existing images. One unused radio artwork experiment is
kept outside the website in `kb/poet-review/reader-art`.

`entries.json` records extracted text, source URLs and source hashes. The reader
loads one article at a time. Publisher copies in `dist/reader-text` contain no
tracking code. Reader preferences and position are stored only in the visitor's
browser. The reader is currently a noindex preview linked from Draft Review;
existing navigation and public article pages remain unchanged.

Validation: 57 distinct IDs; no exact duplicate normalized article texts;
41 original image associations retained; 16 publisher bylines verified;
57 image files present. Similar subjects (including the two Jayanta Mahapatra
pieces) are separate articles, not automatically merged.

Before moving the reader into primary navigation, ask the poet to review the
imported articles and publisher illustrations. Reader links use stable article
IDs. Their hash selects an article; existing memory page URLs remain canonical.

Rebuild extracted copies with `python3 tools/prepare_collection_reader.py`.
Cached source pages are used unless deliberately refreshed. Run
`python3 -m unittest discover -s tools/tests -p test_collection_reader.py`,
the release/discovery audits, and the Pages build after changes.

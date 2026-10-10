# Literary research archive

Research date: 10 October 2026. This catalogue contains 35 records: three video interviews, two print interviews, one conversation report, five book reviews, sixteen articles and eight poetry records. Twenty-six URLs were absent from the earlier 7 October research catalogue; that means newly catalogued, not necessarily newly published or never referenced elsewhere on the website.

The public directory at `/literary-archive.html`, plus `/interviewvideo.html` and `/review.html`, contains bibliographic records and links to original publishers. No third-party full text or video has been republished. Local preservation copies and a checksum manifest are in the project workspace under `kb/research-2026-10-10/preservation`; those files are not part of this public repository.

## Evidence and limits

- Video titles, channels, dates and playable recordings were inspected on YouTube. The recordings were not watched or transcribed in full. The podcast detail panel displayed 2 November 2024 while a search result displayed 3 November; the catalogue retains the detail-panel date and records the discrepancy.
- Sixteen OdishaBytes essays were confirmed from both pages of the publisher's Pradeep Biswal author index (Former Bureaucrat & Author). Individual full texts were not all inspected. Their titles are attributed writings, not claims endorsed by the site.
- The Aakhar item is a foundation report, not an interview transcript. April 2024 is its upload month, not a confirmed event date. Printed page 48 is the relevant page.
- Same-work publications were grouped: In the End (Literary Vibes and Words & Worlds), the Jayanta Mahapatra essay (OdishaBytes and Literary Vibes), and Hema Savithri's review on two Shalandi routes.
- The five `leads` are not presented as verified public entries. The college-hosted Sitakant Mohapatra article may overlap the existing memory “The Sky Unlimited”; compare before adding it. Standalone originals of the Madhur Singh Pradhan and Snehaprava Das reviews have not been located.
- Namesakes and unrelated people were excluded. Earlier requests to remove OdishaPlus and Facenfacts from the site were respected; old research records remain in the workspace.
- This is a substantial research pass, not an exhaustive bibliography. Offline print archives and videos without searchable metadata may contain more.

## Maintenance

Edit `catalog.json`, keep `catalog.csv` aligned, then run `python3 tools/build_literary_archive.py`, `python3 tools/prepare_discovery.py`, the release/discovery audits and `python3 tools/build_pages.py`. Keep unknown dates explicit; do not invent credentials, quotes or publication dates. Search Console/Bing submission remains deferred until the planned domain change.

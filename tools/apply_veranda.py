"""Keep the public theme present after regenerating article and collection pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'reading-room.html', 'odisha-at-the-crossroads.html',
            'author-review.html', 'moderation.html', 'review-drafts.html'}

def apply_theme(root=ROOT):
    count = 0
    for page in (root / 'dist').rglob('*.html'):
        if page.name in EXCLUDED:
            continue
        source = page.read_text()
        prefix = '../' * len(page.relative_to(root / 'dist').parts[:-1])
        source = re.sub(r'<link\b[^>]*href="[^"]*veranda\.css[^\"]*"[^>]*>', '', source)
        source = source.replace('</head>', f'<link rel="stylesheet" href="{prefix}veranda.css?v=20261019-seal"/></head>')
        def body(match):
            tag = re.sub(r'\sdata-theme="[^"]*"', '', match[0])
            return tag[:-1] + ' data-theme="veranda">'
        source = re.sub(r'<body\b[^>]*>', body, source, count=1)
        if source != page.read_text():
            page.write_text(source)
            count += 1
    return count

if __name__ == '__main__':
    print(f'Applied Veranda theme to {apply_theme()} public pages.')

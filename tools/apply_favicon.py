"""Apply the approved PB seal, including raster and home-screen fallbacks."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
def apply_favicon(root=ROOT):
 for page in (root/'dist').rglob('*.html'):
  source=page.read_text();prefix='../'*len(page.relative_to(root/'dist').parts[:-1])
  source=re.sub(r'<link\b(?=[^>]*\brel="(?:icon|shortcut icon|apple-touch-icon)")[^>]*>','',source)
  links=''.join(f'<link rel="icon" type="image/png" sizes="{size}x{size}" href="{prefix}favicon-{size}.png?v=20261019-seal"/>' for size in [16,32])
  links+=f'<link rel="icon" type="image/svg+xml" sizes="any" href="{prefix}favicon.svg?v=20261019-seal"/><link rel="apple-touch-icon" sizes="180x180" href="{prefix}apple-touch-icon.png?v=20261019-seal"/>'
  source=source.replace('</head>',links+'</head>')
  if source!=page.read_text():page.write_text(source)
if __name__=='__main__':apply_favicon()

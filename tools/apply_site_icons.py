"""Apply the site's small, consistent line icons to interface controls only."""
from pathlib import Path
import re

PATHS = {
 'next':'M4 12c5-.3 10-.3 16 0M14 6l6 6-6 6',
 'previous':'M20 12c-5-.3-10-.3-16 0M10 6l-6 6 6 6',
 'outward':'M5 19 19 5M8 5h11v11',
 'download':'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
 'close':'m6 6 12 12M18 6 6 18',
 'book':'M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15',
 'feather':'M4 21 18 7M7 18c-1-5 1-10 6-13 4-2 7-2 8-2 0 4-2 9-6 12-3 2-5 3-8 3Zm4-4h5M14 11V7',
 'memory':'M6 3h13v18H6c-3 0-3-4 0-4h13M6 3c-3 0-3 4-3 6v10M8 7h7M8 11h5',
 'photo':'M3 5h18v15H3ZM3 16l5-5 5 5 3-3 5 5M16 8h.01',
 'person':'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21c0-5 3-8 8-8s8 3 8 8',
 'mail':'M3 5h18v14H3ZM3 6l9 7 9-7',
 'award':'M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v3c0 3 2 4 5 4M17 5h4v3c0 3-2 4-5 4M12 14v6M7 21h10',
 'play':'M9 6v12l10-6ZM3 3h18v18H3Z',
 'quote':'M4 12h6v8H3v-8c0-5 2-8 7-9M16 12h6v8h-7v-8c0-5 2-8 7-9',
 'home':'m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
}
def icon(name):
 return f'<svg class="site-line-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="{PATHS[name]}"></path></svg>'
ROUTES={'index':'home','poetry':'feather','book':'book','memory':'memory','gallery':'photo','about':'person','contact':'mail','achive':'award','note':'feather','family':'person','review':'quote','testimonials':'quote','interviewphoto':'photo','interviewvideo':'play','video':'play'}
def nav(match):
 def link(m):
  text=m[0]
  if 'site-line-icon' in text:return text
  href=re.search(r'href="([^"]+)"',text)
  if not href:return text
  route=href[1].split('/')[-1].split('.')[0].split('#')[0]
  if route not in ROUTES:return text
  return text.replace('>', '>'+icon(ROUTES[route]),1)
 return re.sub(r'<a\b[^>]*>.*?</a>',link,match[0],flags=re.S)
def control(m):
 text=m[0]
 if 'site-line-icon' in text:return text
 classes=re.search(r'class="([^"]*)"',text)
 classes=classes[1].split() if classes else []
 if any(c in classes for c in ('carousel-previous','carousel-next','testimonial-prev','testimonial-next','viewer-close')):
  name='close' if 'viewer-close' in classes else 'previous' if any(c.endswith(('previous','prev')) for c in classes) else 'next'
  label=re.search(r'aria-label="([^"]*)"',text)
  opening=text[:text.index('>')]
  if label and 'title=' not in opening:opening+=' title="'+label[1]+'"'
  return opening+'>'+icon(name)+'</button>'
 if any(c in classes for c in ('text-link','button','closing-link','viewer-prev','viewer-next','viewer-download','send-message')):
  for arrow,name in [('↗','outward'),('→','next'),('←','previous'),('↓','download')]:
   text=text.replace(arrow,icon(name))
 return text
for p in [*Path('dist').rglob('*.html'),Path('templates/footer.html'),Path('templates/article-footer.html')]:
 s=p.read_text()
 s=re.sub(r'<nav\b[^>]*(?:class="desktop-nav"|aria-label="Complete website index"|aria-label="Footer navigation")[^>]*>.*?</nav>',nav,s,flags=re.S)
 s=re.sub(r'<(?:button|a)\b[^>]*>.*?</(?:button|a)>',control,s,flags=re.S)
 s=s.replace('styles.css?v=20261010-action-icons','styles.css?v=20261010-site-icons')
 p.write_text(s)

"""Build GitHub Pages output, including complete HTML for legacy clean URLs."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import shutil, re, json
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'dist'
out=ROOT/'_site'
class Metadata(HTMLParser):
 def __init__(self): super().__init__();self.meta={};self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta': self.meta[a.get('property',a.get('name',''))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical': self.links.append(a.get('href'))
if out.exists(): shutil.rmtree(out)
shutil.copytree(source,out)
count=0
footer_template=(ROOT/'templates/footer.html').read_text().strip()
for page in source.rglob('*.html'):
 text=page.read_text();p=Metadata();p.feed(text)
 prefix='../' if page.parent.name=='memories' else ''
 page_footer=(ROOT/'templates/article-footer.html').read_text().strip() if page.parent.name=='memories' else footer_template
 expected_footer=page_footer.replace('href="contact.html','href="'+prefix+'contact.html').replace('href="index.html','href="'+prefix+'index.html').replace('href="memory.html','href="'+prefix+'memory.html')
 assert expected_footer in text, f'Footer differs from the shared template: {page}'
 required=['og:title','og:description','og:url','og:image','og:image:alt','og:image:width','og:image:height','twitter:card','twitter:image']
 assert all(p.meta.get(k) for k in required),f'Missing sharing metadata: {page}'
 assert len(p.links)==1 and p.links[0]==p.meta['og:url'],f'Canonical mismatch: {page}'
 assert p.meta['og:image']==p.meta['twitter:image']
 image=source/unquote(urlsplit(p.meta['og:image']).path.lstrip('/'))
 assert image.is_file(),f'Missing preview: {image}'
 assert image.stat().st_size<1000000,f'Preview too large: {image}'
 if page.name not in ['index.html','404.html']:
  alias=out/page.relative_to(source).with_suffix('')/'index.html'
  alias.parent.mkdir(parents=True,exist_ok=True)
  # Every alias is one directory below its maintained source HTML.
  # Crawlers receive complete metadata; browsers use the maintained .html URL.
  # Carry query/hash across so legacy article anchors keep working.
  target='/'+page.relative_to(source).as_posix()
  redirect='<script>location.replace('+json.dumps(target)+'+location.search+location.hash)</script>'
  alias.write_text(text.replace('<head>','<head><base href="../"/>'+redirect,1))
 count+=1
# Root-relative URLs make the 404 page usable at any unknown nested address.
notfound=out/'404.html'
s=notfound.read_text()
s=re.sub(r'((?:href|src)=")(?!(?:https?:|/|#|mailto:|data:))',r'\1/',s)
notfound.write_text(s)
for name in ['_redirects','_headers']:
 (out/name).unlink(missing_ok=True)
(out/'.nojekyll').touch()
print(f'Validated {count} pages; built {len(list(out.rglob("*.html")))} pages including clean URL aliases.')

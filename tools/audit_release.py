"""Check local navigation, image references, headings and document IDs before release."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import Counter
import json
ROOT=Path(__file__).resolve().parents[1]/'dist'
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.ids=[];self.refs=[];self.images=[];self.h1=0;self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='h1':self.h1+=1
  if tag=='iframe' and 'youtube' in a.get('src',''):raise ValueError('Use the click-to-play YouTube component')
  if tag=='img':self.images.append(a)
  key='href' if tag in ['a','link'] else 'src' if tag in ['img','script'] else None
  if key and a.get(key):self.refs.append((tag,a[key]))
pages={p.resolve():Page(p.read_text()) for p in ROOT.rglob('*.html')}
errors=[];links=images=0
for p,data in pages.items():
 if data.h1!=1:errors.append(f'{p.name}: expected one h1')
 for value,count in Counter(data.ids).items():
  if count>1:errors.append(f'{p.name}: duplicate id {value}')
 for image in data.images:
  if image.get('src'):images+=1
  if 'alt' not in image:errors.append(f'{p.name}: missing image alt')
 for tag,ref in data.refs:
  url=urlsplit(ref)
  if url.scheme or url.netloc:continue
  links+=tag=='a'
  target=((ROOT/url.path.lstrip('/')) if url.path.startswith('/') else p.parent/unquote(url.path)).resolve() if url.path else p
  if not target.exists():errors.append(f'{p.name}: missing {ref}')
  if tag=='a' and url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:errors.append(f'{p.name}: missing anchor {ref}')
result={'pages':len(pages),'local_links':links,'image_references':images,'errors':errors}
print(json.dumps(result,indent=2))
if errors:raise SystemExit(1)

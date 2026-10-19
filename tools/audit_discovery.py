"""Keep search metadata and the sitemap aligned with published canonical pages."""
from pathlib import Path
from html.parser import HTMLParser
import json,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]/'dist'
ORIGIN='https://'+(ROOT/'CNAME').read_text().strip()
class Page(HTMLParser):
 def __init__(self,text):super().__init__();self.canonical='';self.robots='';self.capture=False;self.schema='';self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta' and a.get('name')=='robots':self.robots=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a['href']
  if tag=='script' and a.get('id')=='discovery-schema':self.capture=True
 def handle_endtag(self,tag):
  if tag=='script':self.capture=False
 def handle_data(self,data):
  if self.capture:self.schema+=data
public=[];articles=0
for p in ROOT.rglob('*.html'):
 d=Page(p.read_text())
 assert d.canonical.startswith(ORIGIN+'/'),f'Wrong canonical domain: {p}'
 if 'noindex' in d.robots:continue
 assert 'index' in d.robots,p
 data=json.loads(d.schema);assert data['@context']=='https://schema.org'
 assert any(x.get('url')==d.canonical for x in data['@graph']),p
 if p.parent.name=='memories' or p.name.startswith('essay-'):
  article=next(x for x in data['@graph'] if x['@type']=='Article');assert article['author']['@id'].endswith('/#poet');articles+=1
 public.append(d.canonical)
urls=[x.text for x in ET.parse(ROOT/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(urls)==len(set(urls)) and set(urls)==set(public)
assert len(public)==63 and articles==48
assert all(url in (ROOT/'llms.txt').read_text() for url in public)
assert 'Sitemap: '+ORIGIN+'/sitemap.xml' in (ROOT/'robots.txt').read_text()
print(f'Discovery validated: {len(public)} canonical pages, {articles} attributed articles.')

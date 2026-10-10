"""Generate crawl metadata from existing public page content; no inferred biography or dates."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
from urllib.parse import urlsplit
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'dist';ORIGIN='https://'+(SOURCE/'CNAME').read_text().strip()
EXCLUDE={'moderation.html','404.html','note.html','credits.html','review-drafts.html'}
class Extract(HTMLParser):
 def __init__(self,text):
  super().__init__(convert_charrefs=True);self.meta={};self.canonical='';self.title=[];self.in_h1=False;self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a['href']
  if tag=='h1':self.in_h1=True
  if tag=='br' and self.in_h1:self.title.append(' ')
 def handle_endtag(self,tag):
  if tag=='h1':self.in_h1=False
 def handle_data(self,text):
  if self.in_h1:self.title.append(text)
def tag_json(data):
 return '<script type="application/ld+json" id="discovery-schema">'+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script>'
person={'@type':'Person','@id':ORIGIN+'/#poet','name':'Pradeep Biswal','alternateName':'Pradeep Kumar Biswal','url':ORIGIN+'/about.html','image':ORIGIN+'/assets/sharing/pradeep-biswal-800.jpg','description':'Poet writing in Odia and English, translator, and editor of Kabita Live.'}
website={'@type':'WebSite','@id':ORIGIN+'/#website','url':ORIGIN+'/','name':'Pradeep Biswal','publisher':{'@id':person['@id']},'inLanguage':'en'}
entries=[]
for p in sorted(SOURCE.rglob('*.html')):
 raw=p.read_text();d=Extract(raw);title=' '.join(''.join(d.title).split()).rstrip('.')
 public=p.name not in EXCLUDE;article=p.parent.name=='memories';url=d.canonical
 robots='index,follow,max-image-preview:large' if public else 'noindex,follow'
 raw=re.sub(r'<meta\b(?=[^>]*\bname="robots")[^>]*>',lambda _:f'<meta name="robots" content="{robots}"/>',raw)
 raw=re.sub(r'<script\b[^>]*id="discovery-schema"[^>]*>.*?</script>','',raw,flags=re.S)
 if public:
  kind='ProfilePage' if p.name=='about.html' else 'CollectionPage' if p.name in ['memory.html','book.html','poetry.html','gallery.html','achive.html','testimonials.html','interviewphoto.html','family.html','literary-archive.html','review.html','interviewvideo.html'] else 'WebPage'
  page={'@type':kind,'@id':url+'#webpage','url':url,'name':title,'description':d.meta['description'],'inLanguage':'en','isPartOf':{'@id':website['@id']},'about':{'@id':person['@id']},'primaryImageOfPage':{'@type':'ImageObject','url':d.meta['og:image']}}
  graph=[website,person,page]
  if p.name=='about.html':page['mainEntity']={'@id':person['@id']}
  if article:
   item={'@type':'Article','@id':url+'#article','headline':title,'description':d.meta['description'],'author':{'@id':person['@id']},'publisher':{'@id':person['@id']},'image':[d.meta['og:image']],'inLanguage':'en','mainEntityOfPage':{'@id':page['@id']},'isPartOf':{'@id':ORIGIN+'/memory.html#webpage'}}
   page['mainEntity']={'@id':item['@id']};graph.append(item)
  if p.name!='index.html':
   crumbs=[{'@type':'ListItem','position':1,'name':'Home','item':ORIGIN+'/'}]
   if article:crumbs.append({'@type':'ListItem','position':2,'name':'Missing Memories','item':ORIGIN+'/memory.html'})
   crumbs.append({'@type':'ListItem','position':len(crumbs)+1,'name':title,'item':url})
   crumb={'@type':'BreadcrumbList','@id':url+'#breadcrumbs','itemListElement':crumbs};graph.append(crumb);page['breadcrumb']={'@id':crumb['@id']}
  raw=raw.replace('</head>',tag_json({'@context':'https://schema.org','@graph':graph})+'</head>',1)
  entries.append({'title':title,'url':url,'article':article})
 p.write_text(raw)
namespace='http://www.sitemaps.org/schemas/sitemap/0.9';ET.register_namespace('',namespace)
sitemap=ET.Element('{'+namespace+'}urlset')
for entry in entries:ET.SubElement(ET.SubElement(sitemap,'{'+namespace+'}url'),'{'+namespace+'}loc').text=entry['url']
ET.indent(sitemap);ET.ElementTree(sitemap).write(SOURCE/'sitemap.xml',encoding='utf-8',xml_declaration=True)
(SOURCE/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: '+ORIGIN+'/sitemap.xml\n')
lines=['# Pradeep Biswal','','> Poetry, books, memoirs and photographs from Pradeep Biswal, a poet writing in Odia and English, translator, and editor of Kabita Live.','','The linked HTML pages are the canonical sources. Article text is available without JavaScript. Reader comments are moderated visitor contributions, separate from the author’s writing.','','## Main pages','']
lines += [f'- [{x["title"]}]({x["url"]})' for x in entries if not x['article']]
lines += ['','## Missing Memories — articles','']
lines += [f'- [{x["title"]}]({x["url"]})' for x in entries if x['article']]
(SOURCE/'llms.txt').write_text('\n'.join(lines)+'\n')
print(f'Prepared {len(entries)} indexable pages; excluded {len(EXCLUDE)} utility or unfinished pages. No publication dates invented.')

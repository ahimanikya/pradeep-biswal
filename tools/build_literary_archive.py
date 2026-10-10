"""Build a light, static source directory without republishing third-party works."""
from pathlib import Path
from html import escape as e
import json,re,shutil,csv
R=Path(__file__).resolve().parents[1];D=R/'dist'
data=json.loads((R/'archive/research/catalog.json').read_text());rows=data['records']
with (R/'archive/research/catalog.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=['id','category','title','publisher','credit','date','url','note','topic','format','evidence'],extrasaction='ignore',lineterminator='\n');w.writeheader();w.writerows(rows)
arrow='<span aria-hidden="true">↗</span>'
nav='<nav class="collection-links" aria-label="Archive collections"><a href="literary-archive.html">All publications</a><a href="interviewvideo.html">Podcasts &amp; interviews</a><a href="review.html">Book reviews</a><a href="memory.html">Missing Memories</a></nav>'
def card(r):
 label=('Watch podcast' if r.get('format')=='Podcast' else 'Watch interview') if r['category']=='Video interviews' else 'Read report' if r['category']=='Conversation reports' else 'Read at source'
 from datetime import datetime
 date=datetime.strptime(r['date'],'%Y-%m-%d').strftime('%d %b %Y').lstrip('0') if len(r['date'])==10 else datetime.strptime(r['date'],'%Y-%m').strftime('%b %Y')
 meta=' · '.join(x for x in [r.get('display_publisher',r['publisher']),date,r.get('duration',''),r.get('format','')] if x)
 alt=''.join('<a class="archive-alternate" href="'+e(u,quote=True)+'" rel="noopener" target="_blank">Also published in '+('Words &amp; Worlds' if 'wordsandworlds' in u else 'Literary Vibes')+' '+arrow+'</a>' for u in r.get('alternate_urls',[]) if 'shalandi.in' not in u)
 return '<article class="archive-entry"><p class="archive-meta">'+e(meta)+'</p><h3><a href="'+e(r['url'],quote=True)+'" rel="noopener" target="_blank">'+e(r.get('display_title',r['title']))+'</a></h3><p class="archive-credit">'+e(r['credit'])+'</p><p>'+e(r['note'])+'</p><a class="text-link" href="'+e(r['url'],quote=True)+'" rel="noopener" target="_blank">'+label+' '+arrow+'</a>'+alt+'</article>'
cats=['Video interviews','Print interviews','Conversation reports','Book reviews','Published articles','Published poetry']
def group(cat):
 items=sorted([x for x in rows if x['category']==cat],key=lambda x:x['date'],reverse=True)
 return '<section class="literary-section" id="'+cat.lower().replace(' ','-')+'"><h2>'+e(cat)+'</h2><div class="archive-grid">'+''.join(map(card,items))+'</div></section>'
def page(file,title,intro,body):
 s=(D/'review.html').read_text().replace(' aria-current="page"','');s=re.sub(r'<main\b.*?</main>','<main class="wrap inner-page literary-archive" id="main" tabindex="-1"><div class="breadcrumb"><a href="index.html">Home</a> / '+e(title)+'</div><h1>'+e(title)+'</h1><p class="archive-intro">'+e(intro)+'</p>'+nav+body+'</main>',s,flags=re.S)
 s=re.sub(r'<title>.*?</title>','<title>'+e(title)+' · Pradeep Biswal</title>',s)
 for name,value in [('description',intro),('og:title',title+' · Pradeep Biswal'),('og:description',intro),('og:url','https://pb.kabitawithoutborders.org/'+file),('twitter:title',title+' · Pradeep Biswal'),('twitter:description',intro)]:
  s=re.sub(r'<meta\b(?=[^>]*(?:name|property)="'+re.escape(name)+r'")[^>]*>',lambda _,n=name,v=value:'<meta '+('property' if n.startswith('og:') else 'name')+'="'+n+'" content="'+e(v,quote=True)+'"/>',s)
 s=re.sub(r'<link\b(?=[^>]*rel="canonical")[^>]*>','<link rel="canonical" href="https://pb.kabitawithoutborders.org/'+file+'"/>',s)
 s=re.sub(r'<script\b[^>]*id="discovery-schema"[^>]*>.*?</script>','',s,flags=re.S)
 s=s.replace('aria-current="page" href="review.html"','href="review.html"')
 s=re.sub(r'<link[^>]*href="literary-archive.css[^>]*>','',s)
 s=s.replace('</head>','<link rel="stylesheet" href="literary-archive.css?v=20261010"/></head>')
 (D/file).write_text(s)
page('literary-archive.html','Words in the World','Interviews, essays, poems and readings of Pradeep Biswal’s books, gathered from their original publishers.', '<nav class="archive-jump" aria-label="Browse by form">'+''.join('<a href="#'+c.lower().replace(' ','-')+'">'+e(c)+'</a>' for c in cats)+'</nav>'+''.join(group(c) for c in cats)+'<p class="archive-note">A growing bibliography, researched 10 October 2026. Links open the original publication. Dates refer to publication or issue dates; the Aakhar report uses its upload month. <a href="data/literary-archive.csv" download>Download the catalogue</a>.</p>')
topics=['Literature','Finance','Tourism','Education & Governance']
def topic_group(topic):
 items=sorted([r for r in rows if r.get('topic')==topic and r['category']=='Video interviews'],key=lambda r:r['date'],reverse=True)
 slug=topic.lower().replace(' & ','-').replace(' ','-')
 return '<section class="literary-section" id="'+slug+'"><h2>'+e(topic)+'</h2><div class="archive-grid">'+''.join(map(card,items))+'</div></section>'
page('interviewvideo.html','Podcasts & Interviews','Conversations on literature, finance, tourism and public life. Choose a subject and listen at your own pace.',
 '<nav class="archive-jump" aria-label="Browse conversations by topic">'+''.join('<a href="#'+t.lower().replace(' & ','-').replace(' ','-')+'">'+e(t)+'</a>' for t in topics)+'</nav>'+''.join(topic_group(t) for t in topics)+group('Print interviews')+group('Conversation reports')+'<p class="archive-note">Episodes open on the original publisher’s channel. <a href="interviewphoto.html">Interview photographs</a> · <a href="video.html">Video gallery</a></p>')
page('review.html','Book Reviews','Readings of the poet’s books, with each reviewer’s voice and original publication credited.',group('Book reviews'))
(D/'data').mkdir(exist_ok=True);shutil.copyfile(R/'archive/research/catalog.csv',D/'data/literary-archive.csv')
# Related links keep the archive reachable without crowding the main navigation.
for name in ['memory.html','interviewphoto.html','video.html','about.html']:
 p=D/name;s=p.read_text()
 if 'href="literary-archive.html"' not in s:
  s=re.sub(r'(</h1>)',r'\1<nav class="collection-links" aria-label="Published work"><a href="literary-archive.html">Published work &amp; interviews</a></nav>',s,count=1)
 p.write_text(s)
# All full indexes get the same archive link; compact article menus remain consistent.
for p in D.rglob('*.html'):
 s=p.read_text(); marker='<nav aria-label="Complete website index">'
 if marker in s and '>Literary archive</a>' not in s:
  s=s.replace(marker,marker+'<a href="'+('../' if p.parent.name=='memories' else '')+'literary-archive.html">Literary archive</a>',1)
 p.write_text(s)
print('Built archive of',len(rows),'records; interviews and reviews pages populated.')

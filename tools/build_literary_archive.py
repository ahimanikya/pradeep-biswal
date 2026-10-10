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
def video_player(r):
 if r['category'] not in ['Video interviews','Author readings']:return ''
 match=re.fullmatch(r'https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]{11})',r['url'])
 if not match:return ''
 title=e(r.get('display_title',r['title']),quote=True)
 return '<div class="episode-player" data-video-id="'+match[1]+'" data-video-title="'+title+'" hidden><button class="episode-play" type="button" aria-label="Play '+title+'"><img class="episode-thumbnail" src="assets/video-previews/'+match[1]+'.webp" alt="" width="480" height="360" loading="lazy" decoding="async"/><svg aria-hidden="true" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="32" cy="32" r="28"/><path d="m26 20 19 12-19 12Z"/></svg><span>'+('Play reading' if r['category']=='Author readings' else 'Play episode')+'</span><small>Watch here · YouTube</small></button></div>'
def card(r):
 label='Watch reading' if r['category']=='Author readings' else ('Watch podcast' if r.get('format')=='Podcast' else 'Watch interview') if r['category']=='Video interviews' else 'Read report' if r['category']=='Conversation reports' else 'Read at source'
 from datetime import datetime
 date=datetime.strptime(r['date'],'%Y-%m-%d').strftime('%d %b %Y').lstrip('0') if len(r['date'])==10 else datetime.strptime(r['date'],'%Y-%m').strftime('%b %Y') if r['date'] else ''
 meta=' · '.join(x for x in [r.get('display_publisher',r['publisher']),date,r.get('duration',''),r.get('format','')] if x)
 alt=''.join('<a class="archive-alternate" href="'+e(u,quote=True)+'" rel="noopener" target="_blank">Also published in '+('Words &amp; Worlds' if 'wordsandworlds' in u else 'Literary Vibes')+' '+arrow+'</a>' for u in r.get('alternate_urls',[]) if 'shalandi.in' not in u)
 return '<article class="archive-entry" id="'+e(r['id'],quote=True)+'">'+video_player(r)+'<p class="archive-meta">'+e(meta)+'</p><h3><a href="'+e(r['url'],quote=True)+'" rel="noopener" target="_blank">'+e(r.get('display_title',r['title']))+'</a></h3><p class="archive-credit">'+e(r['credit'])+'</p><p>'+e(r['note'])+'</p><a class="text-link" href="'+e(r['url'],quote=True)+'" rel="noopener" target="_blank">'+label+' '+arrow+'</a>'+alt+'</article>'
cats=['Author readings','Video interviews','Print interviews','Conversation reports','Book reviews','Published articles','Published poetry']
def group(cat):
 items=sorted([x for x in rows if x['category']==cat],key=lambda x:x['date'],reverse=True)
 return '<section class="literary-section" id="'+cat.lower().replace(' ','-')+'"><h2>'+e(cat)+'</h2><div class="archive-grid">'+''.join(map(card,items))+'</div></section>'
def page(file,title,intro,body):
 s=(D/'review.html').read_text().replace(' aria-current="page"','');s=re.sub(r'<main\b.*?</main>','<main class="wrap inner-page literary-archive" id="main" tabindex="-1"><div class="breadcrumb"><a href="index.html">Home</a> / '+e(title)+'</div><h1>'+e(title)+'</h1><p class="archive-intro">'+e(intro)+'</p>'+nav+body+'</main>',s,flags=re.S)
 if file=='literary-archive.html':
  s=re.sub(r'(<nav\b[^>]*aria-label="Main navigation".*?)(<a href="literary-archive.html")',r'\1<a aria-current="page" href="literary-archive.html"',s,count=1,flags=re.S)
 s=re.sub(r'<title>.*?</title>','<title>'+e(title)+' · Pradeep Biswal</title>',s)
 for name,value in [('description',intro),('og:title',title+' · Pradeep Biswal'),('og:description',intro),('og:url','https://pb.kabitawithoutborders.org/'+file),('twitter:title',title+' · Pradeep Biswal'),('twitter:description',intro)]:
  s=re.sub(r'<meta\b(?=[^>]*(?:name|property)="'+re.escape(name)+r'")[^>]*>',lambda _,n=name,v=value:'<meta '+('property' if n.startswith('og:') else 'name')+'="'+n+'" content="'+e(v,quote=True)+'"/>',s)
 s=re.sub(r'<link\b(?=[^>]*rel="canonical")[^>]*>','<link rel="canonical" href="https://pb.kabitawithoutborders.org/'+file+'"/>',s)
 s=re.sub(r'<script\b[^>]*id="discovery-schema"[^>]*>.*?</script>','',s,flags=re.S)
 s=s.replace('aria-current="page" href="review.html"','href="review.html"')
 s=re.sub(r'<link[^>]*href="literary-archive.css[^>]*>','',s)
 s=re.sub(r'<script[^>]*src="episode-player.js[^>]*></script>','',s)
 if 'data-video-id=' in body:s=s.replace('</body>','<script src="episode-player.js?v=20261010" defer></script></body>')
 s=s.replace('</head>','<link rel="stylesheet" href="literary-archive.css?v=20261010-previews"/></head>')
 (D/file).write_text(s)
page('literary-archive.html','Words in the World','Interviews, essays, poems and readings of Pradeep Biswal’s books, gathered from their original publishers.', '<nav class="archive-jump" aria-label="Browse by form">'+''.join('<a href="#'+c.lower().replace(' ','-')+'">'+e(c)+'</a>' for c in cats)+'</nav>'+''.join(group(c) for c in cats)+'<p class="archive-note">A growing bibliography, researched 10 October 2026. Videos play here; source links open the original publication. Dates refer to publication or issue dates; the Aakhar report uses its upload month. <a href="data/literary-archive.csv" download>Download the catalogue</a>.</p>')
topics=['Literature','Finance','Tourism','Education & Governance']
def topic_group(topic):
 items=sorted([r for r in rows if r.get('topic')==topic and r['category']=='Video interviews'],key=lambda r:r['date'],reverse=True)
 slug=topic.lower().replace(' & ','-').replace(' ','-')
 return '<section class="literary-section" id="'+slug+'"><h2>'+e(topic)+'</h2><div class="archive-grid">'+''.join(map(card,items))+'</div></section>'
page('interviewvideo.html','Podcasts & Interviews','Conversations on literature, finance, tourism and public life. Choose a subject and listen at your own pace.',
 '<nav class="archive-jump" aria-label="Browse conversations by topic">'+''.join('<a href="#'+t.lower().replace(' & ','-').replace(' ','-')+'">'+e(t)+'</a>' for t in topics)+'</nav>'+''.join(topic_group(t) for t in topics)+group('Print interviews')+group('Conversation reports')+'<p class="archive-note">Play an episode here, or open it on the publisher’s channel. <a href="interviewphoto.html">Interview photographs</a> · <a href="video.html">Video gallery</a></p>')
def reviews_by_book():
 books=[('Rendezvous with Dreams','rendezvous-with-dreams','rendezvous-with-dreams'),('A House Within','a-house-within','book-5'),('Pilgrimage to Ayodhya','pilgrimage-to-ayodhya','book-3')]
 out='<nav class="archive-jump" aria-label="Reviews by book">'+''.join('<a href="#'+slug+'">'+title+'</a>' for title,slug,_ in books)+'</nav>'
 for title,slug,book_id in books:
  items=[r for r in rows if r['category']=='Book reviews' and title in r.get('book','')]
  out+='<section class="literary-section" id="'+slug+'"><h2>'+title+'</h2><a class="text-link" href="book.html#'+book_id+'">View book &amp; buying options '+arrow+'</a><div class="archive-grid">'+''.join(card(r).replace('id="'+r['id']+'"','id="'+r['id']+'-'+slug+'"') for r in sorted(items,key=lambda r:r['date'],reverse=True))+'</div></section>'
 return out
page('review.html','Book Reviews','Readings of the poet’s books, with each reviewer’s voice and original publication credited.',reviews_by_book())
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
 if marker in s and '>Published Work</a>' not in s:
  s=s.replace(marker,marker+'<a href="'+('../' if p.parent.name=='memories' else '')+'literary-archive.html">Published Work</a>',1)
 p.write_text(s)
print('Built archive of',len(rows),'records; interviews and reviews pages populated.')

p=D/'poetry.html';s=p.read_text()
s=re.sub(r'<section class="poet-voice".*?</section>','',s,flags=re.S)
voice='<section class="poet-voice" id="poet-voice"><h2>In the Poet’s Voice</h2><p>Poems read by Pradeep Biswal. From ABC Diaries’ Aliva Smruti series.</p><div class="archive-grid">'+''.join(card(r) for r in rows if r['category']=='Author readings')+'</div></section>'
s=s.replace('</main>',voice+'</main>')
if 'src="episode-player.js' not in s:s=s.replace('</body>','<script src="episode-player.js?v=20261010" defer></script></body>')
if 'href="literary-archive.css' not in s:s=s.replace('</head>','<link rel="stylesheet" href="literary-archive.css?v=20261010-readings"/></head>')
if 'href="#poet-voice"' not in s:s=re.sub(r'(</h1>)',r'\1<p><a class="text-link" href="#poet-voice">Listen to the poet <span aria-hidden="true">↓</span></a></p>',s,count=1)
p.write_text(s)

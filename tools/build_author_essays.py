"""Build author-supplied essays without inventing original publication details."""
from pathlib import Path
from html import escape
import json,re
R=Path(__file__).resolve().parents[1]; D=R/'dist'
origin='https://'+(D/'CNAME').read_text().strip()
rows=json.loads((R/'archive/research/author-supplied-essays.json').read_text())
template=(D/'about.html').read_text()
for row in rows:
 title=row['title'];name='essay-'+row['id']+'.html';url=origin+'/'+name
 desc=title+' — an essay by Pradeep Biswal.'
 s=template.replace(' aria-current="page"','')
 s=re.sub(r'<body\b[^>]*>','<body class="page-memory-article">',s)
 s=re.sub(r'<title>.*?</title>','<title>'+escape(title)+' · Pradeep Biswal</title>',s)
 for key,value in [('description',desc),('og:title',title+' · Pradeep Biswal'),('og:description',desc),('og:url',url),('og:type','article'),('twitter:title',title+' · Pradeep Biswal'),('twitter:description',desc)]:
  s=re.sub(r'<meta\b(?=[^>]*(?:name|property)="'+re.escape(key)+r'")[^>]*>',lambda _,k=key,v=value:'<meta '+('property' if k.startswith('og:') else 'name')+'="'+k+'" content="'+escape(v,quote=True)+'"/>',s)
 s=re.sub(r'<link\b(?=[^>]*rel="canonical")[^>]*>','<link rel="canonical" href="'+url+'"/>',s)
 s=re.sub(r'<script\b[^>]*id="discovery-schema"[^>]*>.*?</script>','',s,flags=re.S)
 body=''.join('<p>'+escape(p).replace('\n','<br/>')+'</p>' for p in re.split(r'\n\s*\n',row['text']) if p.strip())
 main='<main class="wrap inner-page" id="main" tabindex="-1"><article class="memory-story"><header class="memory-story-heading"><a class="memory-back" href="literary-archive.html#author-supplied-essays">← Author-supplied essays</a><h1>'+escape(title)+'</h1><p class="memory-byline">Pradeep Biswal</p><p class="archive-meta">Author-supplied essay · Original publication details not confirmed</p></header><div class="memory-story-copy">'+body+'</div><p class="memory-back"><a href="literary-archive.html#author-supplied-essays">Browse more essays →</a></p></article></main>'
 s=re.sub(r'<main\b.*?</main>',lambda _:main,s,flags=re.S)
 s=re.sub(r'<footer\b.*?</footer>',lambda _:(R/'templates/article-footer.html').read_text().strip(),s,flags=re.S)
 s=s.replace('styles.css?v=20261010-simple-comments','styles.css?v=20261015-simple-footer')
 (D/name).write_text(s)
print('Built',len(rows),'author-supplied essay pages.')

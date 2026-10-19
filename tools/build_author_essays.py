"""Build author-supplied essays without inventing original publication details."""
from pathlib import Path
from html import escape
import json,re,argparse
R=Path(__file__).resolve().parents[1]; D=R/'dist'
origin='https://'+(D/'CNAME').read_text().strip()
rows=json.loads((R/'archive/research/author-supplied-essays.json').read_text())
parser=argparse.ArgumentParser();parser.add_argument('--id');args=parser.parse_args()
if args.id:
 rows=[row for row in rows if row['id']==args.id]
 if not rows:parser.error('Unknown essay id')
template=(D/'about.html').read_text()
actions=(R/'templates/essay-actions.html').read_text().strip()
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
 image=row.get('image');figure=''
 if image:
  from PIL import Image
  width,height=Image.open(D/image).size
  credit=escape(row['image_credit'])
  if row.get('image_source'):
   credit='<a href="'+escape(row['image_source'],quote=True)+'">'+credit+'</a> · <a href="'+row['image_license']+'">CC BY 4.0</a> · Resized for display'
  figure='<figure class="essay-art"><img src="'+image+'" alt="'+escape(row['image_alt'],quote=True)+'" width="'+str(width)+'" height="'+str(height)+'" fetchpriority="high"/><figcaption>'+credit+'</figcaption></figure>'
  social=origin+'/assets/sharing/'+Path(image).stem+'.jpg'
  for key,value in [('og:image',social),('og:image:secure_url',social),('twitter:image',social),('og:image:alt',row['image_alt']),('twitter:image:alt',row['image_alt']),('og:image:width',str(width)),('og:image:height',str(height))]:
   s=re.sub(r'<meta\b(?=[^>]*(?:name|property)="'+re.escape(key)+r'")[^>]*>',lambda _,k=key,v=value:'<meta '+('property' if k.startswith('og:') else 'name')+'="'+k+'" content="'+escape(v,quote=True)+'"/>',s)
 s=s.replace('</head>','<link rel="stylesheet" href="essay-art.css?v=20261019-context"/></head>')
 context='<aside class="essay-context" aria-label="Editorial context"><p><strong>Editorial note.</strong> '+escape(row['editorial_note'])+'</p></aside>' if row.get('editorial_note') else ''
 blocks=row.get('blocks') or [{'tag':'p','text':p} for p in re.split(r'\n\s*\n',row['text']) if p.strip()]
 body=''
 in_list=False
 for block in blocks:
  text=block['text'];bullet=text.startswith('• ')
  if in_list and not bullet:body+='</ul>';in_list=False
  if bullet:
   if not in_list:body+='<ul>';in_list=True
   body+='<li>'+escape(text[2:])+'</li>'
  else:
   tag='h2' if block.get('tag','').startswith('h') else 'p'
   body+='<'+tag+'>'+escape(text).replace('\n','<br/>')+'</'+tag+'>'
 if in_list:body+='</ul>'
 main='<main class="wrap inner-page" id="main" tabindex="-1"><article class="memory-story"><header class="memory-story-heading"><a class="memory-back" href="literary-archive.html#author-supplied-essays">← Author-supplied essays</a><h1>'+escape(title)+'</h1><p class="memory-byline">Pradeep Biswal</p><p class="archive-meta">Author-supplied essay · Original publication details not confirmed</p></header>'+figure+context+actions+'<div class="memory-story-copy">'+body+'</div><p class="memory-back"><a href="literary-archive.html#author-supplied-essays">Browse more essays →</a></p></article></main>'
 s=re.sub(r'<main\b.*?</main>',lambda _:main,s,flags=re.S)
 routes=json.loads((D/'book-routes.json').read_text())
 if row['id'] in routes:
  link='<a class="text-link book-reader-link" href="'+escape(routes[row['id']],quote=True)+'">Read in book <span aria-hidden="true">↗</span></a>'
  s=s.replace('</h1>','</h1>'+link,1)
  if 'book-entry.css' not in s:s=s.replace('</head>','<link rel="stylesheet" href="book-entry.css?v=20261017-sources"/></head>')
 s=re.sub(r'<footer\b.*?</footer>',lambda _:(R/'templates/article-footer.html').read_text().strip(),s,flags=re.S)
 s=s.replace('styles.css?v=20261010-simple-comments','styles.css?v=20261015-simple-footer')
 s=s.replace('app.js?v=20261010-release-review','app.js?v=20261019-essay-sharing')
 (D/name).write_text(s)
print('Built',len(rows),'author-supplied essay pages.')

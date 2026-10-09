"""Update static social metadata; reuse existing artwork without cropping or regeneration.
Requires beautifulsoup4 and Pillow. Run from the repository root.
"""
from pathlib import Path
from urllib.parse import urlsplit
from html import escape
import json, re
from bs4 import BeautifulSoup
from PIL import Image
ROOT = Path('dist')
ORIGIN = 'https://pb.kabitawithoutborders.org'
portrait = ('assets/pradeep-biswal-800.webp', 'Watercolor portrait of Pradeep Biswal')
radio = ('assets/radio-memory-960.webp', 'A family listening together to an old wooden radio')
reading = ('assets/reading-table-960.webp', 'Watercolor of an open book on a wooden table')
choices = {
 'index': portrait, 'about': portrait, 'contact': portrait, 'credits': portrait,
 'moderation': portrait, 'testimonials': portrait, 'video': portrait, 'interviewvideo': portrait, '404': portrait,
 'memory': radio, 'book': reading, 'review': reading, 'poetry': reading,
 'note': portrait,
 'gallery': ('assets/source-thumbs/034bbbebd1d64829.webp', 'Audience at a literary gathering in a bookshop'),
 'family': ('assets/source-thumbs/2388fd282d7d15f2.webp', 'Pradeep Biswal and a woman beneath a framed Jagannath artwork'),
 'achive': ('assets/source-thumbs/2d709601008817c2.webp', 'Certificate presentation at a RERA seminar'),
 'interviewphoto': ('assets/source-thumbs/f7ac04c319ed0ad3.webp', 'Odia newspaper clipping featuring a book cover'),
}
(ROOT/'assets/sharing').mkdir(exist_ok=True)
manifest = []
for path in sorted(ROOT.rglob('*.html')):
 raw = path.read_text()
 soup = BeautifulSoup(raw, 'html.parser')
 if path.parent.name == 'memories':
  img = soup.select_one('main img')
  source = (path.parent / img['src']).resolve().relative_to(ROOT.resolve()).as_posix()
  alt = img.get('alt') or soup.h1.get_text(' ',strip=True)
 else:
  source, alt = choices[path.stem]
 target = ROOT/'assets/sharing'/f'{Path(source).stem}.jpg'
 im = Image.open(ROOT/source).convert('RGB')
 im.save(target, 'JPEG', quality=88, optimize=True)
 image_url = ORIGIN + '/' + target.relative_to(ROOT).as_posix()
 canonical = ORIGIN + ('/' if path.name == 'index.html' else '/' + path.relative_to(ROOT).as_posix())
 title = soup.title.get_text(' ', strip=True)
 desc_tag = soup.find('meta', attrs={'name':'description'})
 desc = desc_tag['content'] if desc_tag else title
 head = soup.head
 for tag in list(head.find_all(['meta','link'])):
  if tag.get('property','').startswith('og:') or tag.get('name','').startswith('twitter:') or 'canonical' in tag.get('rel',[]):
   tag.decompose()
 data = {'og:type': 'article' if path.parent.name=='memories' else 'website', 'og:title': title, 'og:description': desc, 'og:url':canonical, 'og:site_name':'Pradeep Biswal', 'og:image':image_url, 'og:image:secure_url':image_url, 'og:image:type':'image/jpeg', 'og:image:width':str(im.width), 'og:image:height':str(im.height), 'og:image:alt':alt, 'twitter:card':'summary_large_image', 'twitter:title':title, 'twitter:description':desc, 'twitter:image':image_url, 'twitter:image:alt':alt}
 for key,value in data.items():
  tag=soup.new_tag('meta');tag['name' if key.startswith('twitter:') else 'property']=key;tag['content']=value;head.append(tag)
 tag=soup.new_tag('link',rel='canonical',href=canonical);head.append(tag)
 # Replace only head, preserving every authored body byte.
 new = re.sub(r'<head\b[^>]*>.*?</head>', lambda _:str(head), raw, count=1, flags=re.S)
 path.write_text(new)
 manifest.append({'page':path.relative_to(ROOT).as_posix(),'image':target.relative_to(ROOT).as_posix(),'source':source,'width':im.width,'height':im.height})
Path('tools/sharing-images.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Prepared sharing metadata for {len(manifest)} pages; {len(set(x["image"] for x in manifest))} JPEG images.')

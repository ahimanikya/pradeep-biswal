"""Build the reader index from unchanged memories and authorized publisher copies."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape, unescape
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
import json, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ARCHIVE = ROOT / 'archive/reader'

class ArticleParser(HTMLParser):
    allowed = {'p','h2','h3','h4','blockquote','ul','ol','li','strong','em','b','i','a','br','table','thead','tbody','tr','th','td','sup','sub'}
    void = {'br','hr','img','input','meta','link','source','wbr'}
    def __init__(self, url):
        super().__init__(convert_charrefs=True)
        self.url=url; self.stack=[]; self.active=False; self.done=False
        self.parts=[]; self.meta={}; self.byline=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='meta': self.meta[a.get('property',a.get('name',''))]=a.get('content','')
        if self.done: return
        if not self.active:
            if 'content-inner' in a.get('class','').split(): self.active=True
            else: return
        skip=(self.stack[-1][1] if self.stack else False) or tag in {'script','style','iframe','form'} or any(x in a.get('class','') for x in ['jeg_ad','ads-','related','sharedaddy','jp-related'])
        if tag not in self.void: self.stack.append((tag,skip))
        if not skip and tag in self.allowed:
            attr=''
            if tag=='a' and a.get('href'):
                href=urljoin(self.url,a['href'])
                if urlsplit(href).scheme in ('https','http'): attr=' href="'+escape(href,quote=True)+'"'
            self.parts.append('<'+tag+attr+'>')
    def handle_endtag(self, tag):
        if not self.active or self.done or not self.stack:return
        if tag in self.void:return
        if tag not in [t for t,s in self.stack]:return
        skip=self.stack[-1][1]
        while self.stack:
            t,s=self.stack.pop()
            if t==tag:break
        if not skip and tag in self.allowed:self.parts.append('</'+tag+'>')
        if not self.stack:self.done=True;self.active=False
    def handle_data(self,data):
        if self.active and self.stack and not self.stack[-1][1]:self.parts.append(escape(data))

def parse_odishaplus(raw):
    """Use the visible author byline, not the publisher CMS account metadata."""
    from lxml import html
    root=html.fromstring(raw)
    content=root.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," td-post-content ")]')[0]
    assert 'Pradeep Kumar Biswal' in content.xpath('./h3')[0].text_content()
    paragraphs=content.xpath('./p')
    assert paragraphs[0].text_content().startswith('In contemporary Odia poetry')
    assert paragraphs[-1].text_content().startswith('(Pradeep Kumar Biswal,')
    return ''.join('<p>'+escape(p.text_content().strip())+'</p>' for p in paragraphs)


def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45) as response:return response.read()

def main():
    ARCHIVE.mkdir(exist_ok=True)
    records=json.loads((ARCHIVE/'entries.json').read_text())
    images=DIST/'assets/published-articles';images.mkdir(exist_ok=True)
    copies=DIST/'reader-text';copies.mkdir(exist_ok=True)
    for r in records:
        if r['group']=='Author manuscripts':
            (copies/(r['id']+'.json')).write_text(json.dumps({'html':r['html']},ensure_ascii=False)+'\n')
            continue
        if r['group']=='Memories':
            source=(DIST/r['url']).read_text()
            banner=re.search(r'<img[^>]+class="memory-banner"[^>]*>',source).group()
            r['image']=re.search(r' src="([^"]+)"',banner).group(1).removeprefix('../')
            r['alt']=unescape(re.search(r' alt="([^"]*)"',banner).group(1))
            if r['id']=='the-golden-days':
                r['image']='img1/t24.png'
                r['alt']='Vyasanagar College, where Pradeep Biswal studied — original photograph.'
            continue
        raw=ARCHIVE/(r['id']+'.html')
        if not raw.exists():raw.write_bytes(fetch(r['url']))
        if r.get('publisher')=='OdishaPlus':
            body=parse_odishaplus(raw.read_text())
            (copies/(r['id']+'.json')).write_text(json.dumps({'html':body},ensure_ascii=False)+'\n')
            assert re.sub(r'\s+','',unescape(re.sub('<[^>]+>',' ',body)))==re.sub(r'\s+','',r['text'])
            continue
        p=ArticleParser(r['url']);p.feed(raw.read_text())
        body=''.join(p.parts).strip()
        plain=unescape(re.sub('<[^>]+>',' ',body))
        assert len(plain)>1500 and p.done, f'Incomplete article: {r["title"]}'
        assert p.meta.get('author')=='Pradeep Biswal',f'Check author: {r["title"]}'
        (copies/(r['id']+'.json')).write_text(json.dumps({'html':body},ensure_ascii=False)+'\n')
        r['textUrl']='reader-text/'+r['id']+'.json'
        r['text']=plain;r['html']=body
        r['rights']='Full-text use authorized by site owner on 2026-10-14, confirming writer ownership.'
        r['sourceSha256']=hashlib.sha256(raw.read_bytes()).hexdigest()
        r['sourceImage']=p.meta.get('og:image','')
        if r['sourceImage']:
            ext=Path(urlsplit(r['sourceImage']).path).suffix.lower()
            assert ext in {'.jpg','.jpeg','.png','.webp','.avif'},ext
            image=images/(r['id']+ext)
            if not image.exists():image.write_bytes(fetch(r['sourceImage']))
            r['image']=image.relative_to(DIST).as_posix()
            r['alt']='Publisher illustration for '+r['title']
        print(r['id'],len(plain.split()),'words',flush=True)
    assert len(records)==61
    hashes=[hashlib.sha256(re.sub(r'\s+',' ',r['text']).strip().encode()).hexdigest() for r in records]
    assert len(hashes)==len(set(hashes)),'Exact duplicate article found'
    (ARCHIVE/'entries.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    public=[{k:v for k,v in r.items() if k not in {'html','text','rights','sourceSha256','extractionNote'}} for r in records]
    lookup={r['id']:r for r in public};public=[]
    for part in json.loads((ARCHIVE/'book-structure.json').read_text()):
        for id in part['ids']:
            item=lookup.pop(id);item['theme']=part['theme'];public.append(item)
    assert not lookup
    (DIST/'collection-reader.json').write_text(json.dumps(public,ensure_ascii=False,indent=2)+'\n')
    (DIST/'collection-reader-text.json').write_text(json.dumps({r['id']:r['html'] for r in records},ensure_ascii=False,separators=(',',':'))+'\n')
    # Keep the no-script index and preview count in step with the interactive book.
    from html import escape
    page=DIST/'reading-room.html'
    markup=page.read_text()
    items=''.join('<li id="'+escape(r['id'],quote=True)+'"><a href="'+escape(r['url'],quote=True)+'">'+escape(r['title'])+'</a></li>' for r in public)
    markup=re.sub(r'<ol>.*?</ol>','<ol>'+items+'</ol>',markup,count=1,flags=re.S)
    markup=re.sub(r'Reader preview · \d+ articles','Reader preview · '+str(len(public))+' articles',markup)
    page.write_text(markup)


if __name__=='__main__':main()

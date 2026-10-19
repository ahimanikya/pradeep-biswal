"""Guard book membership, legacy routing and separate reader packages."""
import unittest,json,re
from pathlib import Path
from html.parser import HTMLParser
D=Path(__file__).resolve().parents[2]/'dist'
class TwoBookTests(unittest.TestCase):
 def test_each_book_has_one_complete_sequence_and_its_own_cover(self):
  ids=[];covers=[]
  for book,page,count in [('missing-memories','reading-room.html',52),('odisha-at-the-crossroads','odisha-at-the-crossroads.html',44)]:
   raw=(D/page).read_text();cfg=json.loads(re.search(r'<script type="application/json" id="book-config">(.*?)</script>',raw,re.S)[1])
   self.assertEqual(cfg['id'],book);self.assertEqual(cfg['page'],page)
   entries=json.loads((D/cfg['contentsUrl']).read_text());texts=json.loads((D/cfg['textUrl']).read_text());chapters=[r for r in entries if 'chapter' in r]
   self.assertEqual([r['chapter'] for r in chapters],list(range(1,count+1)))
   self.assertEqual(set(texts),{r['id'] for r in chapters});ids.extend(texts)
   self.assertEqual(sum(r.get('sectionOpening',False) for r in entries),8)
   self.assertEqual(entries[0]['id'],'title-page')
   self.assertTrue(entries[0]['titlePage'])
   self.assertIn('Ahimanikya Satapathy',entries[0]['html'])
   self.assertEqual(entries[1]['id'],'introduction')
   self.assertIn('Editing, Introduction & Cover Design',cfg['covers'][1]['description'])
   self.assertIn('noindex,follow',raw)
   for cover in cfg['covers']:
    covers.append(cover['image']);self.assertTrue((D/cover['image']).is_file());self.assertIn(cfg['title'],cover['alt'])
   for r in entries:
    if r.get('image'):self.assertTrue((D/r['image']).is_file(),r['id'])
    if r.get('closingArt'):
     path=D/r['closingArt'];self.assertTrue(path.is_file(),r['id'])
     self.assertEqual(path.suffix,'.svg');self.assertLess(path.stat().st_size,16000)
    if r.get('srcset'):
     for src in r['srcset'].split(','):self.assertTrue((D/src.strip().split()[0]).is_file(),src)
   self.assertIn(cfg['covers'][0]['image'].replace('.webp','-sharing.jpg'),raw)
  self.assertEqual(len(ids),96);self.assertEqual(len(set(ids)),96);self.assertEqual(len(set(covers)),4)
  self.assertNotIn('PBW-c2d6ad005c',ids)
 def test_approved_reforms_essay_keeps_original_paragraphs_and_placement(self):
  ident='indias-economic-reforms-a-decade-of-change'
  supplied=json.loads((D.parent/'archive/research/author-supplied-essays.json').read_text())
  source=next(r for r in supplied if r['id']==ident)
  self.assertEqual(source['book_id'],'odisha-at-the-crossroads')
  chapters=[r for r in json.loads((D/'books/odisha-at-the-crossroads/contents.json').read_text()) if 'chapter' in r]
  self.assertEqual(chapters[20]['id'],ident)
  self.assertEqual(chapters[21]['id'],'PBW-6f0854748e')
  self.assertIsNone(chapters[20]['date'])
  self.assertIn('writing date has not yet been confirmed',chapters[20]['editorialNote'])
  raw=json.loads((D/'books/odisha-at-the-crossroads/text.json').read_text())[ident]
  class Paragraphs(HTMLParser):
   def __init__(self):super().__init__();self.paragraphs=[];self.inside=False
   def handle_starttag(self,tag,attrs):
    if tag=='p':self.paragraphs.append('');self.inside=True
   def handle_endtag(self,tag):
    if tag=='p':self.inside=False
   def handle_data(self,data):
    if self.inside:self.paragraphs[-1]+=data
  parser=Paragraphs();parser.feed(raw)
  self.assertEqual(parser.paragraphs,source['text'].split('\n\n'))
 def test_publication_credits_follow_each_books_policy(self):
  for book,page in [('missing-memories','reading-room.html'),('odisha-at-the-crossroads','odisha-at-the-crossroads.html')]:
   raw=(D/page).read_text();cfg=json.loads(re.search(r'<script type="application/json" id="book-config">(.*?)</script>',raw,re.S)[1])
   expected=book=='odisha-at-the-crossroads';self.assertEqual(cfg['showPublicationSources'],expected)
   chapters=[r for r in json.loads((D/cfg['contentsUrl']).read_text()) if 'chapter' in r]
   for chapter in chapters:
    for key in ['sourceLabel','publisher','date']:self.assertEqual(key in chapter,expected)
 def test_old_book_links_resolve_to_an_existing_chapter(self):
  routes=json.loads((D/'book-routes.json').read_text());old=json.loads((D/'collection-reader.json').read_text())
  for r in old:self.assertIn(r['id'],routes)
  for ident,target in routes.items():
   page,anchor=target.split('#');raw=(D/page).read_text();self.assertIn('id="'+anchor+'"',raw)
  self.assertTrue(routes['PBW-0c5f5a285d'].startswith('odisha-at-the-crossroads.html#'))
  self.assertEqual(routes['PBW-e5ffc390eb'],routes['twin-tower-demolition-key-takeaways'])
 def test_private_editorial_records_not_in_public_payload(self):
  for p in (D/'books').rglob('*.json'):
   raw=p.read_text()
   for private in ['original_sha256','edited_sha256','working_changes','author_question','/Users/ahimanikya','Decision or evidence needed']:
    self.assertNotIn(private,raw,p)
 def test_all_article_links_have_correct_membership(self):
  routes=json.loads((D/'book-routes.json').read_text())
  supplied=json.loads((D.parent/'archive/research/author-supplied-essays.json').read_text())
  website_only={r['id'] for r in supplied if r.get('book_status')=='website-only'}
  self.assertFalse(website_only & routes.keys(), 'Website-only essays must not silently enter a book')
  for p in [*(D/'memories').glob('*.html'),*D.glob('essay-*.html')]:
   ident=p.stem.removeprefix('essay-')
   if p.name.startswith('essay-') and ident in website_only:
    self.assertNotIn('Read in book',p.read_text(),p.name)
    self.assertIn('literary-archive.html#author-supplied-essays',p.read_text(),p.name)
    continue
   self.assertIn(ident,routes)
   self.assertIn(routes[ident],p.read_text(),p.name)
if __name__=='__main__':unittest.main()

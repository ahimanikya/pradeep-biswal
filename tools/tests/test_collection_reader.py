"""Protect article content, image reuse and safe publisher extraction."""
import unittest, json, re, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from prepare_collection_reader import ArticleParser, ROOT, DIST, parse_odishaplus

class CollectionReaderTests(unittest.TestCase):
    def test_collection_complete_and_existing_memories_unchanged(self):
        index=json.loads((DIST/'collection-reader.json').read_text())
        self.assertEqual(len(index),61)
        self.assertEqual(len({r['id'] for r in index}),61)
        memories=[r for r in index if r['group']=='Memories']
        self.assertEqual(len(memories),41)
        for r in index:
            self.assertTrue(r.get('image'),r['id'])
            self.assertTrue((DIST/r['image']).is_file(),r['id'])
        for r in memories:
            source=(DIST/r['url']).read_text()
            self.assertIn('src="../'+r['image']+'"',source)

    def test_all_imported_articles_retain_extracted_text(self):
        records=json.loads((ROOT/'archive/reader/entries.json').read_text())
        published=[r for r in records if r.get('publisher')=='OdishaBytes']
        self.assertEqual(len(published),16)
        for r in published:
            p=ArticleParser(r['url']);p.feed((ROOT/'archive/reader'/(r['id']+'.html')).read_text())
            body=json.loads((DIST/r['textUrl']).read_text())['html']
            self.assertEqual(body,''.join(p.parts).strip(),r['id'])
            self.assertGreater(len(re.sub('<[^>]+>',' ',body).split()),350)
            self.assertNotRegex(body,r'<(?:script|style|iframe|form)\b')
            self.assertIn('authorized',r['rights'])

    def test_new_article_and_theme_order(self):
        index=json.loads((DIST/'collection-reader.json').read_text())
        new=next(r for r in index if r.get('publisher')=='OdishaPlus')
        self.assertEqual(new['theme'],'Among Writers')
        self.assertEqual(next(r for r in index if r['id']=='dasia-aja-the-lighthouse')['theme'],'Radio and the Reading Life')
        self.assertEqual(json.loads((DIST/new['textUrl']).read_text())['html'],parse_odishaplus((ROOT/'archive/reader'/(new['id']+'.html')).read_text()))

    def test_continuous_book_has_every_full_article(self):
        records=json.loads((ROOT/'archive/reader/entries.json').read_text())
        book=json.loads((DIST/'collection-reader-text.json').read_text())
        index=json.loads((DIST/'collection-reader.json').read_text())
        self.assertEqual(set(book),{r['id'] for r in index})
        for record in records:
            self.assertEqual(book[record['id']],record['html'],record['id'])

    def test_fallback_index_matches_both_book_sequences(self):
        for book,page in [('missing-memories','reading-room.html'),('odisha-at-the-crossroads','odisha-at-the-crossroads.html')]:
            text=(DIST/page).read_text()
            entries=json.loads((DIST/'books'/book/'contents.json').read_text())
            count=sum('chapter' in entry for entry in entries)
            for entry in entries:self.assertIn('id="'+entry['id']+'"',text)
            self.assertIn(f'Working book preview · {count} chapters',text)

    def test_author_manuscripts_preserve_text(self):
        from html import unescape
        records=json.loads((ROOT/'archive/reader/entries.json').read_text())
        for record in records:
            if record['group']=='Author manuscripts' or record.get('sourceLabel')=='Author-supplied expanded manuscript':
                body=json.loads((DIST/record['textUrl']).read_text())['html']
                plain=unescape(re.sub('<[^>]+>',' ',body))
                self.assertEqual(re.sub(r'\s+','',plain),re.sub(r'\s+','',record['text']),record['id'])

    def test_extractor_excludes_ads_and_retains_article_formatting(self):
        p=ArticleParser('https://example.org/article')
        p.feed('<div class="content-inner"><p>A <em>small</em> story.</p><div class="jeg_ad"><script>bad()</script><p>Advert</p></div><h2>Next</h2><p><a href="/source" onclick="bad()">Source</a></p></div><p>Unrelated</p>')
        self.assertEqual(''.join(p.parts),'<p>A <em>small</em> story.</p><h2>Next</h2><p><a href="https://example.org/source">Source</a></p>')

if __name__=='__main__':unittest.main()

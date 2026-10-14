"""Protect article content, image reuse and safe publisher extraction."""
import unittest, json, re, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from prepare_collection_reader import ArticleParser, ROOT, DIST

class CollectionReaderTests(unittest.TestCase):
    def test_collection_complete_and_existing_memories_unchanged(self):
        index=json.loads((DIST/'collection-reader.json').read_text())
        self.assertEqual(len(index),57)
        self.assertEqual(len({r['id'] for r in index}),57)
        memories=[r for r in index if r['group']=='Memories']
        self.assertEqual(len(memories),41)
        for r in index:self.assertTrue((DIST/r['image']).is_file(),r['id'])
        for r in memories:
            source=(DIST/r['url']).read_text()
            self.assertIn('src="../'+r['image']+'"',source)

    def test_all_imported_articles_retain_extracted_text(self):
        records=json.loads((ROOT/'archive/reader/entries.json').read_text())
        published=[r for r in records if r['group']=='Published articles']
        self.assertEqual(len(published),16)
        for r in published:
            p=ArticleParser(r['url']);p.feed((ROOT/'archive/reader'/(r['id']+'.html')).read_text())
            body=json.loads((DIST/r['textUrl']).read_text())['html']
            self.assertEqual(body,''.join(p.parts).strip(),r['id'])
            self.assertGreater(len(re.sub('<[^>]+>',' ',body).split()),350)
            self.assertNotRegex(body,r'<(?:script|style|iframe|form)\b')
            self.assertIn('authorized',r['rights'])

    def test_extractor_excludes_ads_and_retains_article_formatting(self):
        p=ArticleParser('https://example.org/article')
        p.feed('<div class="content-inner"><p>A <em>small</em> story.</p><div class="jeg_ad"><script>bad()</script><p>Advert</p></div><h2>Next</h2><p><a href="/source" onclick="bad()">Source</a></p></div><p>Unrelated</p>')
        self.assertEqual(''.join(p.parts),'<p>A <em>small</em> story.</p><h2>Next</h2><p><a href="https://example.org/source">Source</a></p>')

if __name__=='__main__':unittest.main()

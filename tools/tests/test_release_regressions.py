"""Prevent withdrawn book readers from returning during content rebuilds."""
import unittest, tempfile, shutil, subprocess, sys, ast
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class ReleaseRegressions(unittest.TestCase):
 def test_sharing_generator_covers_every_top_level_page(self):
  tree=ast.parse((ROOT/'tools/prepare_sharing.py').read_text())
  choices=next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='choices' for t in n.targets))
  keys={ast.literal_eval(key) for key in choices.keys}
  self.assertFalse({p.stem for p in (ROOT/'dist').glob('*.html')}-keys)
 def test_discovery_rebuild_keeps_reader_preview_out_of_search(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'tools').mkdir();(root/'dist').mkdir()
   for name in ['prepare_discovery.py','audit_discovery.py']:
    shutil.copy(ROOT/'tools'/name,root/'tools'/name)
   shutil.copy(ROOT/'dist/CNAME',root/'dist/CNAME')
   for p in (ROOT/'dist').rglob('*.html'):
    target=root/'dist'/p.relative_to(ROOT/'dist');target.parent.mkdir(exist_ok=True,parents=True);shutil.copy(p,target)
   subprocess.run([sys.executable,str(root/'tools/prepare_discovery.py')],check=True,capture_output=True)
   subprocess.run([sys.executable,str(root/'tools/audit_discovery.py')],check=True,capture_output=True)
   self.assertNotIn('reading-room.html',(root/'dist/sitemap.xml').read_text())
   self.assertNotIn('odisha-at-the-crossroads.html',(root/'dist/sitemap.xml').read_text())
   self.assertNotIn('author-review.html',(root/'dist/sitemap.xml').read_text())
 def test_archive_rebuild_does_not_restore_book_readers(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'tools').mkdir()
   shutil.copy(ROOT/'tools/build_literary_archive.py',root/'tools/build_literary_archive.py')
   shutil.copytree(ROOT/'archive/research',root/'archive/research')
   (root/'dist').mkdir()
   for p in (ROOT/'dist').glob('*.html'):shutil.copy(p,root/'dist'/p.name)
   for name in ['CNAME']:shutil.copy(ROOT/'dist'/name,root/'dist'/name)
   subprocess.run([sys.executable,str(root/'tools/build_literary_archive.py')],check=True,capture_output=True)
   result=(root/'dist/literary-archive.html').read_text()
   for forbidden in ['reading-room.html','odisha-at-the-crossroads.html','Read in book','book.html#read-online']:
    self.assertNotIn(forbidden,result)
 def test_book_manuscripts_and_readers_are_not_deployed(self):
  for name in ['reading-room.html','odisha-at-the-crossroads.html','book-introduction.json','collection-reader.json','collection-reader-text.json','collection-reader.js','books/missing-memories/text.json','books/odisha-at-the-crossroads/text.json']:
   self.assertFalse((ROOT/'dist'/name).exists(),name)
  for folder in ['books','reader-text']:
   self.assertFalse(list((ROOT/'dist'/folder).rglob('*.json')))
  for p in (ROOT/'dist').rglob('*.html'):
   text=p.read_text()
   self.assertNotIn('#read-online',text,str(p))
   self.assertNotIn('Read the books',text,str(p))
   self.assertNotIn('reading-room.html',text,str(p))
   self.assertNotIn('odisha-at-the-crossroads.html',text,str(p))
if __name__=='__main__':unittest.main()

"""Guard the reader's review status and generated links across content rebuilds."""
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
 def test_archive_rebuild_retains_book_entry_points(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'tools').mkdir()
   shutil.copy(ROOT/'tools/build_literary_archive.py',root/'tools/build_literary_archive.py')
   shutil.copytree(ROOT/'archive/research',root/'archive/research')
   (root/'dist').mkdir()
   for p in (ROOT/'dist').glob('*.html'):shutil.copy(p,root/'dist'/p.name)
   for name in ['CNAME','collection-reader.json','book-routes.json']:shutil.copy(ROOT/'dist'/name,root/'dist'/name)
   subprocess.run([sys.executable,str(root/'tools/build_literary_archive.py')],check=True,capture_output=True)
   result=(root/'dist/literary-archive.html').read_text()
   self.assertIn('reading-room.html#PBW-b00c33a819',result)
   self.assertIn('book.html#read-online',result)
   self.assertIn('odisha-at-the-crossroads.html#PBW-0c5f5a285d',result)
   self.assertGreater(result.count('Read in book'),16)
if __name__=='__main__':unittest.main()

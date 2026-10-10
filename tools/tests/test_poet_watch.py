import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('watch',Path(__file__).parents[1]/'watch_poet_updates.py')
w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)

class PoetWatchTests(unittest.TestCase):
    def setUp(self):
        self.config={'aliases':['Pradeep Biswal','ପ୍ରଦୀପ ବିଶ୍ୱାଳ'],'context_terms':['poetry','finance']}
        self.item={'title':'Poetry with Pradeep Biswal','url':'https://example.org/article','date':'','search_text':''}
    def test_url_identity_preserves_content_ids_and_removes_tracking(self):
        self.assertEqual(w.canonical('https://youtu.be/W0619jLgivg?si=tracking'),w.canonical('https://www.youtube.com/watch?v=W0619jLgivg&feature=share'))
        self.assertEqual(w.canonical('https://www.example.org/a?id=4&utm_source=test#x'),'https://example.org/a?id=4')
        self.assertNotEqual(w.canonical('https://example.org/a?id=4'),w.canonical('https://example.org/a?id=5'))
        self.assertEqual(w.canonical('javascript:alert(1)'),'')
        self.assertEqual(w.canonical('https://user:password@example.org'),'')
    def test_rss_and_atom(self):
        rss=b'<rss><channel><item><title>Poetry - Setu</title><link>https://example.org/a</link><source>Setu</source><description>&lt;p&gt;Pradeep Biswal&lt;/p&gt;</description></item></channel></rss>'
        atom=b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Poem</title><link rel="alternate" href="https://youtube.com/watch?v=W0619jLgivg"/><published>2026-10-10</published></entry></feed>'
        self.assertEqual(w.parse_feed(rss)[0]['title'],'Poetry')
        self.assertEqual(w.parse_feed(rss)[0]['search_text'],'Pradeep Biswal')
        self.assertEqual(w.parse_feed(atom)[0]['date'],'2026-10-10')
        with self.assertRaises(ValueError):w.parse_feed(b'<html/>')
    def test_relevance_and_odia(self):
        self.assertTrue(w.match(self.item,{'require_context':True},self.config))
        self.assertFalse(w.match(self.item|{'title':'Pradeep Ranganathan poetry'}, {},self.config))
        self.assertFalse(w.match(self.item|{'title':'Pradeep Biswal unrelated news'}, {'require_context':True},self.config))
        self.assertTrue(w.match(self.item|{'title':'କବିତା ପ୍ରଦୀପ ବିଶ୍ୱାଳ'}, {},self.config))
    def test_catalogue_and_review_history_prevent_duplicate_suggestions(self):
        source={'name':'Test'};result=[(source,[self.item,self.item|{'url':'https://example.org/article?utm_source=x'}],None)]
        candidates,skipped=w.select(result,self.config,set())
        self.assertEqual(len(candidates),1);self.assertEqual(skipped,1)
        self.assertFalse(w.select(result,self.config,w.keys(self.item))[0])
    def test_closed_bot_review_issues_count_as_seen(self):
        key=next(iter(w.keys(self.item)))
        issue={'state':'closed','user':{'login':'github-actions[bot]'},'body':w.MARKER+'\n<!-- poet-watch-item:'+key+' -->'}
        with patch.object(w,'github',return_value=[issue]):self.assertIn(key,w.review_history('owner/repo'))
        issue['user']['login']='untrusted-reader'
        with patch.object(w,'github',return_value=[issue]):self.assertFalse(w.review_history('owner/repo'))
    def test_failed_history_lookup_does_not_reset_seen_items(self):
        with patch.object(w,'github',side_effect=RuntimeError('offline')):
            with self.assertRaises(RuntimeError):w.review_history('owner/repo')
    def test_issue_content_is_plain_safe_and_review_only(self):
        item=self.item|{'title':'<b>@everyone</b> [click](javascript:bad)','source':'Test','matched_names':['Pradeep Biswal'],'keys':sorted(w.keys(self.item))}
        report=w.report([item],[],'')
        self.assertNotIn('@everyone',report);self.assertNotIn('<b>',report)
        self.assertNotIn('[click](javascript:bad)',report)
        self.assertIn('Nothing has been added to the website',report)
        self.assertIn('identity and relevance still require review',report)
    def test_publisher_indexes_are_not_article_candidates(self):
        config=self.config|{'ignore_title_patterns':[r'^Setu, [A-Za-z]+ [0-9]{4}$']}
        item=self.item|{'title':'Setu, July 2025','search_text':'Pradeep Biswal'}
        self.assertFalse(w.match(item,{},config))
    def test_feed_failure_is_explicit(self):
        with patch.object(w,'get_url',side_effect=TimeoutError('timeout')):
            _,items,error=w.fetch_source({'name':'Test','url':'https://example.org/feed'})
        self.assertEqual(items,[]);self.assertIn('TimeoutError',error)

if __name__=='__main__':unittest.main()

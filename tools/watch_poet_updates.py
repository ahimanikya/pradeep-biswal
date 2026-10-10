"""Public-feed discovery only. Suggest sources for human review; never edit the site."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html import unescape, escape
from html.parser import HTMLParser
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, quote
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MARKER = '<!-- poet-updates-review:v1 -->'
USER_AGENT = 'PradeepBiswalResearchWatch/1.0 (+https://github.com/ahimanikya/pradeep-biswal)'

class PlainText(HTMLParser):
    def __init__(self, value):
        super().__init__(); self.parts = []; self.feed(value)
    def handle_data(self, text):
        self.parts.append(text)

def plain(value):
    return ' '.join(' '.join(PlainText(value or '').parts).split())

def norm(value):
    return re.sub(r'[^\w]+', ' ', plain(value).casefold()).strip()

def canonical(url):
    p = urlsplit(unescape(url or ''))
    if p.scheme not in ('http', 'https') or not p.hostname or p.username or p.password:
        return ''
    host = p.hostname.lower().removeprefix('www.')
    if host in ('youtube.com', 'youtu.be'):
        vid = p.path.strip('/') if host == 'youtu.be' else dict(parse_qsl(p.query)).get('v')
        if vid and re.fullmatch(r'[\w-]{11}', vid):
            return 'https://youtube.com/watch?v=' + vid
    query = sorted((k,v) for k,v in parse_qsl(p.query) if not k.startswith('utm_') and k not in ('si','fbclid','gclid','oc'))
    return urlunsplit(('https', host, p.path.rstrip('/') or '/', urlencode(query), ''))

def keys(item):
    values = ['url:' + canonical(item['url'])]
    if norm(item['title']): values.append('title:' + norm(item['title']))
    return {hashlib.sha256(v.encode()).hexdigest() for v in values}

def safe_text(value):
    # Feed content is untrusted: do not allow HTML, checkboxes or GitHub mentions.
    value = escape(plain(value)).replace('@', '@\u200b')
    return re.sub(r'([\\`*_{}\[\]()#!|>])', r'\\\1', value)[:350]

def safe_url(url):
    return quote(url, safe=':/?=&%+,-._~')

def get_url(url):
    request = Request(quote(url, safe=':/?=&%+,-._~'), headers={'User-Agent':USER_AGENT})
    with urlopen(request, timeout=25) as response:
        data = response.read(5_000_001)
    if len(data) > 5_000_000: raise ValueError('Feed exceeds 5 MB')
    return data

def parse_feed(data):
    root = ET.fromstring(data)
    local = lambda tag: tag.rsplit('}',1)[-1]
    if local(root.tag) not in ('rss','feed','RDF'): raise ValueError('Not an RSS/Atom feed')
    items = []
    for entry in root.iter():
        if local(entry.tag) not in ('item','entry'): continue
        values = {}; link = ''; summary = []
        for child in entry.iter():
            tag = local(child.tag); text = ''.join(child.itertext())
            if tag == 'link':
                if child.attrib.get('rel','alternate') == 'alternate': link = child.attrib.get('href') or text
            elif tag in ('description','summary','content','encoded'): summary.append(text)
            elif tag in ('title','pubDate','published','source'): values.setdefault(tag,text)
        if canonical(link):
            title = plain(values.get('title',''))
            publisher = plain(values.get('source',''))
            if publisher and title.endswith(' - '+publisher): title=title[:-len(publisher)-3]
            items.append({'title':title,'url':link,'date':values.get('published',values.get('pubDate','')),'search_text':plain(' '.join(summary)),'publisher':publisher})
    return items[:100]

def fetch_source(source):
    try: return source, parse_feed(get_url(source['url'])), None
    except Exception as error: return source, [], type(error).__name__ + ': ' + str(error)[:180]

def match(item, source, config):
    if any(re.search(pattern,item['title'],re.I) for pattern in config.get('ignore_title_patterns',[])): return []
    text = norm(item['title'] + ' ' + item.get('search_text',''))
    aliases = [name for name in config['aliases'] if norm(name) in text]
    if not aliases: return []
    if source.get('require_context') and not any(norm(term) in text for term in config['context_terms']): return []
    return aliases

def known_keys():
    found = set()
    for row in json.loads((ROOT/'archive/research/catalog.json').read_text())['records']:
        for url in [row['url']] + row.get('alternate_urls',[]): found.update(keys({'title':row['title'],'url':url}))
    # Include source links already used elsewhere, including the older Video Gallery.
    for page in (ROOT/'dist').rglob('*.html'):
        for url in re.findall(r'href="(https?://[^\"]+)"', page.read_text()): found.update(keys({'title':'','url':url}))
    return found

def select(results, config, seen):
    candidates = []; skipped = 0
    for source, items, error in results:
        for item in items:
            aliases = match(item,source,config)
            if not aliases: continue
            ids = keys(item)
            if ids & seen: skipped += 1; continue
            seen.update(ids)
            candidates.append({k:v for k,v in item.items() if k!='search_text'} | {'source':source['name'],'matched_names':aliases,'keys':sorted(ids)})
    # First-seen is not publication date; undated and old discoveries still need review.
    return candidates, skipped

def github(path, payload=None):
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if not token: raise RuntimeError('GitHub token required to read review history or publish')
    request = Request('https://api.github.com'+path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':USER_AGENT})
    with urlopen(request,timeout=30) as response: return json.load(response)

def review_history(repo):
    seen = set(); page = 1
    while True:
        issues = github(f'/repos/{repo}/issues?state=all&per_page=100&page={page}')
        for issue in issues:
            body = issue.get('body') or ''
            if MARKER in body and issue.get('user',{}).get('login') == 'github-actions[bot]':
                seen.update(re.findall(r'<!-- poet-watch-item:([a-f0-9]{64}) -->',body))
        if len(issues)<100: return seen
        page += 1

def report(candidates, failures, run_url):
    lines = [MARKER,'## Sources awaiting review','These are unverified candidates, not approved additions. Newly found does not necessarily mean newly published. Nothing has been added to the website.',
      'For each item: confirm this is the poet; check title, author/speaker, date, duplicate coverage, suitable section and image/republication rights. Add only approved records through the normal site update process. Close this issue when reviewed; closed issues also prevent repeat suggestions.','']
    for item in candidates:
        lines += [f"- [ ] **{safe_text(item['title'])}**",f"  - [Open source]({safe_url(item['url'])}) · Found via {safe_text(item['source'])}",f"  - Feed date: {safe_text(item['date']) if item['date'] else 'not supplied — verify at source'}",f"  - Matched name: {', '.join(safe_text(n) for n in item['matched_names'])}; identity and relevance still require review."]
        lines.extend('  <!-- poet-watch-item:'+key+' -->' for key in item['keys'])
    if failures:
        lines += ['','### Incomplete coverage'] + [f"- {safe_text(x['source'])}: {safe_text(x['error'])}" for x in failures]
    if run_url: lines += ['',f'[Workflow run]({run_url})']
    return '\n'.join(lines)+'\n'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--publish',action='store_true');parser.add_argument('--output',default='/tmp/poet-watch');args=parser.parse_args()
    config=json.loads((ROOT/'archive/research/watch-sources.json').read_text());seen=known_keys()
    repo=os.environ.get('GITHUB_REPOSITORY','ahimanikya/pradeep-biswal')
    if not re.fullmatch(r'[\w.-]+/[\w.-]+',repo): raise ValueError('Invalid repository')
    if args.publish: seen.update(review_history(repo)) # Fail closed if history cannot be read.
    with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(fetch_source,config['sources']))
    failures=[{'source':s['name'],'error':err} for s,_,err in results if err]
    candidates, skipped=select(results,config,seen);selected=candidates[:config['max_candidates']]
    run_url=f'https://github.com/{repo}/actions/runs/'+os.environ['GITHUB_RUN_ID'] if os.environ.get('GITHUB_RUN_ID') else ''
    body=report(selected,failures,run_url);out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    result={'checked_at':datetime.now(timezone.utc).isoformat(),'sources_checked':len(results),'source_failures':failures,'already_known_or_flagged':skipped,'unseen_candidates':len(candidates),'review_candidates':selected,'deferred_to_next_run':len(candidates)-len(selected),'mode':'publish' if args.publish else 'dry-run'}
    (out/'review.md').write_text(body);(out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    if args.publish and selected:
        issue=github(f'/repos/{repo}/issues',{'title':f"Poet updates for review · {datetime.now(timezone.utc):%Y-%m-%d}",'body':body})
        print('Review issue: '+issue['html_url'])
    summary=f"Checked {len(results)} feeds; {len(failures)} failed; {len(candidates)} unseen candidates; {skipped} known/duplicate items skipped. No website content changed."
    print(summary)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(summary+'\n\n'+body)
    # An incomplete scan must be visible as a failed run, even if useful candidates were saved.
    if failures:
        for failure in failures: print(f"Feed unavailable: {failure['source']}: {failure['error']}")
        return 1
    return 0
if __name__=='__main__': sys.exit(main())

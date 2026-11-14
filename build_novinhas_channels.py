#!/usr/bin/env python3
"""Regenera la grilla 'Featured channels' de /novinhas/ desde novinhas/channels-live.json."""
import json, html, re
P = 'novinhas/index.html'
ch = json.load(open('novinhas/channels-live.json', encoding='utf-8'))
s = open(P, encoding='utf-8').read()
cards = []
for c in ch:
    if c.get('pending'):
        cards.append('  <div class="nov-channel-card nov-channel-pending"><span class="nov-channel-art" aria-hidden="true">%s</span><div><span class="nov-channel-status">UPLOADING</span><strong>%s</strong><span>%d videos · opening soon</span></div></div>' % (html.escape(c['name'][:1].upper()), html.escape(c['name']), c['total']))
        continue
    n = str(c['poster']).zfill(2)
    cards.append('  <a class="nov-channel-card nov-channel-live" href="/novinhas/canal/?c=%s" data-nov-action="watch" data-nov-location="featured"><img src="/api/novinhas/file?k=%s/previews/poster-%s.webp" alt="" loading="lazy"><div><span class="nov-channel-status">● WATCH NOW</span><strong>%s</strong><span>%d videos · Novinhas Archive</span><b>Open channel →</b></div></a>' % (c['slug'], c['slug'], n, html.escape(c['name']), c['total']))
grid = '<div class="nov-featured-grid">\n' + '\n'.join(cards) + '\n </div>'
s2, k = re.subn(r'<div class="nov-featured-grid">.*?\n </div>(?=\n <div class="nov-upload")', lambda m: grid, s, flags=re.S)
assert k == 1, 'grid not found'
s2 = re.sub(r'\d+ channels are live · more are being rebuilt\.', '%d channels are live · more are being rebuilt.' % (sum(1 for c in ch if not c.get('pending'))), s2)
open(P, 'w', encoding='utf-8').write(s2)
print('ok', len(ch), 'cards')

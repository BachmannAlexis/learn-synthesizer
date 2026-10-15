"""Inline css/js into one self-contained HTML file (for hosting as a single page).

usage: python3 tools/bundle.py OUT.html [--fragment]
--fragment drops <!doctype>/<html>/<head>/<body> for hosts that add their own skeleton.
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: '<style>\n' + (root / m.group(1)).read_text() + '</style>', html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: '<script>\n' + (root / m.group(1)).read_text() + '</script>', html)
if '--fragment' in sys.argv:
    html = re.sub(r'<!doctype html>\s*|</?html[^>]*>\s*|</?head>\s*|</?body>\s*', '', html)
    html = re.sub(r'<meta charset="utf-8">\s*|<meta name="viewport"[^>]*>\s*', '', html)
Path(sys.argv[1]).write_text(html)
print('wrote', sys.argv[1], len(html), 'bytes')

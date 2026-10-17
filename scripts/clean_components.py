"""Retire only confirmed superseded component selectors, keeping shared rules."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/'source'
OBSOLETE=re.compile(r'\.(?:mega-[\w-]+|v9-(?:control|goals|study-stats|stat-pair|goal-title|progress-meta|side-task[s]?|quick-add|day-control)|v10-(?:home-control|goals|goal-summary|rail-title)|v6-guide-prompt|v8-get-started)\b')
NAV=re.compile(r'\.(?:global-header|global-inner|global-nav|global-link|global-tools|brand(?:-symbol)?|mini-timer|commands-trigger(?:-text)?|guide-link)\b')

def selectors(text):
    out=[]; start=0; depth=0
    for i,c in enumerate(text):
        if c in '([': depth+=1
        if c in ')]': depth-=1
        if c==',' and depth==0: out.append(text[start:i]);start=i+1
    return out+[text[start:]]

def clean(text, nav=False):
    # CSS in this baseline uses no brace characters inside declaration strings.
    def rule(m):
        header,body=m.groups()
        prefix=''
        while True:
            comment=re.match(r'\s*/\*[\s\S]*?\*/',header)
            if not comment:break
            prefix+=comment[0];header=header[comment.end():]
        if header.lstrip().startswith('@'):return m[0]
        parts=selectors(header)
        keep=[x for x in parts if not OBSOLETE.search(x) and not(nav and NAV.search(x))]
        if len(keep)==len(parts):return m[0]
        return prefix+(','.join(keep)+'{'+body+'}' if keep else '')
    return re.sub(r'([^{}]+)\{([^{}]*)\}',rule,text)

for name in ['styles.css','v4.css','workspace.css','product.css']:
    path=ROOT/name
    path.write_text(clean(path.read_text(),nav=True))

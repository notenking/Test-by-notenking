"""Build the standalone file from its original embedded blocks; no dependencies."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source'
template = (SOURCE / 'document.html').read_text()
html = re.sub(r'\{\{SOURCE:([^}]+)\}\}', lambda m: (SOURCE / m[1]).read_text(), template)
target = ROOT / 'StudyOS_0.0.22.html'
target.write_text(html)
print(f'Built {target.name}: {target.stat().st_size:,} bytes')

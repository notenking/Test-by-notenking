"""Recover the embedded sources without changing the verified HTML baseline."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    'styles.css', 'notebook.css', 'v4.css', 'blockers.css', 'workspace.css',
    'interaction-tokens.css', 'product.css', 'today.css', 'focus.css', 'icons.css',
    'engine.js', 'icons.js', 'copy-en.js', 'ui-text.js', 'form-controls.js',
    'prompt-engine.js', 'clipboard.js', 'planning.js', 'reminders.js', 'notebook.js',
    'block-rules.js', 'assessment.js', 'app.js', 'guide.js', 'review-trend.js',
    'assessment-ui.js', 'today.js', 'ui-v4.js', 'blocker-ui.js', 'command-menu.js', 'desktop-ui.js',
]
source = ROOT / 'source'
source.mkdir(exist_ok=True)
original = (ROOT / 'StudyOS_0.0.21.html').read_text()
blocks = list(re.finditer(r'<(style|script)\b([^>]*)>([\s\S]*?)</\1>', original))
assert len(blocks) == len(NAMES)
template = original
for match, name in reversed(list(zip(blocks, NAMES))):
    (source / name).write_text(match[3])
    template = template[:match.start(3)] + '{{SOURCE:' + name + '}}' + template[match.end(3):]
(source / 'document.html').write_text(template)
rebuilt = re.sub(r'\{\{SOURCE:([^}]+)\}\}', lambda m: (source / m[1]).read_text(), template)
assert rebuilt == original
print('Recovered 31 embedded blocks; exact baseline reconstruction verified.')

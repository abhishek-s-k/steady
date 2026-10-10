"""Fail publication if private files or unexpected assets enter the website directory."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1] / 'dist'
expected = {'index.html', 'styles.css', 'app.mjs', 'core.mjs', 'icons.svg', 'favicon.svg', '_headers'}
entries = list(root.rglob('*'))
if any(path.is_symlink() for path in entries):
    sys.exit('Publication refused: dist must not contain symbolic links.')
files = {path.relative_to(root).as_posix() for path in entries if path.is_file()}
if files != expected:
    sys.exit('Publication refused: dist must contain exactly the six reviewed application assets and Cloudflare header configuration. '
             'Keep backups, data, and other files outside dist.')
if sum((root / name).stat().st_size for name in expected) > 2 * 1024 * 1024:
    sys.exit('Publication refused: the application assets exceed the reviewed 2 MB limit.')
for name in expected:
    content = (root / name).read_text(encoding='utf-8')
    if re.search(r'-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}|\bAKIA[A-Z0-9]{16}\b',content):
        sys.exit('Publication refused: possible credential material in website assets.')
    if re.search(r'[A-Za-z]:[\\/]+Users[\\/]+[^\s"<>]+|[\w.+-]+@(?:gmail|outlook|hotmail)\.com',content,re.I):
        sys.exit('Publication refused: possible personal identifier or machine path in website assets.')
    if any(token in content for token in ['SteadyNative','appassets.androidplatform.net','.p12','signing-password.txt']):
        sys.exit('Publication refused: native or private build material in website assets.')
    if name.endswith('.mjs') and re.search(r'\.innerHTML\b|\.outerHTML\s*=|insertAdjacentHTML\s*\(|\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(',content):
        sys.exit('Publication refused: unsafe HTML or executable-string sink in application code.')
print('Publication allowlist passed: six static assets and Cloudflare headers; no backups, data files, or repository files.')

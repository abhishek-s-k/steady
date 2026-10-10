"""Fail publication if private files or unexpected assets enter the website directory."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1] / 'dist'
expected = {'index.html', 'styles.css', 'app.mjs', 'core.mjs', 'icons.svg', 'favicon.svg'}
entries = list(root.rglob('*'))
if any(path.is_symlink() for path in entries):
    sys.exit('Publication refused: dist must not contain symbolic links.')
files = {path.relative_to(root).as_posix() for path in entries if path.is_file()}
if files != expected:
    sys.exit('Publication refused: dist must contain exactly the six reviewed application assets. '
             'Keep backups, data, and other files outside dist.')
if sum((root / name).stat().st_size for name in expected) > 2 * 1024 * 1024:
    sys.exit('Publication refused: the application assets exceed the reviewed 2 MB limit.')
print('Publication allowlist passed: six static assets; no backups, data files, or repository files.')

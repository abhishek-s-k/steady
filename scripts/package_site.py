"""Validate and zip only the public website for Cloudflare Pages Direct Upload."""
from pathlib import Path
import runpy
from zipfile import ZipFile, ZIP_DEFLATED

project = Path(__file__).resolve().parents[1]
runpy.run_path(str(project / 'scripts' / 'check_dist.py'), run_name='__main__')
output = project / 'test-results' / 'steady-site.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for asset in sorted((project / 'dist').iterdir()):
        if asset.is_file():
            archive.write(asset, arcname=asset.name)
print('Cloudflare upload archive:', output)

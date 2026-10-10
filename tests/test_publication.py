"""Ensure deployment guards reject private or executable content before publishing."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[1]

class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        shutil.copyfile(PROJECT / 'scripts/check_dist.py', self.root / 'scripts/check_dist.py')
        (self.root / 'dist').mkdir()
        for name in ['index.html','styles.css','app.mjs','core.mjs','icons.svg','favicon.svg','_headers']:
            (self.root / 'dist' / name).write_text('public fixture', encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def run_guard(self):
        return subprocess.run([sys.executable,'-B',str(self.root / 'scripts/check_dist.py')],capture_output=True,text=True).returncode

    def test_reviewed_assets_are_accepted(self):
        self.assertEqual(self.run_guard(),0)

    def test_extra_private_or_installable_files_are_rejected(self):
        for name in ['progress.json','release.apk','signing.p12','.env']:
            with self.subTest(name=name):
                file = self.root / 'dist' / name
                file.write_text('fictional fixture')
                self.assertNotEqual(self.run_guard(),0)
                file.unlink()

    def test_sensitive_content_is_rejected_inside_allowed_files(self):
        fixtures = ['ghp_' + 'A'*36, '-----BEGIN ' + 'PRIVATE KEY-----', 'someone' + '@gmail.com', 'Steady' + 'Native']
        for fixture in fixtures:
            with self.subTest(kind=fixtures.index(fixture)):
                (self.root / 'dist/app.mjs').write_text(fixture,encoding='utf-8')
                self.assertNotEqual(self.run_guard(),0)

    def test_html_and_executable_string_sinks_are_rejected(self):
        for fixture in ['node.innerHTML = input','node.insertAdjacentHTML(input)','eval(input)','new Function(input)']:
            with self.subTest(kind=fixture.split('(')[0]):
                (self.root / 'dist/app.mjs').write_text(fixture,encoding='utf-8')
                self.assertNotEqual(self.run_guard(),0)

if __name__ == '__main__':
    unittest.main()

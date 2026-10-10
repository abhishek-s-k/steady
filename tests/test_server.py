import http.client
import threading
import unittest
import sys
from pathlib import Path
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from serve import Handler


class LocalServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path="/", method="GET", headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        connection.request(method, path, headers=headers or {})
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_application_serves_with_security_headers(self):
        status, headers, content = self.request()
        self.assertEqual(status, 200)
        self.assertIn(b"Steady", content)
        self.assertIn("connect-src 'none'", headers["Content-Security-Policy"])
        self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_module_mime_and_head(self):
        status, headers, content = self.request("/core.mjs", method="HEAD")
        self.assertEqual(status, 200)
        self.assertIn("text/javascript", headers["Content-Type"])
        self.assertEqual(content, b"")

    def test_files_outside_allowlist_never_serve(self):
        for path in ("/README.md", "/.git/config", "/serve.py", "/../README.md", "/%2e%2e/README.md", "/steady-backup.json", "/data/progress.json"):
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)

    def test_rebinding_and_cross_site_fetch_rejected(self):
        self.assertEqual(self.request(headers={"Host": "attacker.example"})[0], 403)
        self.assertEqual(self.request(headers={"Sec-Fetch-Site": "cross-site"})[0], 403)

    def test_no_write_api(self):
        for method in ("POST", "PUT", "DELETE"):
            with self.subTest(method=method):
                self.assertEqual(self.request(method=method)[0], 501)


if __name__ == "__main__":
    unittest.main()

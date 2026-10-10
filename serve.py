"""Read-only, loopback-only server for Steady. Python standard library only."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent / "dist"
ASSETS = {"/": ("index.html", "text/html; charset=utf-8"),
          "/index.html": ("index.html", "text/html; charset=utf-8"),
          "/styles.css": ("styles.css", "text/css; charset=utf-8"),
          "/app.mjs": ("app.mjs", "text/javascript; charset=utf-8"),
          "/core.mjs": ("core.mjs", "text/javascript; charset=utf-8"),
          "/icons.svg": ("icons.svg", "image/svg+xml"),
          "/favicon.svg": ("favicon.svg", "image/svg+xml")}
CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; "
       "font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; "
       "form-action 'none'; frame-src 'none'; frame-ancestors 'none'")


class Handler(BaseHTTPRequestHandler):
    server_version = "Steady"
    sys_version = ""

    def log_message(self, *_args):
        pass  # No request logs or URLs are stored.

    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        self.respond()

    def do_HEAD(self):
        self.respond(head=True)

    def respond(self, head=False):
        allowed_hosts = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        if self.headers.get("Host", "").lower() not in allowed_hosts:
            self.send_error(403, "Host not allowed")
            return
        if self.headers.get("Sec-Fetch-Site") == "cross-site":
            self.send_error(403, "Cross-site requests are not allowed")
            return
        path = urlsplit(self.path).path
        asset = ASSETS.get(path)
        if asset is None:
            self.send_error(404, "Not found")
            return
        try:
            content = (ROOT / asset[0]).read_bytes()
        except OSError:
            self.send_error(404, "Not found")
            return
        self.send_response(200)
        self.send_header("Content-Type", asset[1])
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        if not head:
            self.wfile.write(content)


def run():
    parser = argparse.ArgumentParser(description="Run Steady locally. No dependencies required.")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Choose a port between 1024 and 65535.")
    try:
        with ThreadingHTTPServer(("127.0.0.1", args.port), Handler) as server:
            print(f"Steady is ready: http://127.0.0.1:{args.port}", flush=True)
            print("Open this URL in your browser. Press Ctrl+C to stop. No data is saved to the project.", flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        print("\nSteady stopped.")
    except OSError as error:
        parser.exit(1, f"Could not start Steady: {error}\nTry a different port with --port 8766.\n")


if __name__ == "__main__":
    run()

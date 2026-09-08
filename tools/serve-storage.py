#!/usr/bin/env python3
"""Static file server WITH CORS — a drop-in replacement for `python -m http.server`
for serving storefront/public/storage/ to the storefront on another origin.

    python3 tools/serve-storage.py                 # :8000, serves ./storefront/public/storage
    python3 tools/serve-storage.py 8010            # different port
    python3 tools/serve-storage.py 8000 some/dir   # different directory

`python -m http.server` sends no Access-Control-Allow-Origin, so cross-origin
fetch() of catalog.json / product JSON is blocked. This adds the header (and a
204 for OPTIONS preflight + Range support for media).
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIRECTORY = sys.argv[2] if len(sys.argv) > 2 else "storefront/public/storage"


class CORSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Accept, Content-Type, Range")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Vary", "Origin")
        # no-store: never let the browser reuse a cached copy (esp. a pre-CORS
        # one) for a cross-origin fetch while you iterate on the data.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    handler = partial(CORSHandler, directory=DIRECTORY)
    with ThreadingHTTPServer(("0.0.0.0", PORT), handler) as httpd:
        print(f"CORS static server: http://localhost:{PORT}  ->  {DIRECTORY}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

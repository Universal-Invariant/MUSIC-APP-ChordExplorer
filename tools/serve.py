#!/usr/bin/env python3
"""Minimal static file server for local development.

Serves the repo root so that:
  /web/index.html        -> the app page
  /web-dist/...          -> compiled browser JS (tsc -p tsconfig.web.json)
  /src/..., /dist/...    -> anything else in the tree

Usage:  python3 tools/serve.py [port]   (default 8000)
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        if path.endswith(".js"):
            return "text/javascript"
        if path.endswith(".mjs"):
            return "text/javascript"
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"serving {ROOT} at http://localhost:{PORT}/web/index.html")
        httpd.serve_forever()

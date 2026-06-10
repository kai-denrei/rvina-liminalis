#!/usr/bin/env python3
"""SEED dev server.

Serves this directory with Cache-Control: no-cache on every response so
edited ES modules always reach the browser (module imports carry no ?v=
fingerprint — the server header is the control surface here, see
cache-busting skill references/server-headers.md for production recipes).

Usage: python3 serve.py [port]   (default 8420; binds 0.0.0.0 for LAN view)
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8420
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('0.0.0.0', PORT), NoCacheHandler) as httpd:
        print(f'SEED dev server: http://localhost:{PORT}  (LAN: http://<this-host>.local:{PORT})')
        httpd.serve_forever()

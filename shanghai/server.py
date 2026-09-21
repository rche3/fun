"""Tiny static server for Railway. Stdlib only — no dependencies to install.

Railway injects $PORT; locally it defaults to 8000.
"""

import functools
import os
import pathlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).parent / "public"
PORT = int(os.environ.get("PORT", 8000))


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # The page is regenerated on each deploy; don't let phones cache it.
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} {fmt % args}", flush=True)


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=str(ROOT))
    print(f"serving {ROOT} on 0.0.0.0:{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), handler).serve_forever()

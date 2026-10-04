from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import mimetypes
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
STATIC_ROOT = WEB_ROOT / "static"


class RoutineHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/health":
            self._send_json({"status": "ok", "application": "Daymark"})
            return

        if path in ("/", "/index.html"):
            file_path = WEB_ROOT / "index.html"
            content_type = "text/html; charset=utf-8"
        elif path.startswith("/static/"):
            name = path.removeprefix("/static/")
            allowed_files = {"styles.css", "app.js"}
            if name not in allowed_files:
                self.send_error(404)
                return
            file_path = STATIC_ROOT / name
            content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
            content_type += "; charset=utf-8"
        else:
            self.send_error(404)
            return

        try:
            content = file_path.read_bytes()
        except OSError:
            self.send_error(404)
            return

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def _send_json(self, payload):
        content = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}")


def main():
    parser = argparse.ArgumentParser(description="Run the Daymark daily routine planner.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), RoutineHandler)
    print(f"Daymark is running at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Daymark.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

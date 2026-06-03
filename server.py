# Local docs editor server. Serves the site on 127.0.0.1 and accepts save/media
# writes so the in-page editor can persist changes. Run via "Edit Docs.vbs".
import http.server, socketserver, json, base64, os, shutil, threading, webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def _json(self, code, obj):
        b = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path.startswith("/api/list-media"):
            d = os.path.join(ROOT, "assets", "docs")
            files = []
            if os.path.isdir(d):
                files = sorted(f for f in os.listdir(d)
                               if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".webm")))
            return self._json(200, {"files": ["assets/docs/" + f for f in files]})
        return super().do_GET()

    def do_POST(self):
        ln = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(ln) if ln else b""

        if self.path == "/api/shutdown":
            threading.Timer(0.3, lambda: os._exit(0)).start()
            return self._json(200, {"ok": True})

        try:
            data = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            return self._json(400, {"error": "bad json"})

        if self.path == "/api/save":
            content = data.get("content")
            if content is None:
                return self._json(400, {"error": "no content"})
            js = "window.DOCS_CONTENT = " + json.dumps(content, ensure_ascii=False, indent=1) + ";\n"
            p = os.path.join(ROOT, "docs-content.js")
            try:
                if os.path.exists(p):
                    shutil.copyfile(p, p + ".bak")
            except Exception:
                pass
            with open(p, "w", encoding="utf-8") as f:
                f.write(js)
            return self._json(200, {"ok": True})

        if self.path == "/api/media":
            name = data.get("name", "")
            durl = data.get("dataUrl", "")
            if not name or "," not in durl:
                return self._json(400, {"error": "bad media"})
            try:
                blob = base64.b64decode(durl.split(",", 1)[1])
            except Exception:
                return self._json(400, {"error": "bad data url"})
            safe = "".join(c for c in name if c.isalnum() or c in "._-") or "media"
            d = os.path.join(ROOT, "assets", "docs")
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, safe), "wb") as f:
                f.write(blob)
            return self._json(200, {"path": "assets/docs/" + safe})

        return self._json(404, {"error": "not found"})


def main():
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://127.0.0.1:{PORT}/docs.html"
        threading.Timer(0.7, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()

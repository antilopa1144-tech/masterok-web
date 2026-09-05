"""First-party article views. Loopback only; expose through the supplied nginx location."""
import hashlib
from contextlib import contextmanager
import hmac
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import threading
import time
import urllib.request
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler, HTTPServer

WINDOW = 1800
SLUG = re.compile(r"[a-z0-9][a-z0-9-]{0,179}")
VISITOR = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
BOTS = re.compile(r"bot|spider|crawl|headless|curl|wget|python|preview|lighthouse", re.I)
ORIGINS = {"https://getmasterok.ru", "https://www.getmasterok.ru"}


def sitemap_slugs(xml):
    root = ET.fromstring(xml)
    result = set()
    for loc in root.findall("{*}url/{*}loc"):
        url = urlsplit(loc.text or "")
        slug = url.path.removeprefix("/blog/").strip("/")
        if url.hostname == "getmasterok.ru" and url.path.startswith("/blog/") and SLUG.fullmatch(slug):
            result.add(slug)
    if not result:
        raise ValueError("Empty published article sitemap")
    return result


class Store:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / "views.sqlite3"
        salt = self.directory / "hash-key"
        if not salt.exists():
            with salt.open("xb") as stream:
                os.chmod(salt, 0o600)
                stream.write(os.urandom(32))
        self.key = salt.read_bytes()
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS counts (slug TEXT PRIMARY KEY, views INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS visits (
                    slug TEXT NOT NULL, visitor TEXT NOT NULL, seen INTEGER NOT NULL,
                    PRIMARY KEY(slug, visitor));
                CREATE INDEX IF NOT EXISTS visits_seen ON visits(seen);
                CREATE TABLE IF NOT EXISTS budgets (
                    address TEXT PRIMARY KEY, started INTEGER NOT NULL, used INTEGER NOT NULL);
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=5)
        try:
            with db:
                yield db
        finally:
            db.close()

    def digest(self, value):
        return hmac.new(self.key, value.encode(), hashlib.sha256).hexdigest()

    def count(self, slug):
        with self.connect() as db:
            row = db.execute("SELECT views FROM counts WHERE slug=?", (slug,)).fetchone()
            return row[0] if row else 0

    def register(self, slug, visitor, address, now=None):
        now = int(time.time()) if now is None else now
        visitor = self.digest(slug + ":" + visitor)
        address = self.digest(address)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM visits WHERE seen<=?", (now - WINDOW,))
            db.execute("DELETE FROM budgets WHERE started<=?", (now - 3600,))
            row = db.execute("SELECT views FROM counts WHERE slug=?", (slug,)).fetchone()
            count = row[0] if row else 0
            if db.execute("SELECT 1 FROM visits WHERE slug=? AND visitor=?", (slug, visitor)).fetchone():
                return count, False
            budget = db.execute("SELECT used FROM budgets WHERE address=?", (address,)).fetchone()
            if budget and budget[0] >= 60:
                raise PermissionError("View budget exceeded")
            db.execute("INSERT INTO budgets VALUES (?, ?, 1) ON CONFLICT(address) DO UPDATE SET used=used+1", (address, now))
            db.execute("INSERT INTO visits VALUES (?, ?, ?)", (slug, visitor, now))
            db.execute("INSERT INTO counts VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET views=views+1", (slug,))
            return count + 1, True

    def prune(self):
        with self.connect() as db:
            db.execute("DELETE FROM visits WHERE seen<=?", (int(time.time()) - WINDOW,))
            db.execute("DELETE FROM budgets WHERE started<=?", (int(time.time()) - 3600,))

    def backup(self):
        # Backups contain aggregate totals only, not temporary visitor/IP hashes.
        directory = self.directory / "backups"
        directory.mkdir(exist_ok=True)
        target = directory / (time.strftime("%Y-%m-%d") + ".sqlite3")
        with self.connect() as source, sqlite3.connect(target) as dest:
            source.backup(dest)
            dest.execute("DELETE FROM visits")
            dest.execute("DELETE FROM budgets")
            dest.commit()
            dest.execute("VACUUM")
        for old in sorted(directory.glob("????-??-??.sqlite3"))[:-7]:
            old.unlink()


class Catalog:
    def __init__(self):
        self.slugs = frozenset()
        self.refreshed = 0

    def refresh(self):
        # Blog chunk contract is owned by src/lib/sitemap/build.ts (case 4).
        # Ghost omits posts with an external canonical, so its own sitemap is unsuitable.
        req = urllib.request.Request("https://getmasterok.ru/sitemap/4.xml", headers={
            "User-Agent": "MasterokArticleViews/1.0 (published article catalog)"})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = response.read(4_000_001)
        if len(data) > 4_000_000:
            raise ValueError("Sitemap too large")
        self.slugs = frozenset(sitemap_slugs(data))
        self.refreshed = time.time()

    def contains(self, slug):
        return time.time() - self.refreshed < 86400 and slug in self.slugs


def handler_for(store, catalog):
    class Handler(BaseHTTPRequestHandler):
        server_version = "ArticleViews"

        def setup(self):
            super().setup()
            self.connection.settimeout(5)

        def log_message(self, *_args):
            pass  # Do not log visitor IDs, IPs or request URLs.

        def respond(self, status, payload):
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Vary", "Origin")
            origin = self.headers.get("Origin")
            if origin in ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            self.respond(200 if self.headers.get("Origin") in ORIGINS else 403, {})

        def do_GET(self):
            self.handle_view(False)

        def do_POST(self):
            self.handle_view(True)

        def handle_view(self, write):
            slug = self.path.removeprefix("/article-views/").rstrip("/")
            if not self.path.startswith("/article-views/") or not SLUG.fullmatch(slug):
                return self.respond(404, {"error": "not_found"})
            if not catalog.contains(slug):
                return self.respond(404 if catalog.refreshed else 503, {"error": "unavailable"})
            try:
                if not write:
                    return self.respond(200, {"views": store.count(slug)})
                if self.headers.get("Origin") not in ORIGINS:
                    return self.respond(403, {"error": "origin"})
                if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    return self.respond(415, {"error": "content_type"})
                length = int(self.headers.get("Content-Length", "0"))
                if not 1 <= length <= 256 or self.headers.get("Transfer-Encoding"):
                    return self.respond(413, {"error": "body_size"})
                body = json.loads(self.rfile.read(length))
                visitor = body.get("visitor") if isinstance(body, dict) else None
                if not isinstance(visitor, str) or not VISITOR.fullmatch(visitor):
                    return self.respond(400, {"error": "visitor"})
                ua = self.headers.get("User-Agent", "")
                if not ua or BOTS.search(ua):
                    return self.respond(200, {"views": store.count(slug), "counted": False})
                # nginx overwrites this header from the actual TCP peer, never X-Forwarded-For.
                address = self.headers.get("X-Real-IP", self.client_address[0])
                count, counted = store.register(slug, visitor, address)
                self.respond(200, {"views": count, "counted": counted})
            except PermissionError:
                self.respond(429, {"error": "rate_limit"})
            except (ValueError, json.JSONDecodeError):
                self.respond(400, {"error": "invalid_body"})
            except sqlite3.Error:
                self.respond(503, {"error": "storage_unavailable"})
    return Handler


def main():
    store = Store(os.environ.get("STATE_DIRECTORY", "/var/lib/masterok-views"))
    if "--backup" in sys.argv:
        store.backup()
        return
    catalog = Catalog()

    def maintain():
        while True:
            try:
                catalog.refresh()
                store.prune()
            except Exception:
                print("Article catalog/maintenance unavailable; will retry", flush=True)
            time.sleep(300)

    threading.Thread(target=maintain, daemon=True).start()
    HTTPServer(("127.0.0.1", 3460), handler_for(store, catalog)).serve_forever()


if __name__ == "__main__":
    main()

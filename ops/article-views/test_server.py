import concurrent.futures
import http.client
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import time
import unittest
import uuid
from http.server import HTTPServer
from server import Store, Catalog, handler_for, sitemap_slugs


class ViewsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_read_does_not_count(self):
        self.assertEqual(self.store.count("article"), 0)
        self.assertEqual(self.store.count("article"), 0)

    def test_dedupe_window_and_other_articles(self):
        self.assertEqual(self.store.register("a", "v", "ip", 10000), (1, True))
        self.assertEqual(self.store.register("a", "v", "ip", 11799), (1, False))
        self.assertEqual(self.store.register("b", "v", "ip", 11799), (1, True))
        self.assertEqual(self.store.register("a", "v", "ip", 11800), (2, True))

    def test_restart_keeps_count_and_dedupe(self):
        self.store.register("a", "v", "ip", 10000)
        restarted = Store(self.temp.name)
        self.assertEqual(restarted.register("a", "v", "ip", 10001), (1, False))

    def test_parallel_requests_atomic(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda _: self.store.register("a", "same", "ip", 10000), range(20)))
        self.assertEqual(sum(counted for _, counted in results), 1)
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda i: self.store.register("a", str(i), "ip", 10000), range(20)))
        self.assertEqual(self.store.count("a"), 21)

    def test_ip_budget_no_raw_ids(self):
        for i in range(60):
            self.store.register("a", str(i), "192.0.2.1", 10000)
        with self.assertRaises(PermissionError):
            self.store.register("a", "extra", "192.0.2.1", 10001)
        self.assertEqual(self.store.count("a"), 60)
        with self.store.connect() as db:
            self.assertNotIn("192.0.2.1", str(db.execute("SELECT * FROM budgets").fetchall()))
        self.assertEqual(self.store.register("a", "extra", "192.0.2.1", 13600), (61, True))

    def test_backup_has_only_aggregates(self):
        self.store.register("a", "v", "ip")
        self.store.backup()
        with sqlite3.connect(next((Path(self.temp.name) / "backups").glob("*.sqlite3"))) as db:
            self.assertEqual(db.execute("SELECT views FROM counts").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM visits").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM budgets").fetchone()[0], 0)

    def test_sitemap_only_published_article_urls(self):
        xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://getmasterok.ru/blog/good-article/</loc></url><url><loc>https://evil.example/blog/wrong/</loc></url><url><loc>https://getmasterok.ru/blog/tag/path/</loc></url><url><loc>https://cms.getmasterok.ru/old-only/</loc></url><url><loc>https://getmasterok.ru/not-blog/</loc></url></urlset>'
        self.assertEqual(sitemap_slugs(xml), {"good-article"})
        with self.assertRaises(ValueError):
            sitemap_slugs("<urlset/>")

    def test_http_validation_and_read_only_bots(self):
        catalog = Catalog()
        catalog.slugs = {"a"}
        catalog.refreshed = time.time()
        server = HTTPServer(("127.0.0.1", 0), handler_for(self.store, catalog))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        def request(method, path="a/", body=None, origin="https://getmasterok.ru", ua="Mozilla/5.0"):
            conn = http.client.HTTPConnection("127.0.0.1", server.server_port)
            conn.request(method, "/article-views/" + path, body=body, headers={"Origin": origin, "User-Agent": ua, "Content-Type": "application/json"})
            response = conn.getresponse()
            result = (response.status, json.loads(response.read()), response.getheader("Access-Control-Allow-Origin"))
            conn.close()
            return result
        try:
            payload = json.dumps({"visitor": str(uuid.uuid4())})
            self.assertEqual(request("GET")[1], {"views": 0})
            self.assertEqual(request("POST", body=payload, origin="https://evil.example")[0], 403)
            self.assertEqual(request("POST", body=payload, ua="Googlebot")[1]["counted"], False)
            self.assertEqual(request("POST", body="[]")[0], 400)
            self.assertEqual(request("POST", body="x" * 257)[0], 413)
            self.assertEqual(request("POST", path="unknown/", body=payload)[0], 404)
            self.assertEqual(request("POST", body=payload)[1], {"views": 1, "counted": True})
            self.assertEqual(request("POST", body=payload)[1], {"views": 1, "counted": False})
            self.assertEqual(request("OPTIONS")[2], "https://getmasterok.ru")
            self.assertEqual(request("OPTIONS", origin="https://evil.example")[2], None)
            self.assertEqual(request("GET")[1], {"views": 1})
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()

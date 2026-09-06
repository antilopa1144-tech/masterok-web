import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from state import Store
from verify_public import HttpResult, NotReady
from worker import Failure, INDEXNOW, checked_status, fetch_snapshot, process_cycle, source_revision, validate_config

CONFIG = {"site_url": "https://getmasterok.ru", "ghost_url": "https://cms.getmasterok.ru", "ghost_content_key": "test-only", "indexnow_key": "test-only-key", "mode": "active"}
SEED = {"id": "42", "slug": "remont", "title": "Ремонт 🧱", "html": "<p>Текст & пример</p>", "published_at": "2026-09-06T00:00:00.000Z", "updated_at": "2026-09-06T00:00:00.000Z", "tags": [{"id": "1", "name": "Плитка", "slug": "plitka"}]}


class FakeTransport:
    def __init__(self):
        self.posts = [copy.deepcopy(SEED)]
        self.calls = []
        self.total = None
        self.indexnow_status = 200
        self.missing_id_status = 404

    def __call__(self, url, **kwargs):
        self.calls.append((url, kwargs))
        if "/ghost/api/content/posts/?" in url:
            payload = {"posts": self.posts, "meta": {"pagination": {"pages": 1, "page": 1, "total": len(self.posts) if self.total is None else self.total}}}
            return HttpResult(200, {}, json.dumps(payload).encode(), url)
        if "/ghost/api/content/posts/" in url:
            return HttpResult(self.missing_id_status, {}, b"", url)
        if url == INDEXNOW:
            return HttpResult(self.indexnow_status, {"retry-after": "900"}, b"", url)
        if url.endswith("test-only-key.txt"):
            return HttpResult(200, {}, b"test-only-key", url)
        raise AssertionError("Unexpected network call")

    @property
    def submissions(self):
        return [json.loads(kwargs["body"]) for url, kwargs in self.calls if url == INDEXNOW]


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "queue.sqlite3"
        self.store = Store(self.path)
        self.transport = FakeTransport()

    def tearDown(self):
        self.store.close()
        self.directory.cleanup()

    def baseline_and_edit(self):
        result = process_cycle(CONFIG, self.store, self.transport, now=100)
        self.assertEqual(result["jobs"], {})
        self.transport.posts[0]["html"] = "<p>Исправление в ту же секунду</p>"

    def test_cross_language_revision_golden_vector(self):
        self.assertEqual(source_revision(SEED), "f12fc91467fd4cfe3bdc9448f737e7a94c94db274e840836d3c7bb0a14da0c83")

    def test_baseline_never_submits_history(self):
        process_cycle(CONFIG, self.store, self.transport, now=100)
        self.assertEqual(self.transport.submissions, [])

    def test_invalid_or_empty_snapshot_cannot_remove_posts(self):
        process_cycle(CONFIG, self.store, self.transport, now=100)
        for posts, total in [([], 0), ([SEED], 2), ([SEED, SEED], 2)]:
            self.transport.posts, self.transport.total = posts, total
            with self.assertRaises(Failure):
                process_cycle(CONFIG, self.store, self.transport, now=200)
            self.assertEqual(self.store.report()["jobs"], {})

    @patch("worker.verify_post", return_value={"ready": True})
    def test_restart_edit_idempotency_and_submission_after_proof(self, verify):
        self.baseline_and_edit()
        self.store.close()
        self.store = Store(self.path)
        result = process_cycle(CONFIG, self.store, self.transport, now=200)
        self.assertEqual(result["completed"], 1)
        self.assertEqual(len(self.transport.submissions), 1)
        self.assertEqual(self.transport.submissions[0]["urlList"], ["https://getmasterok.ru/blog/remont/"])
        self.assertEqual(verify.call_count, 1)
        process_cycle(CONFIG, self.store, self.transport, now=300)
        self.assertEqual(len(self.transport.submissions), 1)

    @patch("worker.verify_post", side_effect=NotReady("source_revision_mismatch"))
    def test_stale_public_page_never_submits(self, verify):
        self.baseline_and_edit()
        result = process_cycle(CONFIG, self.store, self.transport, now=200)
        self.assertEqual(result["jobs"], {"pending": 1})
        self.assertEqual(self.transport.submissions, [])

    @patch("worker.verify_post", return_value={"ready": True})
    def test_observe_mode_defers_without_exhausting_retry_budget(self, verify):
        self.baseline_and_edit()
        for now in range(200, 4200, 400):
            process_cycle({**CONFIG, "mode": "observe"}, self.store, self.transport, now=now)
        self.assertEqual(self.transport.submissions, [])
        self.assertEqual(self.store.report()["jobs"], {"pending": 1})
        self.assertEqual(self.store.due(5000)[0]["attempts"], 0)

    @patch("worker.verify_post", return_value={"ready": True})
    def test_retry_after_and_auth_blocking(self, verify):
        self.baseline_and_edit()
        self.transport.indexnow_status = 429
        process_cycle(CONFIG, self.store, self.transport, now=200)
        self.assertEqual(self.store.due(1099), [])
        self.assertEqual(self.store.due(1100)[0]["attempts"], 1)
        self.transport.indexnow_status = 403
        result = process_cycle(CONFIG, self.store, self.transport, now=1100)
        self.assertEqual(result["jobs"], {"blocked": 1})

    @patch("worker.verify_removed", side_effect=NotReady("removed_article_still_public"))
    @patch("worker.verify_post", return_value={"ready": True})
    def test_republish_cancels_old_removal(self, verify, removed):
        self.transport.posts.append({**SEED, "id": "other", "slug": "other"})
        process_cycle(CONFIG, self.store, self.transport, now=100)
        self.transport.posts = self.transport.posts[1:]
        process_cycle(CONFIG, self.store, self.transport, now=200)
        self.transport.posts.append(copy.deepcopy(SEED))
        process_cycle(CONFIG, self.store, self.transport, now=400)
        self.assertEqual(removed.call_count, 1)
        self.assertEqual(len(self.transport.submissions), 1)
        self.assertEqual(self.store.report()["jobs"], {"done": 1, "superseded": 1})

    def test_timestamp_regression_does_not_roll_snapshot_back(self):
        process_cycle(CONFIG, self.store, self.transport, now=100)
        self.transport.posts[0]["updated_at"] = "2026-09-05T00:00:00Z"
        with self.assertRaises(Failure):
            process_cycle(CONFIG, self.store, self.transport, now=200)
        self.assertEqual(self.store.report()["last_snapshot"]["at"], 100)

    def test_missing_post_is_confirmed_independently_before_removal(self):
        self.transport.posts.append({**SEED, "id": "other", "slug": "other"})
        process_cycle(CONFIG, self.store, self.transport, now=100)
        self.transport.posts = self.transport.posts[1:]
        for status in (200, 500, 403):
            self.transport.missing_id_status = status
            with self.assertRaises(Failure):
                process_cycle(CONFIG, self.store, self.transport, now=200)
            self.assertEqual(self.store.report()["jobs"], {})

    def test_configuration_rejects_credential_urls(self):
        with self.assertRaises(Failure):
            validate_config({**CONFIG, "site_url": "https://user:password@example.test"})

    def test_indexnow_202_is_accepted_not_claimed_indexed(self):
        checked_status(HttpResult(202, {}, b"", INDEXNOW), "indexnow", 0)


if __name__ == "__main__":
    unittest.main()

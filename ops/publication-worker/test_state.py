import tempfile
import unittest
from pathlib import Path

from state import Store


def post(post_id: str, slug: str, revision: str, **extra: object) -> dict[str, object]:
    return {"id": post_id, "slug": slug, "revision": revision, "title": slug, **extra}


class StoreTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.path = Path(self.tempdir.name) / "outbox.sqlite3"
        self.store = Store(self.path)
        self.base = [post("a", "old-slug", "r1")]
        self.store.reconcile(self.base, now=1.0)

    def tearDown(self) -> None:
        self.store.close()
        self.tempdir.cleanup()

    def jobs(self) -> list[dict[str, object]]:
        return self.store.due(now=999.0, limit=50)

    def test_first_complete_snapshot_is_a_baseline_and_restart_keeps_it(self) -> None:
        self.assertEqual(self.store.due(999.0), [])
        self.assertEqual(self.store.reconcile(self.base, now=1.5)["unchanged"], 1)
        self.assertEqual(self.store.due(999.0), [])
        self.store.close()
        self.store = Store(self.path)

        counts = self.store.reconcile([post("a", "old-slug", "r2")], now=2.0)
        self.assertEqual(counts["edited"], 1)
        self.assertEqual([(job["action"], job["slug"]) for job in self.jobs()], [("edited", "old-slug")])

    def test_add_edit_and_remove_enqueue_durable_current_actions(self) -> None:
        self.assertEqual(self.store.reconcile([post("a", "old-slug", "r1"), post("b", "new", "r1")], 2.0)["published"], 1)
        self.assertEqual(self.store.reconcile([post("a", "old-slug", "r2"), post("b", "new", "r1")], 3.0)["edited"], 1)
        self.assertEqual(self.store.reconcile([post("b", "new", "r1")], 4.0)["unpublished"], 1)

        self.assertEqual(
            [(job["action"], job["slug"]) for job in self.jobs()],
            [("published", "new"), ("unpublished", "old-slug")],
        )

    def test_failed_or_zero_snapshot_cannot_erase_state(self) -> None:
        with self.assertRaises(ValueError):
            self.store.reconcile([], now=2.0)
        with self.assertRaises(ValueError):
            self.store.reconcile([{"id": "a", "slug": "old-slug"}], now=3.0)

        self.assertEqual(self.store.reconcile([post("a", "old-slug", "r2")], 4.0)["edited"], 1)

    def test_rename_twice_preserves_unpublishes_and_supersedes_intermediate_publish(self) -> None:
        self.store.reconcile([post("a", "middle", "r2")], now=2.0)
        self.store.reconcile([post("a", "latest", "r3")], now=3.0)

        self.assertEqual(
            {(job["action"], job["slug"]) for job in self.jobs()},
            {("unpublished", "old-slug"), ("unpublished", "middle"), ("published", "latest")},
        )
        self.assertEqual(self.store.report()["jobs"].get("superseded"), 1)

    def test_republish_same_revision_uses_new_generation(self) -> None:
        self.store.reconcile([post("a", "old-slug", "r1"), post("b", "temporary", "r1")], now=2.0)
        self.store.reconcile([post("a", "old-slug", "r1")], now=3.0)
        unpublish = next(job for job in self.jobs() if job["action"] == "unpublished")
        self.store.finish(int(unpublish["id"]), now=4.0)
        self.store.reconcile([post("a", "old-slug", "r1"), post("b", "temporary", "r1")], now=5.0)

        published = [job for job in self.jobs() if job["action"] == "published" and job["postId"] == "b"]
        self.assertEqual(len(published), 1)
        self.assertGreater(int(published[0]["generation"]), int(unpublish["generation"]))

    def test_retry_blocks_on_eighth_attempt_and_report_hides_payload(self) -> None:
        self.store.reconcile([post("a", "old-slug", "r1"), post("b", "new", "r1", secret="never-report")], now=2.0)
        job_id = int(self.jobs()[0]["id"])
        for attempt in range(8):
            self.assertTrue(self.store.retry(job_id, now=10.0 + attempt, error="temporary", delay=0.0))
        self.assertEqual(self.store.report()["jobs"].get("blocked"), 1)
        self.assertNotIn("never-report", str(self.store.report()))

    def test_defer_repeatedly_moves_pending_work_without_counting_attempts(self) -> None:
        self.store.reconcile([post("a", "old-slug", "r1"), post("b", "new", "r1")], now=2.0)
        job_id = int(self.jobs()[0]["id"])

        self.assertTrue(self.store.defer(job_id, now=10.0, detail="observe", delay=300.0))
        self.assertEqual(self.store.due(309.9), [])
        self.assertTrue(self.store.defer(job_id, now=100.0, detail="observe again", delay=300.0))
        self.assertEqual(self.store.due(399.9), [])
        deferred = self.store.due(400.0)

        self.assertEqual(len(deferred), 1)
        self.assertEqual(deferred[0]["attempts"], 0)
        self.assertEqual(self.store.report()["jobs"].get("blocked", 0), 0)


if __name__ == "__main__":
    unittest.main()

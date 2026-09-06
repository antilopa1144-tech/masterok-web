"""Durable, single-process SQLite outbox for blog publication events."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


MAX_ATTEMPTS = 8


class Store:
    """Persist source snapshots and the current publication work they imply."""

    def __init__(self, path: str | Path):
        database_path = Path(path)
        database_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(str(database_path), isolation_level=None)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("PRAGMA busy_timeout=5000")
        self.connection.execute("PRAGMA foreign_keys=ON")
        self._create_schema()

    def close(self) -> None:
        self.connection.close()

    def _create_schema(self) -> None:
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS posts (
              id TEXT PRIMARY KEY,
              slug TEXT NOT NULL,
              revision TEXT NOT NULL,
              payload TEXT NOT NULL,
              generation INTEGER NOT NULL,
              active INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS post_slugs (
              post_id TEXT NOT NULL,
              slug TEXT NOT NULL,
              revision TEXT NOT NULL,
              generation INTEGER NOT NULL,
              is_current INTEGER NOT NULL,
              needs_unpublish INTEGER NOT NULL,
              PRIMARY KEY (post_id, slug)
            );
            CREATE TABLE IF NOT EXISTS jobs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              post_id TEXT NOT NULL,
              revision TEXT NOT NULL,
              action TEXT NOT NULL CHECK(action IN ('published', 'edited', 'unpublished')),
              slug TEXT NOT NULL,
              payload TEXT NOT NULL,
              generation INTEGER NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              attempts INTEGER NOT NULL DEFAULT 0,
              due_at REAL NOT NULL,
              detail TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL,
              finished_at REAL,
              UNIQUE(post_id, revision, action, slug, generation)
            );
            CREATE INDEX IF NOT EXISTS jobs_due_idx ON jobs(status, due_at, id);
            CREATE INDEX IF NOT EXISTS jobs_post_idx ON jobs(post_id, status);
            """
        )

    @contextmanager
    def _transaction(self) -> Iterator[None]:
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            yield
        except Exception:
            self.connection.execute("ROLLBACK")
            raise
        else:
            self.connection.execute("COMMIT")

    @staticmethod
    def _normalise_posts(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not isinstance(posts, list) or not posts:
            raise ValueError("A complete, nonempty publication snapshot is required")

        normalised: list[dict[str, Any]] = []
        ids: set[str] = set()
        for post in posts:
            if not isinstance(post, dict):
                raise ValueError("Each snapshot row must be an object")
            post_id, slug, revision = post.get("id"), post.get("slug"), post.get("revision")
            if not all(isinstance(value, str) and value for value in (post_id, slug, revision)):
                raise ValueError("Snapshot rows require nonempty id, slug and revision strings")
            if post_id in ids:
                raise ValueError("Snapshot contains duplicate post ids")
            try:
                payload = json.dumps(post, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            except (TypeError, ValueError) as error:
                raise ValueError("Snapshot row is not JSON serializable") from error
            ids.add(post_id)
            normalised.append({"id": post_id, "slug": slug, "revision": revision, "payload": payload})
        return normalised

    def _set_snapshot_metadata(self, now: float, size: int) -> None:
        self.connection.execute(
            "INSERT INTO metadata(key, value) VALUES('last_snapshot', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (json.dumps({"at": now, "size": size}, separators=(",", ":")),),
        )

    def _has_baseline(self) -> bool:
        return self.connection.execute(
            "SELECT 1 FROM metadata WHERE key='baseline_complete'",
        ).fetchone() is not None

    def _insert_job(
        self,
        *,
        post_id: str,
        revision: str,
        action: str,
        slug: str,
        payload: str,
        generation: int,
        now: float,
    ) -> bool:
        result = self.connection.execute(
            "INSERT OR IGNORE INTO jobs(post_id, revision, action, slug, payload, generation, due_at, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (post_id, revision, action, slug, payload, generation, now, now),
        )
        return result.rowcount == 1

    def _supersede_pending_content_jobs(self, post_id: str, now: float) -> None:
        self.connection.execute(
            "UPDATE jobs SET status='superseded', finished_at=?, detail='superseded by newer snapshot' "
            "WHERE post_id=? AND status IN ('pending', 'blocked') AND action IN ('published', 'edited')",
            (now, post_id),
        )

    def _queue_stale_slug_unpublishes(self, post_id: str, payload: str, now: float) -> int:
        queued = 0
        stale = self.connection.execute(
            "SELECT slug, revision, generation FROM post_slugs "
            "WHERE post_id=? AND is_current=0 AND needs_unpublish=1",
            (post_id,),
        ).fetchall()
        for row in stale:
            queued += self._insert_job(
                post_id=post_id,
                revision=row["revision"],
                action="unpublished",
                slug=row["slug"],
                payload=payload,
                generation=row["generation"],
                now=now,
            )
        return queued

    def _make_current_slug(self, post_id: str, slug: str, revision: str, generation: int) -> None:
        self.connection.execute(
            "INSERT INTO post_slugs(post_id, slug, revision, generation, is_current, needs_unpublish) "
            "VALUES (?, ?, ?, ?, 1, 0) "
            "ON CONFLICT(post_id, slug) DO UPDATE SET revision=excluded.revision, generation=excluded.generation, "
            "is_current=1, needs_unpublish=0",
            (post_id, slug, revision, generation),
        )

    def reconcile(self, posts: list[dict[str, Any]], now: float) -> dict[str, int]:
        """Apply a trusted complete snapshot; the first one only establishes baseline."""
        snapshot = self._normalise_posts(posts)
        counts = {"baseline": 0, "published": 0, "edited": 0, "unpublished": 0, "unchanged": 0}

        with self._transaction():
            if not self._has_baseline():
                for post in snapshot:
                    self.connection.execute(
                        "INSERT INTO posts(id, slug, revision, payload, generation, active) VALUES (?, ?, ?, ?, 1, 1)",
                        (post["id"], post["slug"], post["revision"], post["payload"]),
                    )
                    self._make_current_slug(post["id"], post["slug"], post["revision"], 1)
                self.connection.execute("INSERT INTO metadata(key, value) VALUES('baseline_complete', '1')")
                self._set_snapshot_metadata(now, len(snapshot))
                counts["baseline"] = len(snapshot)
                return counts

            by_id = {post["id"]: post for post in snapshot}
            existing_rows = self.connection.execute("SELECT * FROM posts").fetchall()
            existing_by_id = {row["id"]: row for row in existing_rows}

            for post_id, post in by_id.items():
                previous = existing_by_id.get(post_id)
                if previous is None:
                    generation = 1
                    self.connection.execute(
                        "INSERT INTO posts(id, slug, revision, payload, generation, active) VALUES (?, ?, ?, ?, ?, 1)",
                        (post_id, post["slug"], post["revision"], post["payload"], generation),
                    )
                    self._make_current_slug(post_id, post["slug"], post["revision"], generation)
                    if self._insert_job(post_id=post_id, revision=post["revision"], action="published", slug=post["slug"], payload=post["payload"], generation=generation, now=now):
                        counts["published"] += 1
                    continue

                generation = previous["generation"]
                slug_changed = previous["slug"] != post["slug"]
                revision_changed = previous["revision"] != post["revision"]
                reactivated = not previous["active"]
                if not (slug_changed or revision_changed or reactivated):
                    self.connection.execute("UPDATE posts SET payload=? WHERE id=?", (post["payload"], post_id))
                    counts["unchanged"] += 1
                    continue

                generation += 1
                self._supersede_pending_content_jobs(post_id, now)
                if slug_changed or reactivated:
                    self.connection.execute(
                        "UPDATE post_slugs SET is_current=0, needs_unpublish=1 WHERE post_id=? AND is_current=1",
                        (post_id,),
                    )
                self.connection.execute(
                    "UPDATE posts SET slug=?, revision=?, payload=?, generation=?, active=1 WHERE id=?",
                    (post["slug"], post["revision"], post["payload"], generation, post_id),
                )
                self._make_current_slug(post_id, post["slug"], post["revision"], generation)
                counts["unpublished"] += self._queue_stale_slug_unpublishes(post_id, post["payload"], now)

                action = "published" if slug_changed or reactivated else "edited"
                if self._insert_job(post_id=post_id, revision=post["revision"], action=action, slug=post["slug"], payload=post["payload"], generation=generation, now=now):
                    counts[action] += 1

            for post_id, previous in existing_by_id.items():
                if post_id in by_id or not previous["active"]:
                    continue
                generation = previous["generation"] + 1
                self._supersede_pending_content_jobs(post_id, now)
                self.connection.execute(
                    "UPDATE posts SET generation=?, active=0 WHERE id=?",
                    (generation, post_id),
                )
                self.connection.execute(
                    "UPDATE post_slugs SET generation=?, is_current=0, needs_unpublish=1 WHERE post_id=? AND is_current=1",
                    (generation, post_id),
                )
                counts["unpublished"] += self._queue_stale_slug_unpublishes(post_id, previous["payload"], now)

            self._set_snapshot_metadata(now, len(snapshot))
        return counts

    def due(self, now: float, limit: int = 5) -> list[dict[str, Any]]:
        if limit < 1:
            return []
        rows = self.connection.execute(
            "SELECT id, post_id, revision, action, slug, payload, generation, attempts, due_at "
            "FROM jobs WHERE status='pending' AND due_at<=? ORDER BY due_at, id LIMIT ?",
            (now, limit),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "postId": row["post_id"],
                "revision": row["revision"],
                "action": row["action"],
                "slug": row["slug"],
                "payload": json.loads(row["payload"]),
                "generation": row["generation"],
                "attempts": row["attempts"],
                "dueAt": row["due_at"],
            }
            for row in rows
        ]

    def finish(self, job_id: int, now: float, status: str = "done", detail: str = "") -> bool:
        if status not in {"done", "superseded"}:
            raise ValueError("finish status must be done or superseded")
        with self._transaction():
            row = self.connection.execute(
                "SELECT post_id, action, slug, generation FROM jobs WHERE id=? AND status='pending'",
                (job_id,),
            ).fetchone()
            if row is None:
                return False
            self.connection.execute(
                "UPDATE jobs SET status=?, detail=?, finished_at=? WHERE id=?",
                (status, detail[:1000], now, job_id),
            )
            if status == "done" and row["action"] == "unpublished":
                self.connection.execute(
                    "UPDATE post_slugs SET needs_unpublish=0 WHERE post_id=? AND slug=? AND generation=? AND is_current=0",
                    (row["post_id"], row["slug"], row["generation"]),
                )
        return True

    def retry(self, job_id: int, now: float, error: str, delay: float = 60.0, blocked: bool = False) -> bool:
        with self._transaction():
            row = self.connection.execute(
                "SELECT attempts FROM jobs WHERE id=? AND status='pending'",
                (job_id,),
            ).fetchone()
            if row is None:
                return False
            attempts = row["attempts"] + 1
            status = "blocked" if blocked or attempts >= MAX_ATTEMPTS else "pending"
            due_at = now if status == "blocked" else now + max(0.0, delay)
            self.connection.execute(
                "UPDATE jobs SET attempts=?, status=?, due_at=?, detail=? WHERE id=?",
                (attempts, status, due_at, error[:1000], job_id),
            )
        return True

    def defer(self, job_id: int, now: float, detail: str = "", delay: float = 300.0) -> bool:
        """Move observe-only work forward without treating it as a delivery error."""
        with self._transaction():
            result = self.connection.execute(
                "UPDATE jobs SET due_at=?, detail=? WHERE id=? AND status='pending'",
                (now + max(0.0, delay), detail[:1000], job_id),
            )
        return result.rowcount == 1

    def report(self) -> dict[str, Any]:
        status_rows = self.connection.execute(
            "SELECT status, COUNT(*) AS count FROM jobs GROUP BY status",
        ).fetchall()
        snapshot = self.connection.execute(
            "SELECT value FROM metadata WHERE key='last_snapshot'",
        ).fetchone()
        return {
            "jobs": {row["status"]: row["count"] for row in status_rows},
            "last_snapshot": json.loads(snapshot["value"]) if snapshot else None,
        }

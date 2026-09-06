"""Ghost -> durable outbox -> public readiness -> IndexNow. No third-party deps."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
from pathlib import Path
import random
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

from state import Store
from verify_public import HttpResult, NotReady, verify_post, verify_removed

FIELDS = ("id", "slug", "title", "html", "published_at", "updated_at", "feature_image",
          "feature_image_alt", "meta_title", "meta_description", "custom_excerpt", "excerpt", "reading_time")
INDEXNOW = "https://api.indexnow.org/indexnow"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class Failure(Exception):
    def __init__(self, code, *, blocked=False, delay=None):
        super().__init__(code)
        self.blocked, self.delay = blocked, delay


def source_revision(post):
    wire = ["ghost-publication-v1", *[str(post.get(key) if post.get(key) is not None else "") for key in FIELDS],
            (post.get("primary_tag") or {}).get("id", ""),
            [[tag["id"], tag["name"], tag["slug"]] for tag in post.get("tags", [])]]
    return hashlib.sha256(json.dumps(wire, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def timestamp(value):
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if result.tzinfo is None:
            raise ValueError()
        return result.timestamp()
    except (ValueError, TypeError, AttributeError):
        raise Failure("cms_invalid_timestamp") from None


def validate_config(config):
    site, ghost = urlsplit(config.get("site_url", "")), urlsplit(config.get("ghost_url", ""))
    for url in (site, ghost):
        if not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ("", "/"):
            raise Failure("invalid_origin_config", blocked=True)
        if url.scheme != "https" and not (url.scheme == "http" and url.hostname in ("127.0.0.1", "localhost")):
            raise Failure("insecure_origin_config", blocked=True)
    if not config.get("ghost_content_key") or not re.fullmatch(r"[a-zA-Z0-9-]{8,128}", config.get("indexnow_key", "")):
        raise Failure("missing_source_or_indexnow_config", blocked=True)
    if config.get("mode", "observe") not in ("observe", "active"):
        raise Failure("invalid_mode", blocked=True)
    if config.get("revalidate_secret") and len(config["revalidate_secret"]) < 32:
        raise Failure("invalid_revalidation_secret", blocked=True)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Transport:
    def __init__(self, config):
        # Public images may come only from explicitly configured, trusted origins.
        self.origins = {config["site_url"].rstrip("/"), config["ghost_url"].rstrip("/"), "https://cms.getmasterok.ru", "https://api.indexnow.org"}
        self.opener = build_opener(NoRedirect())

    def __call__(self, url, *, body=None, headers=None, limit=16 * 1024 * 1024):
        parsed = urlsplit(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if parsed.username or parsed.password or origin not in self.origins:
            raise Failure("unapproved_fetch_origin", blocked=True)
        request_headers = {"User-Agent": "MasterokPublication/1.0 (technical checks; no pageview JavaScript)", **(headers or {})}
        request = Request(url, data=body, headers=request_headers, method="POST" if body is not None else "GET")
        try:
            try:
                response = self.opener.open(request, timeout=12)
            except HTTPError as error:
                response = error
            with response:
                content = response.read(limit + 1)
                if len(content) > limit:
                    raise Failure("upstream_body_too_large")
                return HttpResult(response.status, {k.lower(): v for k, v in response.headers.items()}, content, url)
        except (URLError, TimeoutError, OSError):
            # urllib errors can contain URLs and the Ghost key. Never log them.
            raise Failure("upstream_unavailable") from None


def checked_status(response, label, now):
    if response.status in (200, 202):
        return
    if response.status in (401, 403, 400, 422):
        raise Failure(f"{label}_http_{response.status}", blocked=True)
    retry_after = response.headers.get("retry-after", "")
    delay = None
    if response.status == 429:
        try:
            delay = max(60, float(retry_after))
        except ValueError:
            try:
                delay = max(60, parsedate_to_datetime(retry_after).timestamp() - now)
            except (ValueError, TypeError, OverflowError):
                delay = 3600
        # Do not retry before the provider's requested time, even beyond one day.
    raise Failure(f"{label}_http_{response.status}", delay=delay)


def fetch_snapshot(config, transport):
    url = config["ghost_url"].rstrip("/") + "/ghost/api/content/posts/?" + urlencode({
        "key": config["ghost_content_key"], "include": "tags", "limit": "all", "order": "published_at desc"})
    response = transport(url, limit=16 * 1024 * 1024)
    checked_status(response, "cms", time.time())
    try:
        data = json.loads(response.body)
        posts = data["posts"]
        pagination = data["meta"]["pagination"]
        if not isinstance(posts, list) or not posts or pagination["pages"] != 1 or pagination["page"] != 1 or pagination["total"] != len(posts):
            raise ValueError()
        ids, slugs = set(), set()
        for post in posts:
            if not isinstance(post["id"], str) or not post["id"] or post["id"] in ids:
                raise ValueError()
            if not isinstance(post["slug"], str) or len(post["slug"]) > 200 or not SLUG.fullmatch(post["slug"]) or post["slug"] in slugs:
                raise ValueError()
            if not post.get("title") or not post.get("html"):
                raise ValueError()
            if timestamp(post.get("updated_at")) < timestamp(post.get("published_at")):
                raise ValueError()
            post["revision"] = source_revision(post)
            ids.add(post["id"])
            slugs.add(post["slug"])
        return posts
    except (ValueError, KeyError, TypeError):
        raise Failure("cms_incomplete_or_invalid_snapshot") from None


def json_body(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()


def process_cycle(config, store, transport, now=None):
    now = time.time() if now is None else now
    posts = fetch_snapshot(config, transport)
    # Reject a stale CMS response before it can roll a published revision back.
    previous = {row["id"]: json.loads(row["payload"]) for row in store.connection.execute("SELECT id,payload FROM posts")}
    for post in posts:
        if post["id"] in previous and timestamp(post["updated_at"]) < timestamp(previous[post["id"]]["updated_at"]):
            raise Failure("cms_snapshot_regressed")
    # A consistent-but-stale catalogue can omit a recently published article.
    # Confirm each newly missing ID directly; errors never become deletion events.
    current_ids = {post["id"] for post in posts}
    for row in store.connection.execute("SELECT id FROM posts WHERE active=1"):
        if row["id"] not in current_ids:
            url = config["ghost_url"].rstrip("/") + "/ghost/api/content/posts/" + quote(row["id"], safe="") + "/?" + urlencode({"key": config["ghost_content_key"]})
            lookup = transport(url, limit=2 * 1024 * 1024)
            if lookup.status == 404:
                continue
            checked_status(lookup, "cms_missing_id_lookup", now)
            raise Failure("cms_snapshot_missing_live_post")
    changes = store.reconcile(posts, now)
    active_slugs = {post["slug"] for post in posts}
    current = {post["id"]: post for post in posts}
    completed = 0
    for job in store.due(now, limit=5):
        try:
            if job["action"] == "unpublished":
                if job["slug"] in active_slugs:
                    store.finish(job["id"], now, status="superseded", detail="slug republished")
                    continue
            elif job["postId"] not in current or current[job["postId"]]["revision"] != job["revision"]:
                store.finish(job["id"], now, status="superseded", detail="source changed")
                continue
            # Optional latency optimisation. TTL is a verified independent path.
            if config.get("revalidate_secret") and config.get("mode") == "active":
                result = transport(config["site_url"].rstrip("/") + "/api/blog/revalidate", body=json_body({
                    "event": job["action"], "postId": job["postId"], "revision": job["revision"], "slug": job["slug"]}),
                    headers={"Content-Type": "application/json", "Authorization": "Bearer " + config["revalidate_secret"]})
                checked_status(result, "revalidate", now)
            if job["action"] == "unpublished":
                proof = verify_removed(job["slug"], config["site_url"], transport)
            else:
                proof = verify_post(current[job["postId"]], config["site_url"], transport)
            if config.get("mode", "observe") != "active":
                # Observe mode never consumes a pending submission or calls external write APIs.
                store.defer(job["id"], now, "observe_public_ready", delay=300)
                continue
            key = config["indexnow_key"]
            key_url = config["site_url"].rstrip("/") + "/" + key + ".txt"
            key_response = transport(key_url, limit=1024)
            if key_response.status != 200 or key_response.body.decode("ascii", errors="replace").strip() != key:
                raise Failure("indexnow_key_not_public", blocked=True)
            target = config["site_url"].rstrip("/") + "/blog/" + job["slug"] + "/"
            result = transport(INDEXNOW, body=json_body({"host": urlsplit(config["site_url"]).hostname,
                "key": key, "keyLocation": key_url, "urlList": [target]}), headers={"Content-Type": "application/json"})
            checked_status(result, "indexnow", now)
            store.finish(job["id"], time.time(), detail=json.dumps({"public_ready": proof, "indexnow_http": result.status}))
            completed += 1
        except (Failure, NotReady) as error:
            delay = getattr(error, "delay", None)
            store.retry(job["id"], now, str(error), delay=delay if delay is not None else min(3600, 60 * 2 ** job["attempts"]) + random.randint(0, 20), blocked=getattr(error, "blocked", False))
    return {"changes": changes, "completed": completed, **store.report()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="/etc/masterok-publication/config.json")
    parser.add_argument("--database", default="/var/lib/masterok-publication/queue.sqlite3")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--verify", metavar="SLUG", help="Read-only verification of one current article; never enqueue/send")
    parser.add_argument("--retry-blocked", action="store_true", help="Explicit operator action after fixing the cause")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    validate_config(config)
    lock = None
    if sys.platform != "win32" and not (args.health or args.status or args.verify):
        import fcntl
        Path(args.database).parent.mkdir(parents=True, exist_ok=True)
        lock = open(str(args.database) + ".lock", "a")
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    store = Store(args.database)
    try:
        transport = Transport(config)
        if args.health or args.status:
            result = store.report()
            stale = not result["last_snapshot"] or time.time() - result["last_snapshot"]["at"] > 600
            result["healthy"] = not stale and not result["jobs"].get("blocked", 0)
            print(json.dumps(result))
            return 1 if args.health and not result["healthy"] else 0
        if args.verify:
            posts = fetch_snapshot(config, transport)
            post = next((p for p in posts if p["slug"] == args.verify), None)
            if post is None:
                raise Failure("verification_slug_not_published")
            print(json.dumps(verify_post(post, config["site_url"], transport)))
            return 0
        if args.retry_blocked:
            store.connection.execute("UPDATE jobs SET status='pending',attempts=0,due_at=? WHERE status='blocked'", (time.time(),))
        result = process_cycle(config, store, transport)
        print(json.dumps(result))
        return 1 if result["jobs"].get("blocked", 0) else 0
    finally:
        store.close()
        if lock:
            lock.close()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (Failure, NotReady) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        # Do not print exception text/tracebacks with credential-bearing URLs.
        print(json.dumps({"error": "worker_internal_error", "type": type(error).__name__}), file=sys.stderr)
        sys.exit(1)

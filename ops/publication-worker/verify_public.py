"""Public, post-revalidation checks for the Ghost publication worker.

The injected transport is responsible for allow-listed hosts, body limits,
redirect refusal, and timeouts. This module deliberately never logs bodies or
secrets: callers receive only stable NotReady reason codes and safe metrics.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
import json
import re
from typing import Callable, Iterable
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET


MAX_HTML_BYTES = 2 * 1024 * 1024
MAX_XML_BYTES = 2 * 1024 * 1024
MAX_IMAGE_BYTES = 16 * 1024 * 1024
PUBLICATION_NS = "https://getmasterok.ru/ns/publication/1.0"
REVISION_RE = re.compile(r"^[0-9a-f]{64}$")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class HttpResult:
    status: int
    headers: dict
    body: bytes
    url: str


class NotReady(Exception):
    """An expected publication delay or public-contract failure.

    `code` is safe to persist and alert on. Do not expose response text.
    """

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class _PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.canonical: str | None = None
        self.robots: list[str] = []
        self.revision: str | None = None
        self.links: list[str] = []
        self.h1_parts: list[str] = []
        self.article_parts: list[str] = []
        self.jsonld_parts: list[str] = []
        self._in_h1 = 0
        self._in_article = 0
        self._in_jsonld = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        if tag == "link" and values.get("rel", "").lower() == "canonical":
            self.canonical = values.get("href")
        elif tag == "meta":
            name = values.get("name", "").lower()
            if name in {"robots", "googlebot", "yandex"}: self.robots.append(values.get("content", "").lower())
            if name == "masterok:source-revision": self.revision = values.get("content")
        elif tag == "a" and values.get("href"):
            self.links.append(values["href"])
        elif tag == "h1": self._in_h1 += 1
        elif tag == "article": self._in_article += 1
        elif tag == "script" and values.get("type", "").lower().split(";", 1)[0] == "application/ld+json":
            self._in_jsonld = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1" and self._in_h1: self._in_h1 -= 1
        elif tag == "article" and self._in_article: self._in_article -= 1
        elif tag == "script": self._in_jsonld = False

    def handle_data(self, data: str) -> None:
        text = " ".join(data.split())
        if not text: return
        if self._in_h1: self.h1_parts.append(text)
        if self._in_article: self.article_parts.append(text)
        if self._in_jsonld: self.jsonld_parts.append(data)


def _not_ready(condition: bool, code: str) -> None:
    if condition: raise NotReady(code)


def _site_base(site_url: str) -> str:
    parsed = urlparse(site_url)
    _not_ready(parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.query or parsed.fragment, "invalid_site_url")
    return f"{parsed.scheme}://{parsed.netloc}"


def _article_url(base: str, slug: str) -> str:
    _not_ready(not isinstance(slug, str) or not SLUG_RE.fullmatch(slug), "invalid_slug")
    return f"{base}/blog/{slug}/"


def _fetch(fetch: Callable[[str], HttpResult], url: str, limit: int, code: str) -> HttpResult:
    result = fetch(url)
    _not_ready(not isinstance(result, HttpResult), "invalid_transport_result")
    _not_ready(result.url != url, f"{code}_redirected")
    _not_ready(len(result.body) > limit, f"{code}_body_too_large")
    return result


def _header(headers: dict, name: str) -> str:
    for key, value in headers.items():
        if str(key).lower() == name.lower(): return str(value)
    return ""


def _parse_time(value: object, code: str) -> datetime:
    _not_ready(not isinstance(value, str) or not value.strip(), code)
    try:
        timestamp = value.strip().replace("Z", "+00:00")
        parsed = datetime.fromisoformat(timestamp)
    except ValueError as exc:
        raise NotReady(code) from exc
    return parsed.replace(tzinfo=parsed.tzinfo or timezone.utc).astimezone(timezone.utc)


def _parse_xml(body: bytes, code: str) -> ET.Element:
    _not_ready(b"<!doctype" in body.lower(), f"{code}_doctype")
    try:
        return ET.fromstring(body)
    except ET.ParseError as exc:
        raise NotReady(f"{code}_invalid") from exc


def _absolute(value: str | None, base: str) -> str | None:
    if not value: return None
    return urljoin(base, value)


def _jsonld_objects(values: Iterable[str]) -> Iterable[dict]:
    for value in values:
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError:
            continue
        candidates = decoded if isinstance(decoded, list) else [decoded]
        for candidate in candidates:
            if not isinstance(candidate, dict): continue
            graph = candidate.get("@graph")
            yield candidate
            if isinstance(graph, list):
                yield from (entry for entry in graph if isinstance(entry, dict))


def _blog_posting(parser: _PageParser) -> dict:
    for item in _jsonld_objects(parser.jsonld_parts):
        kind = item.get("@type")
        if kind == "BlogPosting" or (isinstance(kind, list) and "BlogPosting" in kind): return item
    raise NotReady("blogposting_missing")


def _image_url(value: object) -> str:
    if isinstance(value, list):
        for item in value:
            try: return _image_url(item)
            except NotReady: pass
    if isinstance(value, str): return value
    if isinstance(value, dict):
        candidate = value.get("url") or value.get("contentUrl")
        if isinstance(candidate, str): return candidate
    raise NotReady("hero_image_missing")


def _image_dimensions(body: bytes, content_type: str) -> tuple[int, int]:
    media_type = content_type.split(";", 1)[0].strip().lower()
    try:
        if media_type == "image/png" and body[:8] == b"\x89PNG\r\n\x1a\n":
            return int.from_bytes(body[16:20], "big"), int.from_bytes(body[20:24], "big")
        if media_type == "image/jpeg" and body[:2] == b"\xff\xd8":
            offset = 2
            while offset + 9 <= len(body):
                if body[offset] != 0xff: offset += 1; continue
                marker = body[offset + 1]; offset += 2
                if marker in {0xd8, 0xd9}: continue
                length = int.from_bytes(body[offset:offset + 2], "big")
                if length < 2 or offset + length > len(body): break
                if marker in {0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf}:
                    return int.from_bytes(body[offset + 5:offset + 7], "big"), int.from_bytes(body[offset + 3:offset + 5], "big")
                offset += length
        if media_type == "image/webp" and body[:4] == b"RIFF" and body[8:12] == b"WEBP":
            kind = body[12:16]
            if kind == b"VP8X": return 1 + int.from_bytes(body[24:27], "little"), 1 + int.from_bytes(body[27:30], "little")
            if kind == b"VP8 ": return int.from_bytes(body[26:28], "little") & 0x3fff, int.from_bytes(body[28:30], "little") & 0x3fff
            if kind == b"VP8L":
                bits = int.from_bytes(body[21:25], "little")
                return 1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)
    except IndexError:
        pass
    raise NotReady("hero_image_dimensions_unsupported")


def _require_post(post: dict) -> tuple[str, str, datetime, datetime]:
    _not_ready(not isinstance(post, dict), "invalid_post")
    for field in ("id", "title"):
        _not_ready(not isinstance(post.get(field), str) or not post[field].strip(), f"invalid_post_{field}")
    revision = post.get("revision")
    _not_ready(not isinstance(revision, str) or not REVISION_RE.fullmatch(revision), "invalid_post_revision")
    return _article_url("", post.get("slug", "")), revision, _parse_time(post.get("updated_at"), "invalid_post_updated_at"), _parse_time(post.get("published_at"), "invalid_post_published_at")


def verify_post(post: dict, site_url: str, fetch: Callable[[str], HttpResult]) -> dict:
    """Validate public page, discovery surfaces and hero without exposing bodies."""
    base = _site_base(site_url)
    _, revision, updated_at, published_at = _require_post(post)
    canonical = _article_url(base, post["slug"])
    page = _fetch(fetch, canonical, MAX_HTML_BYTES, "article")
    _not_ready(page.status != 200, "article_not_200")
    try: parser = _PageParser(); parser.feed(page.body.decode("utf-8")); parser.close()
    except (UnicodeDecodeError, ValueError) as exc: raise NotReady("article_html_invalid") from exc
    _not_ready(_absolute(parser.canonical, canonical) != canonical, "canonical_mismatch")
    robot_values = parser.robots + [_header(page.headers, "x-robots-tag").lower()]
    _not_ready(any("noindex" in value for value in robot_values), "robots_noindex")
    _not_ready(not " ".join(parser.h1_parts).strip(), "h1_missing")
    _not_ready(not " ".join(parser.article_parts).strip(), "article_body_missing")
    _not_ready(parser.revision != revision, "source_revision_mismatch")
    posting = _blog_posting(parser)
    _not_ready(_absolute(posting.get("url"), canonical) != canonical, "blogposting_url_mismatch")
    modified = _parse_time(posting.get("dateModified"), "blogposting_date_modified_invalid")
    _not_ready(modified < updated_at, "blogposting_date_modified_stale")
    _not_ready(_parse_time(posting.get("datePublished"), "blogposting_date_published_invalid") != published_at, "blogposting_date_published_mismatch")

    index = _fetch(fetch, f"{base}/blog/", MAX_HTML_BYTES, "blog")
    _not_ready(index.status != 200, "blog_not_200")
    try: index_parser = _PageParser(); index_parser.feed(index.body.decode("utf-8")); index_parser.close()
    except UnicodeDecodeError as exc: raise NotReady("blog_html_invalid") from exc
    _not_ready(canonical not in {_absolute(link, f"{base}/blog/") for link in index_parser.links}, "blog_link_missing")

    sitemap = _fetch(fetch, f"{base}/sitemap/4.xml", MAX_XML_BYTES, "sitemap")
    _not_ready(sitemap.status != 200, "sitemap_not_200")
    root = _parse_xml(sitemap.body, "sitemap")
    found_lastmod = None
    for entry in root.findall("{*}url"):
        if (entry.findtext("{*}loc") or "").strip() == canonical: found_lastmod = entry.findtext("{*}lastmod"); break
    _not_ready(found_lastmod is None, "sitemap_loc_missing")
    _not_ready(_parse_time(found_lastmod, "sitemap_lastmod_invalid") < updated_at, "sitemap_lastmod_stale")

    rss = _fetch(fetch, f"{base}/rss.xml", MAX_XML_BYTES, "rss")
    _not_ready(rss.status != 200, "rss_not_200")
    rss_root = _parse_xml(rss.body, "rss")
    item = next((node for node in rss_root.findall(".//item") if (node.findtext("link") or "").strip() == canonical), None)
    _not_ready(item is None, "rss_item_missing")
    content = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or item.findtext("description") or ""
    _not_ready(not content.strip(), "rss_content_missing")
    _not_ready((item.findtext(f"{{{PUBLICATION_NS}}}sourceRevision") or "").strip() != revision, "rss_source_revision_mismatch")
    try: rss_date = parsedate_to_datetime((item.findtext("pubDate") or "").strip()).astimezone(timezone.utc)
    except (TypeError, ValueError) as exc: raise NotReady("rss_pubdate_invalid") from exc
    _not_ready(rss_date != published_at, "rss_pubdate_mismatch")

    image_url = _absolute(_image_url(posting.get("image")), canonical)
    _not_ready(image_url is None or urlparse(image_url).scheme not in {"http", "https"}, "hero_image_url_invalid")
    image = _fetch(fetch, image_url, MAX_IMAGE_BYTES, "hero_image")
    _not_ready(image.status != 200, "hero_image_not_200")
    content_type = _header(image.headers, "content-type")
    width, height = _image_dimensions(image.body, content_type)
    _not_ready(width < 1200, "hero_image_too_small")
    return {"canonical": canonical, "revision": revision, "article_status": page.status, "sitemap_lastmod": found_lastmod, "rss_pub_date": rss_date.isoformat(), "hero": {"content_type": content_type.split(";", 1)[0].lower(), "width": width, "height": height}}


def verify_removed(slug: str, site_url: str, fetch: Callable[[str], HttpResult]) -> dict:
    """Require the former public URL to be gone from all discovery surfaces."""
    base, canonical = _site_base(site_url), _article_url(_site_base(site_url), slug)
    page = _fetch(fetch, canonical, MAX_HTML_BYTES, "article")
    _not_ready(page.status not in {404, 410}, "removed_article_still_public")
    blog_url = f"{base}/blog/"
    blog = _fetch(fetch, blog_url, MAX_HTML_BYTES, "blog")
    _not_ready(blog.status != 200, "removed_blog_not_200")
    try: blog_parser = _PageParser(); blog_parser.feed(blog.body.decode("utf-8")); blog_parser.close()
    except UnicodeDecodeError as exc: raise NotReady("removed_blog_html_invalid") from exc
    _not_ready(canonical in {_absolute(link, blog_url) for link in blog_parser.links}, "removed_blog_still_links")

    sitemap = _fetch(fetch, f"{base}/sitemap/4.xml", MAX_XML_BYTES, "sitemap")
    _not_ready(sitemap.status != 200, "removed_sitemap_not_200")
    sitemap_root = _parse_xml(sitemap.body, "removed_sitemap")
    _not_ready(any((node.text or "").strip() == canonical for node in sitemap_root.findall(".//{*}loc")), "removed_sitemap_still_links")

    rss = _fetch(fetch, f"{base}/rss.xml", MAX_XML_BYTES, "rss")
    _not_ready(rss.status != 200, "removed_rss_not_200")
    rss_root = _parse_xml(rss.body, "removed_rss")
    _not_ready(any((node.text or "").strip() == canonical for node in rss_root.findall(".//link")), "removed_rss_still_links")
    return {"canonical": canonical, "article_status": page.status, "removed": True}

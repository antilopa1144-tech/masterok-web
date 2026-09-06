import hashlib
import unittest

from verify_public import HttpResult, NotReady, verify_post, verify_removed


BASE = "https://getmasterok.ru"
SLUG = "test-post"
CANONICAL = f"{BASE}/blog/{SLUG}/"
REVISION = hashlib.sha256(b"revision").hexdigest()
POST = {"id": "post-1", "slug": SLUG, "revision": REVISION, "title": "Override title", "updated_at": "2026-09-06T10:00:00Z", "published_at": "2026-09-06T09:00:00Z"}


def response(url, status=200, body=b"", headers=None, actual=None):
    return HttpResult(status, headers or {}, body, actual or url)


def page(robots="index,follow", revision=REVISION, bot_meta=""):
    return f'''<html><head><link rel="canonical" href="{CANONICAL}"><meta name="robots" content="{robots}">{bot_meta}<meta name="masterok:source-revision" content="{revision}"><script type="application/ld+json">{{"@context":"https://schema.org","@type":"BlogPosting","url":"{CANONICAL}","datePublished":"2026-09-06T09:00:00Z","dateModified":"2026-09-06T10:00:00Z","image":{{"@type":"ImageObject","url":"https://images.example/hero.png"}}}}</script></head><body><article><h1>Rendered article title</h1><p>Useful public article text.</p></article></body></html>'''.encode()


PNG_1200 = b"\x89PNG\r\n\x1a\n" + b"\0" * 8 + (1200).to_bytes(4, "big") + (630).to_bytes(4, "big")


def routes(article=None, sitemap=None, rss=None, blog=None, image=None, rss_revision=REVISION):
    return {
        CANONICAL: article or response(CANONICAL, body=page()),
        f"{BASE}/blog/": blog or response(f"{BASE}/blog/", body=f'<a href="{CANONICAL}">Post</a>'.encode()),
        f"{BASE}/sitemap/4.xml": sitemap or response(f"{BASE}/sitemap/4.xml", body=f"<urlset><url><loc>{CANONICAL}</loc><lastmod>2026-09-06T10:00:00Z</lastmod></url></urlset>".encode()),
        f"{BASE}/rss.xml": rss or response(f"{BASE}/rss.xml", body=f'''<rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:masterok="https://getmasterok.ru/ns/publication/1.0"><channel><item><link>{CANONICAL}</link><content:encoded>Public content</content:encoded><masterok:sourceRevision>{rss_revision}</masterok:sourceRevision><pubDate>Sat, 06 Sep 2026 09:00:00 GMT</pubDate></item></channel></rss>'''.encode()),
        "https://images.example/hero.png": image or response("https://images.example/hero.png", body=PNG_1200, headers={"content-type": "image/png"}),
    }


def fetcher(mapping):
    return lambda url: mapping[url]


class VerifyPostTests(unittest.TestCase):
    def assert_code(self, code, **changes):
        with self.assertRaises(NotReady) as caught: verify_post(POST, BASE, fetcher(routes(**changes)))
        self.assertEqual(caught.exception.code, code)

    def test_good_flow_returns_safe_evidence(self):
        result = verify_post(POST, BASE, fetcher(routes()))
        self.assertEqual(result["canonical"], CANONICAL)
        self.assertEqual(result["hero"]["width"], 1200)
        self.assertNotIn("body", result)

    def test_old_revision_is_not_ready(self): self.assert_code("source_revision_mismatch", article=response(CANONICAL, body=page(revision="0" * 64)))
    def test_redirect_is_not_ready(self): self.assert_code("article_redirected", article=response(CANONICAL, body=page(), actual=f"{CANONICAL}?redirected"))
    def test_noindex_is_not_ready(self): self.assert_code("robots_noindex", article=response(CANONICAL, body=page(robots="noindex")))
    def test_x_robots_noindex_is_not_ready(self): self.assert_code("robots_noindex", article=response(CANONICAL, body=page(), headers={"X-Robots-Tag": "noindex"}))
    def test_yandexbot_noindex_is_not_ready(self): self.assert_code("robots_noindex", article=response(CANONICAL, body=page(bot_meta='<meta name="yandex" content="noindex">')))
    def test_bad_sitemap_xml_is_not_ready(self): self.assert_code("sitemap_invalid", sitemap=response(f"{BASE}/sitemap/4.xml", body=b"<urlset>"))
    def test_sitemap_doctype_is_not_ready(self): self.assert_code("sitemap_doctype", sitemap=response(f"{BASE}/sitemap/4.xml", body=b"<!DOCTYPE urlset><urlset/>"))
    def test_sitemap_missing_link_is_not_ready(self): self.assert_code("sitemap_loc_missing", sitemap=response(f"{BASE}/sitemap/4.xml", body=b"<urlset/>"))
    def test_blog_missing_link_is_not_ready(self): self.assert_code("blog_link_missing", blog=response(f"{BASE}/blog/", body=b"<html/>"))
    def test_rss_missing_link_is_not_ready(self): self.assert_code("rss_item_missing", rss=response(f"{BASE}/rss.xml", body=b"<rss><channel/></rss>"))
    def test_stale_rss_edit_is_not_ready(self): self.assert_code("rss_source_revision_mismatch", rss_revision="0" * 64)
    def test_unavailable_image_is_not_ready(self): self.assert_code("hero_image_not_200", image=response("https://images.example/hero.png", status=503))
    def test_small_image_is_not_ready(self):
        small = PNG_1200[:16] + (1199).to_bytes(4, "big") + (630).to_bytes(4, "big")
        self.assert_code("hero_image_too_small", image=response("https://images.example/hero.png", body=small, headers={"content-type": "image/png"}))


class VerifyRemovalTests(unittest.TestCase):
    def test_removal_requires_404_and_no_discovery_links(self):
        mapping = routes(article=response(CANONICAL, status=404), blog=response(f"{BASE}/blog/", body=b"<html/>"), sitemap=response(f"{BASE}/sitemap/4.xml", body=b"<urlset/>"), rss=response(f"{BASE}/rss.xml", body=b"<rss><channel/></rss>"))
        self.assertTrue(verify_removed(SLUG, BASE, fetcher(mapping))["removed"])

    def test_removal_rejects_stale_rss_link(self):
        mapping = routes(article=response(CANONICAL, status=410), blog=response(f"{BASE}/blog/", body=b"<html/>"), sitemap=response(f"{BASE}/sitemap/4.xml", body=b"<urlset/>"))
        with self.assertRaises(NotReady) as caught: verify_removed(SLUG, BASE, fetcher(mapping))
        self.assertEqual(caught.exception.code, "removed_rss_still_links")

    def test_removal_rejects_stale_relative_blog_link(self):
        mapping = routes(article=response(CANONICAL, status=404), blog=response(f"{BASE}/blog/", body=b'<a href="/blog/test-post/">stale</a>'), sitemap=response(f"{BASE}/sitemap/4.xml", body=b"<urlset/>"), rss=response(f"{BASE}/rss.xml", body=b"<rss><channel/></rss>"))
        with self.assertRaises(NotReady) as caught: verify_removed(SLUG, BASE, fetcher(mapping))
        self.assertEqual(caught.exception.code, "removed_blog_still_links")

    def test_removal_rejects_malformed_sitemap(self):
        mapping = routes(article=response(CANONICAL, status=404), blog=response(f"{BASE}/blog/", body=b"<html/>"), sitemap=response(f"{BASE}/sitemap/4.xml", body=b"<urlset>"), rss=response(f"{BASE}/rss.xml", body=b"<rss><channel/></rss>"))
        with self.assertRaises(NotReady) as caught: verify_removed(SLUG, BASE, fetcher(mapping))
        self.assertEqual(caught.exception.code, "removed_sitemap_invalid")


if __name__ == "__main__": unittest.main()

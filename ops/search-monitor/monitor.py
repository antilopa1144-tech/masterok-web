#!/usr/bin/env python3
"""Read-only Search Console snapshotter; it never submits URLs or sitemaps."""
from __future__ import annotations
import argparse, json, os, re, tempfile
from datetime import date, timedelta, timezone, datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urlparse, quote
import xml.etree.ElementTree as ET

SITE = "https://getmasterok.ru/"
SITEMAP = SITE + "sitemap/4.xml"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
MAX_URLS, TIMEOUT, MAX_BODY = 100, 15, 2 * 1024 * 1024
SLUG = re.compile(r"^/blog/[a-z0-9]+(?:-[a-z0-9]+)*/$")

class MonitorError(Exception):
    def __init__(self, code): super().__init__(code); self.code = code

def final_dates(today=None):
    # Search Console uses Pacific dates; lag keeps only final data.
    if today is None:
        from zoneinfo import ZoneInfo
        today = datetime.now(ZoneInfo("America/Los_Angeles")).date()
    end = today - timedelta(days=3)
    return (end - timedelta(days=6)).isoformat(), end.isoformat()

def canonical_blog_urls(xml, site=SITE):
    if b"<!doctype" in xml.lower(): raise MonitorError("sitemap_doctype")
    try: root = ET.fromstring(xml)
    except ET.ParseError as exc: raise MonitorError("sitemap_invalid") from exc
    if root.tag.split("}")[-1] != "urlset": raise MonitorError("sitemap_not_urlset")
    origin = urlparse(site)
    urls = []
    for node in root.findall(".//{*}loc"):
        value = (node.text or "").strip(); parsed = urlparse(value)
        if parsed.scheme == origin.scheme and parsed.netloc == origin.netloc and not parsed.query and not parsed.fragment and SLUG.fullmatch(parsed.path):
            if value not in urls: urls.append(value)
        if len(urls) >= MAX_URLS: break
    if not urls: raise MonitorError("sitemap_no_blog_urls")
    return urls

class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args): return None
class Http:
    def __init__(self): self.opener = build_opener(_NoRedirect)
    def get(self, url, headers=None): return self.request("GET", url, None, headers or {})
    def post(self, url, payload, headers=None): return self.request("POST", url, json.dumps(payload).encode(), headers or {})
    def request(self, method, url, data, headers):
        request = Request(url, data=data, headers=headers, method=method)
        try:
            with self.opener.open(request, timeout=TIMEOUT) as response:
                if response.geturl() != url: raise MonitorError("redirected")
                body = response.read(MAX_BODY + 1)
                if len(body) > MAX_BODY: raise MonitorError("body_too_large")
                return response.status, body
        except HTTPError as exc: raise MonitorError(f"http_{exc.code}") from exc
        except (URLError, TimeoutError) as exc: raise MonitorError("network_unavailable") from exc

class SearchConsole:
    def __init__(self, http, token): self.http, self.headers = http, {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    def inspect(self, url):
        endpoint = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
        return self._safe_post(endpoint, {"inspectionUrl": url, "siteUrl": SITE, "languageCode": "ru"})
    def analytics(self, kind, start, end):
        endpoint = "https://www.googleapis.com/webmasters/v3/sites/" + quote(SITE, safe="") + "/searchAnalytics/query"
        return self._safe_post(endpoint, {"startDate": start, "endDate": end, "dimensions": ["date", "page"], "type": kind, "rowLimit": 25000, "dataState": "final", "dimensionFilterGroups": [{"filters": [{"dimension": "page", "operator": "includingRegex", "expression": "^https://getmasterok\\.ru/blog/"}]}]})
    def _safe_post(self, endpoint, payload):
        try: status, body = self.http.post(endpoint, payload, self.headers)
        except MonitorError as exc: return {"_error": exc.code}
        if not 200 <= status < 300: return {"_error": f"google_http_{status}"}
        try:
            parsed = json.loads(body)
            return parsed if isinstance(parsed, dict) else {"_error": "google_invalid_json"}
        except (TypeError, json.JSONDecodeError): return {"_error": "google_invalid_json"}

def service_token(key_path):
    try:
        from google.auth.transport.requests import Request as GoogleRequest
        from google.oauth2 import service_account
        credentials = service_account.Credentials.from_service_account_file(key_path, scopes=[SCOPE])
        credentials.refresh(GoogleRequest())
        return credentials.token
    except Exception as exc: raise MonitorError("service_account_unavailable") from exc

def run(http, console, now=None, state_dir=None):
    status, sitemap = http.get(SITEMAP)
    if status != 200: raise MonitorError(f"sitemap_http_{status}")
    urls, (start, end) = canonical_blog_urls(sitemap), final_dates(now)
    inspections = {}
    for url in urls:
        result = console.inspect(url)
        if "_error" in result:
            inspections[url] = {"state": "error", "code": result["_error"]}
            continue
        inspection = result.get("inspectionResult")
        index = inspection.get("indexStatusResult") if isinstance(inspection, dict) else None
        if not isinstance(index, dict):
            inspections[url] = {"state": "error", "code": "inspection_missing_status"}
            continue
        verdict = index.get("verdict")
        if not verdict:
            inspections[url] = {"state": "error", "code": "inspection_missing_status"}
            continue
        inspections[url] = {"verdict": verdict, "coverageState": index.get("coverageState"), "lastCrawlTime": index.get("lastCrawlTime"), "googleCanonical": index.get("googleCanonical"), "userCanonical": index.get("userCanonical"), "indexingState": index.get("indexingState")}
    analytics = {}
    for kind in ("web", "discover"):
        reply = console.analytics(kind, start, end)
        rows = reply.get('rows')
        if '_error' in reply:
            analytics[kind] = {'state': 'error', 'code': reply['_error']}
        elif rows is not None and not isinstance(rows, list):
            analytics[kind] = {'state': 'error', 'code': 'analytics_invalid_rows'}
        else:
            analytics[kind] = {'state': 'rows' if rows else 'no_rows', 'rows': rows or None, 'truncated': len(rows or []) >= 25000}
    state_dir = state_dir or STATE_DIR
    prior = load_latest(state_dir)
    if prior and prior.get("_corrupt"):
        raise MonitorError("state_corrupt")
    first = dict(prior.get("firstObservedIndexed", {})) if prior else {}
    observed = (now or date.today()).isoformat()
    for url, result in inspections.items():
        if result.get("verdict") == "PASS" and url not in first: first[url] = observed
    partial = any(value.get("state") == "error" for value in inspections.values()) or any(value.get("state") == "error" for value in analytics.values())
    return {"state": "partial" if partial else "ok", "generatedAt": datetime.now(timezone.utc).isoformat(), "site": SITE, "window": {"start": start, "end": end, "dataState": "final", "timezone": "America/Los_Angeles"}, "urls": urls, "inspections": inspections, "analytics": analytics, "firstObservedIndexed": first}

STATE_DIR = Path("/var/lib/masterok-search")
def load_latest(state):
    path = state / "latest.json"
    try:
        result = json.loads(path.read_text("utf-8"))
        if not isinstance(result, dict) or not isinstance(result.get('firstObservedIndexed'), dict):
            return {"_corrupt": True}
        if datetime.fromisoformat(result['generatedAt']).tzinfo is None:
            return {"_corrupt": True}
        return result
    except FileNotFoundError: return None
    except (OSError, ValueError, KeyError, TypeError): return {"_corrupt": True}
def write_snapshot(report, state):
    state.mkdir(mode=0o700, parents=True, exist_ok=True)
    stamp = report["generatedAt"].replace(":", "-")
    target = state / f"snapshot-{stamp}.json"; temporary = state / ".latest.tmp"
    temporary.write_text(json.dumps(report, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(temporary, target)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=state, delete=False) as handle:
        json.dump(report, handle, ensure_ascii=False, sort_keys=True); handle.write("\n"); name = handle.name
    os.replace(name, state / "latest.json")
    for old in sorted(state.glob("snapshot-*.json"))[:-30]: old.unlink()

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--status", action="store_true"); parser.add_argument("--health", action="store_true"); parser.add_argument("--key", default="/etc/masterok-search/google-service-account.json"); parser.add_argument("--state", default=str(STATE_DIR)); args = parser.parse_args(); state = Path(args.state)
    if args.status or args.health:
        latest = load_latest(state); age = None if not latest or latest.get("_corrupt") else (datetime.now(timezone.utc) - datetime.fromisoformat(latest["generatedAt"])).total_seconds() / 3600
        endpoint_errors = [] if not latest else [value.get("code") for value in latest.get("inspections", {}).values() if value.get("state") == "error"] + [value.get("code") for value in latest.get("analytics", {}).values() if value.get("state") == "error"]
        health = 'no_snapshot' if not latest else 'corrupt' if latest.get('_corrupt') else 'stale' if age > 36 or age < -0.25 else latest.get('state', 'error')
        failure = state / 'last-failure.json'
        last_failure = json.loads(failure.read_text()) if failure.exists() else None
        if last_failure: health = 'error'
        print(json.dumps({"state": health, "ageHours": age, "lastError": last_failure or (endpoint_errors or [None])[0]})); return 1 if args.health and health != "ok" else 0
    try:
        http = Http(); report = run(http, SearchConsole(http, service_token(args.key)), state_dir=state)
        write_snapshot(report, state)
    except Exception as exc:
        code = exc.code if isinstance(exc, MonitorError) else 'monitor_unexpected_error'
        state.mkdir(mode=0o700, parents=True, exist_ok=True)
        failure = state / '.failure.tmp'
        failure.write_text(json.dumps({'code': code, 'at': datetime.now(timezone.utc).isoformat()}))
        os.replace(failure, state / 'last-failure.json')
        raise MonitorError(code) from None
    (state / 'last-failure.json').unlink(missing_ok=True)
    print(json.dumps({"state": report["state"], "generatedAt": report["generatedAt"]}))
    return 1 if report['state'] != 'ok' else 0
if __name__ == "__main__":
    try: raise SystemExit(main() or 0)
    except MonitorError as exc: print(json.dumps({"state": "error", "code": exc.code})); raise SystemExit(1)

#!/usr/bin/env python3
"""Read-only query-to-URL report from Yandex.Webmaster.

The API uses POST for this reporting endpoint, but the operation only reads
search analytics. OAuth tokens are read from the same protected file as the
daily Yandex monitor and are never included in the output.
"""
from __future__ import annotations

import argparse
import json
from urllib.parse import quote, urlsplit

from monitor import Http, MonitorError
from yandex_monitor import API, Yandex, choose_host, safe_json, token_data

PAGE_SIZE = 500
MAX_PAGES = 20


def normalize_filter_value(filter_indicator: str, value: str) -> str:
    """Match the URL representation returned by Yandex query analytics."""
    if filter_indicator != "URL":
        return value
    parsed = urlsplit(value)
    if not parsed.scheme or not parsed.netloc:
        return value
    normalized = parsed.path or "/"
    if parsed.query:
        normalized += f"?{parsed.query}"
    return normalized


class QueryAnalytics:
    def __init__(self, http: Http, token: str) -> None:
        self.http = http
        self.headers = {
            "Authorization": f"OAuth {token}",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=UTF-8",
        }

    def list(self, user_id: str, host_id: str, payload: dict) -> dict:
        endpoint = (
            f"{API}/user/{quote(user_id, safe='')}/hosts/"
            f"{quote(host_id, safe='')}/query-analytics/list"
        )
        try:
            status, body = self.http.post(endpoint, payload, self.headers)
        except MonitorError as exc:
            raise MonitorError(f"analytics_{exc.code}") from exc
        if not 200 <= status < 300:
            raise MonitorError(f"analytics_http_{status}")
        return safe_json(body)


def fetch_report(
    http: Http,
    token: str,
    *,
    text_indicator: str,
    filter_indicator: str,
    operation: str,
    value: str,
) -> dict:
    api_filter_value = normalize_filter_value(filter_indicator, value)
    identity = Yandex(http, token)
    user = identity.user()
    if "_error" in user:
        raise MonitorError("user_" + user["_error"])
    user_id = user.get("user_id")
    if not isinstance(user_id, (str, int)) or not str(user_id).isdigit():
        raise MonitorError("user_invalid")

    hosts = identity.hosts(user_id)
    if "_error" in hosts:
        raise MonitorError("hosts_" + hosts["_error"])
    host_id = choose_host(hosts)

    client = QueryAnalytics(http, token)
    rows: list[dict] = []
    total: int | None = None
    for page in range(MAX_PAGES):
        payload = {
            "offset": page * PAGE_SIZE,
            "limit": PAGE_SIZE,
            "device_type_indicator": "ALL",
            "search_location": "WEB_LOCATION",
            "text_indicator": text_indicator,
            "filters": {
                "text_filters": [
                    {
                        "text_indicator": filter_indicator,
                        "operation": operation,
                        "value": api_filter_value,
                    }
                ]
            },
        }
        reply = client.list(str(user_id), host_id, payload)
        batch = reply.get("text_indicator_to_statistics")
        count = reply.get("count")
        if not isinstance(batch, list) or not isinstance(count, int) or count < 0:
            raise MonitorError("analytics_invalid_response")
        if any(not isinstance(row, dict) for row in batch):
            raise MonitorError("analytics_invalid_row")
        rows.extend(batch)
        total = count
        if len(batch) < PAGE_SIZE or len(rows) >= count:
            break

    return {
        "state": "rows" if rows else "empty",
        "source": "Yandex.Webmaster query-analytics/list",
        "searchLocation": "WEB_LOCATION",
        "deviceType": "ALL",
        "textIndicator": text_indicator,
        "filter": {
            "textIndicator": filter_indicator,
            "operation": operation,
            "inputValue": value,
            "value": api_filter_value,
        },
        "count": total,
        "returned": len(rows),
        "truncated": total is not None and len(rows) < total,
        "rows": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--token",
        default="/etc/masterok-search/yandex-webmaster-token.json",
    )
    parser.add_argument("--text-indicator", choices=("QUERY", "URL"), required=True)
    parser.add_argument("--filter-indicator", choices=("QUERY", "URL"), required=True)
    parser.add_argument(
        "--operation",
        choices=("TEXT_CONTAINS", "TEXT_MATCH", "TEXT_DOES_NOT_CONTAIN"),
        default="TEXT_CONTAINS",
    )
    parser.add_argument("--value", required=True)
    args = parser.parse_args()

    try:
        token, _ = token_data(args.token)
        report = fetch_report(
            Http(),
            token,
            text_indicator=args.text_indicator,
            filter_indicator=args.filter_indicator,
            operation=args.operation,
            value=args.value,
        )
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 0
    except Exception as exc:
        code = exc.code if isinstance(exc, MonitorError) else "unexpected_error"
        print(json.dumps({"state": "error", "code": code}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

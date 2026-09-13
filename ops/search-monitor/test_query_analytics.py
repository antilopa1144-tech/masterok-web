import unittest

import query_analytics as q


class FakeHttp:
    def __init__(self, replies):
        self.replies = list(replies)
        self.posts = []

    def get(self, url, headers):
        return self.replies.pop(0)

    def post(self, url, payload, headers):
        self.posts.append((url, payload, headers))
        return self.replies.pop(0)


class QueryAnalyticsTest(unittest.TestCase):
    def base_replies(self, analytics):
        return [
            (200, b'{"user_id":7}'),
            (
                200,
                b'{"hosts":[{"ascii_host_url":"https://getmasterok.ru/",'
                b'"host_id":"https:getmasterok.ru:443"}]}',
            ),
            analytics,
        ]

    def test_filters_queries_by_exact_url_without_exposing_token(self):
        response = (
            200,
            b'{"count":1,"text_indicator_to_statistics":['
            b'{"text_indicator":{"type":"QUERY","value":"primer calc"},'
            b'"statistics":[]}]}',
        )
        http = FakeHttp(self.base_replies(response))
        report = q.fetch_report(
            http,
            "secret-token",
            text_indicator="QUERY",
            filter_indicator="URL",
            operation="TEXT_MATCH",
            value="https://getmasterok.ru/kalkulyatory/otdelka/gruntovka/",
        )

        self.assertEqual(report["state"], "rows")
        self.assertEqual(report["returned"], 1)
        self.assertNotIn("secret-token", str(report))
        _, payload, headers = http.posts[0]
        self.assertEqual(payload["filters"]["text_filters"][0]["text_indicator"], "URL")
        self.assertEqual(payload["filters"]["text_filters"][0]["operation"], "TEXT_MATCH")
        self.assertEqual(
            payload["filters"]["text_filters"][0]["value"],
            "/kalkulyatory/otdelka/gruntovka/",
        )
        self.assertEqual(
            report["filter"]["inputValue"],
            "https://getmasterok.ru/kalkulyatory/otdelka/gruntovka/",
        )
        self.assertEqual(headers["Authorization"], "OAuth secret-token")

    def test_preserves_query_filter_text(self):
        self.assertEqual(q.normalize_filter_value("QUERY", "расход грунтовки"), "расход грунтовки")

    def test_preserves_relative_url_filter(self):
        self.assertEqual(
            q.normalize_filter_value("URL", "/kalkulyatory/otdelka/gruntovka/"),
            "/kalkulyatory/otdelka/gruntovka/",
        )

    def test_reports_empty_result(self):
        http = FakeHttp(
            self.base_replies(
                (200, b'{"count":0,"text_indicator_to_statistics":[]}')
            )
        )
        report = q.fetch_report(
            http,
            "token",
            text_indicator="URL",
            filter_indicator="URL",
            operation="TEXT_CONTAINS",
            value="/kraska/",
        )
        self.assertEqual(report["state"], "empty")
        self.assertFalse(report["truncated"])
        self.assertEqual(report["filter"]["value"], "/kraska/")

    def test_rejects_malformed_analytics_response(self):
        http = FakeHttp(self.base_replies((200, b'{"count":1}')))
        with self.assertRaises(q.MonitorError) as error:
            q.fetch_report(
                http,
                "token",
                text_indicator="QUERY",
                filter_indicator="QUERY",
                operation="TEXT_CONTAINS",
                value="грунтовка",
            )
        self.assertEqual(error.exception.code, "analytics_invalid_response")


if __name__ == "__main__":
    unittest.main()

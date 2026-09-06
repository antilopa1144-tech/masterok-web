import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../src/middleware";

const request = (path: string) => new NextRequest(`https://getmasterok.ru${path}`);

describe("middleware contract after framework updates", () => {
  it("retains the canonical trailing-slash redirect and query", () => {
    const result = middleware(request("/blog?tag=plitka"));
    expect(result.status).toBe(308);
    expect(result.headers.get("location")).toBe("https://getmasterok.ru/blog/?tag=plitka");
  });

  it("preserves the historical Cyrillic tag redirect", () => {
    const result = middleware(request(`/blog/tag/${encodeURIComponent("Плитка")}/`));
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("https://getmasterok.ru/blog/tag/plitka/");
  });

  it.each(["/api/blog/revalidate", "/api/mikhalych", "/rss.xml", "/_next/static/example.js"])("does not redirect %s", (path) => {
    const result = middleware(request(path));
    expect(result.headers.get("location")).toBeNull();
    expect(result.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps a fresh page nonce and the analytics/counter CSP allowances", () => {
    const first = middleware(request("/blog/"));
    const second = middleware(request("/blog/"));
    const nonce = first.headers.get("x-nonce");
    expect(nonce).toBeTruthy();
    expect(nonce).not.toBe(second.headers.get("x-nonce"));
    const policy = first.headers.get("content-security-policy");
    expect(policy).toContain(`'nonce-${nonce}'`);
    expect(policy).toContain("https://cms.getmasterok.ru/article-views/");
    expect(policy).toContain("https://*.google-analytics.com");
    expect(policy).toContain("https://mc.yandex.ru");
    expect(policy).toContain("object-src 'none'");
  });
});

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { ARTICLE_VIEWS_URL } from "@/lib/article-views";

describe("article view counter runtime CSP", () => {
  it("allows the actual counter endpoint in the final article response header", () => {
    const response = middleware(new NextRequest("https://getmasterok.ru/blog/raskladka-plitki-na-kuhonnom-fartuke/"));
    const policy = response.headers.get("Content-Security-Policy") ?? "";
    const connect = policy.split("; ").find(value => value.startsWith("connect-src "))?.split(" ") ?? [];
    expect(connect).toContain(ARTICLE_VIEWS_URL);
    // Do not permit arbitrary CMS requests or unrelated third-party origins.
    expect(connect).not.toContain("https://cms.getmasterok.ru");
    expect(connect).not.toContain("*");
    expect(connect).not.toContain("https:");
    expect(policy).toContain(`'nonce-${response.headers.get("x-nonce")}'`);
    expect(policy).toContain("object-src 'none'");
  });

  it("keeps API requests free of redirects and page nonce policy", () => {
    const response = middleware(new NextRequest("https://getmasterok.ru/api/feedback"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });
});

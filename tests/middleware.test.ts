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

/**
 * Мягкие 404: notFound() внутри страницы срабатывает после старта стриминга,
 * поэтому статус можно гарантировать только в middleware. Эти тесты держат
 * контракт: несуществующий адрес → 404, известный калькулятор по чужой
 * категории → 301 на канонический адрес, валидный адрес → обычный проход.
 */
describe("валидация динамических маршрутов", () => {
  const notFound = (path: string) => {
    const result = middleware(request(path));
    return result;
  };

  it.each([
    ["/kalkulyatory/steny/nope-slug/", "несуществующий slug в валидной категории"],
    ["/kalkulyatory/nope/", "несуществующая категория"],
    ["/kalkulyatory/nope/nope/", "несуществующая категория и slug"],
    ["/instrumenty/chek-listy/nope/", "несуществующий чек-лист"],
    ["/instrumenty/nope/", "несуществующий инструмент"],
  ])("отдаёт 404 на %s (%s)", (path) => {
    const result = notFound(path);
    expect(result.status).toBe(404);
    expect(result.headers.get("location")).toBeNull();
    // Ответ на несуществующий адрес не должен кэшироваться CDN.
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("перенаправляет известный калькулятор из чужой категории на канонический адрес", () => {
    const result = middleware(request("/kalkulyatory/potolki/teplyy-pol/"));
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe(
      "https://getmasterok.ru/kalkulyatory/inzhenernye/teplyy-pol/",
    );
  });

  it.each([
    "/kalkulyatory/",
    "/kalkulyatory/poly/",
    "/kalkulyatory/poly/plitka/",
    "/kalkulyatory/fundament/beton/",
    "/instrumenty/",
    "/instrumenty/chek-listy/",
    "/instrumenty/chek-listy/remont-kvartiry/",
    "/instrumenty/raskladka-plitki/",
    "/blog/",
    "/o-proekte/",
  ])("пропускает валидный адрес %s", (path) => {
    const result = middleware(request(path));
    expect(result.headers.get("x-middleware-next")).toBe("1");
    expect(result.headers.get("location")).toBeNull();
  });

  it("не трогает маршруты блога: их slug определяет CMS, а не реестр", () => {
    const result = middleware(request("/blog/kakoy-to-novyy-post/"));
    expect(result.headers.get("x-middleware-next")).toBe("1");
  });
});

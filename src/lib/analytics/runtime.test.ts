import { describe, expect, it } from "vitest";
import { isProductionAnalyticsHost } from "./runtime";

describe("production analytics host gate", () => {
  it.each([
    "getmasterok.ru",
    "www.getmasterok.ru",
    "GETMASTEROK.RU:443",
    "https://getmasterok.ru/kalkulyatory/",
    "getmasterok.ru, internal-proxy",
  ])("разрешает только production-хост: %s", (host) => {
    expect(isProductionAnalyticsHost(host)).toBe(true);
  });

  it.each([
    undefined,
    "",
    "localhost",
    "localhost:3000",
    "127.0.0.1:3000",
    "preview.getmasterok.ru",
    "getmasterok.ru.example.com",
    "https://example.com/?next=getmasterok.ru",
  ])("блокирует local, preview и похожие домены: %s", (host) => {
    expect(isProductionAnalyticsHost(host)).toBe(false);
  });
});

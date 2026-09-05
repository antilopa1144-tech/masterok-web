import { describe, expect, it } from "vitest";
import { getGoogleAnalyticsEventParams, getGoogleAnalyticsInitScript } from "./google-analytics";

describe("Google Analytics event params", () => {
  it("переименовывает внутренний source, не изменяя объект Метрики", () => {
    const params = Object.freeze({ tool: "raskladka-plitki", source: "surface_size" });
    expect(getGoogleAnalyticsEventParams(params)).toEqual({
      tool: "raskladka-plitki", interaction_source: "surface_size",
    });
    expect(params).toEqual({ tool: "raskladka-plitki", source: "surface_size" });
  });

  it("не меняет параметры событий без внутреннего source", () => {
    const params = { calculator: "styazhka", accuracy_mode: "realistic" };
    expect(getGoogleAnalyticsEventParams(params)).toBe(params);
    expect(getGoogleAnalyticsEventParams({})).toEqual({});
  });
});

describe("Google Analytics init", () => {
  it("создаёт очередь gtag и отключает автоматический page_view", () => {
    const script = getGoogleAnalyticsInitScript("G-TEST123");

    expect(script).toContain("window.dataLayer = window.dataLayer || []");
    expect(script).toContain("gtag('config', \"G-TEST123\", { send_page_view: false })");
  });

  it("безопасно экранирует идентификатор в inline-скрипте", () => {
    const script = getGoogleAnalyticsInitScript('G-X\";alert(1);//');

    expect(script).toContain('G-X\\\";alert(1);//');
    expect(script).not.toContain("gtag('config', G-X");
  });
});

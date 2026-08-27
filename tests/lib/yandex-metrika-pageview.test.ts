import { describe, expect, it, vi } from "vitest";
import { scheduleMetrikaPageview } from "@/lib/analytics/yandex-metrika-pageview";
import {
  buildAnalyticsPageLocation,
  sanitizeAnalyticsUrl,
} from "@/lib/analytics/pageview";

describe("scheduleMetrikaPageview", () => {
  it("ждёт непустой title перед отправкой hit", () => {
    let title = "";
    const send = vi.fn();
    const pending: Array<() => void> = [];

    const cancel = scheduleMetrikaPageview(
      {
        readTitle: () => title,
        send,
        schedule: (callback) => pending.push(callback),
        cancel: vi.fn(),
      },
      { intervalMs: 50 },
    );

    expect(send).not.toHaveBeenCalled();
    title = "Калькулятор плитки — Мастерок";
    pending.shift()?.();
    expect(send).toHaveBeenCalledWith("Калькулятор плитки — Мастерок");

    cancel();
  });

  it("использует безопасный заголовок, если metadata не появилась", () => {
    const send = vi.fn();
    const pending: Array<() => void> = [];

    scheduleMetrikaPageview(
      {
        readTitle: () => "",
        send,
        schedule: (callback) => pending.push(callback),
        cancel: vi.fn(),
      },
      { maxAttempts: 2, intervalMs: 50 },
    );

    pending.shift()?.();
    expect(send).toHaveBeenCalledWith("Мастерок");
  });
});

describe("analytics pageview privacy", () => {
  it("удаляет query и hash из page_location", () => {
    expect(
      buildAnalyticsPageLocation(
        "https://getmasterok.ru",
        "/kalkulyatory/otdelka/kraska/?area=40#result",
      ),
    ).toBe("https://getmasterok.ru/kalkulyatory/otdelka/kraska/");
  });

  it("удаляет поисковый запрос и персональные данные из referer", () => {
    const sanitized = sanitizeAnalyticsUrl(
      "https://getmasterok.ru/?q=Иван+79991234567#search",
    );

    expect(sanitized).toBe("https://getmasterok.ru/");
    expect(sanitized).not.toContain("Иван");
    expect(sanitized).not.toContain("79991234567");
  });
});

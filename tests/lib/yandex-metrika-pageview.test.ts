import { describe, expect, it, vi } from "vitest";
import { scheduleMetrikaPageview } from "@/lib/analytics/yandex-metrika-pageview";

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

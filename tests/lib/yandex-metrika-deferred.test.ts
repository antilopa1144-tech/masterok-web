import { describe, expect, it } from "vitest";
import { getYandexMetrikaDeferredInitScript } from "@/lib/analytics/yandex-metrika-deferred";

describe("yandex-metrika-deferred", () => {
  it("не подписывается на scroll (Lighthouse скроллит и тянет tag.js)", () => {
    const script = getYandexMetrikaDeferredInitScript("108155444");
    expect(script).not.toContain('"scroll"');
    expect(script).toContain("pointerdown");
    expect(script).toContain("requestIdleCallback");
  });
});

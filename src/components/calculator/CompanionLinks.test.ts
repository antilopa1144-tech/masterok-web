import { describe, expect, it } from "vitest";
import { buildCompanionHref } from "./CompanionLinks";

describe("ссылки обычных рекомендаций", () => {
  it("передают только источник без неподтверждённых параметров расчёта", () => {
    const url = new URL(
      buildCompanionHref("poly", "linoleum", "laminat"),
      "https://getmasterok.ru",
    );

    expect(url.pathname).toBe("/kalkulyatory/poly/linoleum/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "laminat" });
  });
});

import { describe, expect, it } from "vitest";
import {
  LEGACY_CALCULATOR_REDIRECTS,
  LEGACY_CATALOG_REDIRECTS,
} from "./legacy-redirects";

const redirectBySource = new Map(
  LEGACY_CALCULATOR_REDIRECTS.map((redirect) => [redirect.source, redirect])
);

describe("legacy calculator redirects", () => {
  it.each([
    ["/kalkulyatory/otdelka/wallpaper/", "/kalkulyatory/otdelka/oboi/"],
    ["/kalkulyatory/otdelka/primer/", "/kalkulyatory/otdelka/gruntovka/"],
    ["/kalkulyatory/otdelka/putty/", "/kalkulyatory/otdelka/shpaklevka/"],
    [
      "/kalkulyatory/fundament/gidroizolyaciya/",
      "/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/",
    ],
  ])("перенаправляет %s на актуальный калькулятор", (source, destination) => {
    expect(redirectBySource.get(source)).toEqual({
      source,
      destination,
      permanent: true,
    });
    expect(redirectBySource.get(source.slice(0, -1))).toEqual({
      source: source.slice(0, -1),
      destination,
      permanent: true,
    });
  });

  it("не содержит конфликтующих source", () => {
    expect(redirectBySource.size).toBe(LEGACY_CALCULATOR_REDIRECTS.length);
  });
});

describe("legacy catalog redirects", () => {
  const catalogRedirectBySource = new Map(
    LEGACY_CATALOG_REDIRECTS.map((redirect) => [redirect.source, redirect])
  );

  it("объединяет дублирующую страницу /all/ с основным каталогом", () => {
    for (const source of ["/all", "/all/"]) {
      expect(catalogRedirectBySource.get(source)).toEqual({
        source,
        destination: "/kalkulyatory/",
        permanent: true,
      });
    }
  });

  it("не содержит конфликтующих source", () => {
    expect(catalogRedirectBySource.size).toBe(LEGACY_CATALOG_REDIRECTS.length);
  });
});

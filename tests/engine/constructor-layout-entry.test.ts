import { describe, expect, it } from "vitest";
import { classicLayoutHref, isClassicLayoutEntry, type LayoutMaterial } from "../../src/lib/constructor/layout-entry";

describe("3D entry and existing layout links", () => {
  it.each(["laminate", "tile"] as const)("offers 3D for a fresh %s visit, including campaign links", (material) => {
    expect(isClassicLayoutEntry(material, {})).toBe(false);
    expect(isClassicLayoutEntry(material, { utm_source: "search", yclid: "123", from: "blog" })).toBe(false);
    const url = new URL(classicLayoutHref(material), "https://getmasterok.ru");
    expect(isClassicLayoutEntry(material, Object.fromEntries(url.searchParams))).toBe(true);
  });
  it.each([
    ["laminate", { surfaceW: "3200", surfaceH: "4500", mode: "deck-half" }],
    ["laminate", { mode: "herringbone" }],
    ["tile", { tileProject: "1", surfaceW: "2500", surfaceH: "3100" }],
    ["tile", { surfaceW: "2500", from: "calculator" }],
    ["tile", { reservePercent: "0" }],
    ["tile", { groutMm: "0" }],
    ["tile", { layoutMode: "diagonal" }],
    ["tile", { openingW: "900", openingH: "2100" }],
    ["tile", { surfaceW: "" }],
    ["tile", { workspace: ["classic", "unknown"] }],
  ] as [LayoutMaterial, Record<string, string | string[]>][])("keeps existing %s inputs in their original renderer: %j", (material, query) => {
    expect(isClassicLayoutEntry(material, query)).toBe(true);
  });
});

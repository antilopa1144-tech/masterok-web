import { describe, it, expect } from "vitest";
import { pluralizeRu, pluralizePackageUnit, PACKAGE_UNIT_FORMS } from "../pluralize";

describe("pluralizeRu", () => {
  const forms: [string, string, string] = ["мешок", "мешка", "мешков"];

  it.each([
    [1, "мешок"],
    [2, "мешка"],
    [3, "мешка"],
    [4, "мешка"],
    [5, "мешков"],
    [10, "мешков"],
    [11, "мешков"],
    [12, "мешков"],
    [14, "мешков"],
    [19, "мешков"],
    [20, "мешков"],
    [21, "мешок"],
    [22, "мешка"],
    [25, "мешков"],
    [100, "мешков"],
    [101, "мешок"],
    [102, "мешка"],
    [111, "мешков"],
    [112, "мешков"],
    [121, "мешок"],
  ])("pluralizeRu(%i) → '%s'", (n, expected) => {
    expect(pluralizeRu(n, forms)).toBe(expected);
  });
});

describe("pluralizePackageUnit", () => {
  it.each([
    [1, "мешков", "мешок"],
    [2, "мешков", "мешка"],
    [5, "мешков", "мешков"],
    [1, "вёдер", "ведро"],
    [3, "вёдер", "ведра"],
    [7, "вёдер", "вёдер"],
    [1, "канистр", "канистра"],
    [2, "канистр", "канистры"],
    [10, "канистр", "канистр"],
    [1, "рулонов", "рулон"],
    [4, "рулонов", "рулона"],
    [6, "рулонов", "рулонов"],
    [1, "упаковок", "упаковка"],
    [3, "упаковок", "упаковки"],
    [1, "банок", "банка"],
    [2, "банок", "банки"],
    [5, "банок", "банок"],
    [1, "листов", "лист"],
    [2, "листов", "листа"],
    [5, "листов", "листов"],
    [1, "баллонов", "баллон"],
    [3, "баллонов", "баллона"],
    [1, "бухт", "бухта"],
    [2, "бухт", "бухты"],
    [5, "бухт", "бухт"],
    [1, "прутков", "пруток"],
    [1, "досок", "доска"],
    [1, "щитков", "щиток"],
    [1, "модулей", "модуль"],
  ])("pluralizePackageUnit(%i, '%s') → '%s'", (count, rawUnit, expected) => {
    expect(pluralizePackageUnit(count, rawUnit)).toBe(expected);
  });

  it("returns rawUnit if not in lookup", () => {
    expect(pluralizePackageUnit(1, "штук")).toBe("штук");
    expect(pluralizePackageUnit(5, "неизвестная")).toBe("неизвестная");
  });
});

describe("PACKAGE_UNIT_FORMS coverage", () => {
  it("all entries have 3 forms", () => {
    for (const [key, forms] of Object.entries(PACKAGE_UNIT_FORMS)) {
      expect(forms, `${key} should have 3 forms`).toHaveLength(3);
      for (const f of forms) {
        expect(typeof f).toBe("string");
        expect(f.length).toBeGreaterThan(0);
      }
    }
  });
});

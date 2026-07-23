import { describe, it, expect } from "vitest";
import { THEMES, resolveTheme, isThemeId } from "./theme";

describe("темы оформления — реестр", () => {
  it("4 визуально различимые темы, id уникальны", () => {
    expect(THEMES).toHaveLength(4);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(4);
  });

  it("состав совпадает с THEME_INIT_SCRIPT в layout.tsx (light/dark-флаги)", () => {
    // При изменении этого списка обнови карту themes в THEME_INIT_SCRIPT (src/app/layout.tsx)
    const expected: Record<string, boolean> = {
      light: false,
      dark: true,
      bronze: false,
      ocean: true,
    };
    expect(Object.fromEntries(THEMES.map((t) => [t.id, t.isDark]))).toEqual(expected);
  });
});

describe("resolveTheme", () => {
  it("system следует prefers-color-scheme", () => {
    expect(resolveTheme("system", false).id).toBe("light");
    expect(resolveTheme("system", true).id).toBe("dark");
  });

  it("явный выбор не зависит от системной темы", () => {
    expect(resolveTheme("bronze", true).id).toBe("bronze");
    expect(resolveTheme("ocean", false).id).toBe("ocean");
  });
});

describe("isThemeId", () => {
  it("принимает только известные id", () => {
    expect(isThemeId("bronze")).toBe(true);
    expect(isThemeId("system")).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId("sepia")).toBe(false);
  });
});

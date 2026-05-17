import { describe, expect, it } from "vitest";
import {
  getApplicationProfile,
  INSULATION_APPLICATION,
  resolveMountSystemForApplication,
  shouldShowMountSystemField,
} from "../insulation-application";

describe("insulation-application", () => {
  it("поле системы монтажа только для фасада", () => {
    expect(shouldShowMountSystemField(INSULATION_APPLICATION.FACADE)).toBe(true);
    expect(shouldShowMountSystemField(INSULATION_APPLICATION.FLOOR)).toBe(false);
    expect(shouldShowMountSystemField(INSULATION_APPLICATION.INTERNAL)).toBe(false);
  });

  it("пол принудительно без СФТК", () => {
    const { mountSystem, warning } = resolveMountSystemForApplication(
      INSULATION_APPLICATION.FLOOR,
      0,
    );
    expect(mountSystem).toBe(1);
    expect(warning).toContain("пола");
  });

  it("фасад сохраняет выбор СФТК", () => {
    const { mountSystem, warning } = resolveMountSystemForApplication(
      INSULATION_APPLICATION.FACADE,
      0,
    );
    expect(mountSystem).toBe(0);
    expect(warning).toBeUndefined();
  });

  it("профиль пола — плотность 150", () => {
    expect(getApplicationProfile(INSULATION_APPLICATION.FLOOR).defaultDensityMineral).toBe(150);
  });
});

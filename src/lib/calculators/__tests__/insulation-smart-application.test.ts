import { describe, expect, it } from "vitest";
import { getRecommendedThicknessMm } from "../insulation-smart";
import { INSULATION_APPLICATION } from "../insulation-application";

describe("insulation-smart × application", () => {
  it("пол: рекомендуемая толщина ниже, чем для стен (центр России)", () => {
    const floor = getRecommendedThicknessMm(1, INSULATION_APPLICATION.FLOOR);
    const wall = getRecommendedThicknessMm(1, INSULATION_APPLICATION.FACADE);
    expect(floor).toBe(100);
    expect(wall).toBe(150);
  });

  it("цоколь: своя шкала толщин", () => {
    expect(getRecommendedThicknessMm(1, INSULATION_APPLICATION.FOUNDATION)).toBe(100);
  });
});

import { describe, expect, it } from "vitest";
import { CALCULATOR_COMPANIONS } from "./companions";

describe("engineering calculator companions", () => {
  it("does not substitute room ventilation for a sewer-stack design", () => {
    const septicTargets = CALCULATOR_COMPANIONS.septik?.map((item) => item.slug) ?? [];

    expect(septicTargets).not.toContain("ventilyaciya");
  });

  it("keeps ventilation related to systems it can actually support", () => {
    expect(CALCULATOR_COMPANIONS.ventilyaciya).toEqual([
      { slug: "elektrika", reason: "Питание вентилятора и автоматики" },
      { slug: "krepezh", reason: "Хомуты и крепёж воздуховодов" },
      { slug: "kassetnyi-potolok", reason: "Воздуховоды за подвесным потолком" },
    ]);
  });
});

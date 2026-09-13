import { describe, expect, it } from "vitest";
import { CALCULATOR_COMPANIONS } from "./companions";

describe("engineering calculator companions", () => {
  it("does not substitute room ventilation for a sewer-stack design", () => {
    const septicTargets = CALCULATOR_COMPANIONS.septik?.map((item) => item.slug) ?? [];

    expect(septicTargets).not.toContain("ventilyaciya");
  });

  it("keeps ventilation related only to tasks the targets can support", () => {
    expect(CALCULATOR_COMPANIONS.ventilyaciya).toEqual([
      { slug: "krepezh", reason: "Хомуты и крепёж воздуховодов" },
      { slug: "kassetnyi-potolok", reason: "Воздуховоды за подвесным потолком" },
    ]);
  });

  it("does not send engineering equipment loads to the area-based electric estimate", () => {
    for (const source of [
      "teplyy-pol",
      "vodyanoy-teplyy-pol",
      "otoplenie-radiatory",
      "ventilyaciya",
    ]) {
      const targets = CALCULATOR_COMPANIONS[source]?.map((item) => item.slug) ?? [];

      expect(targets, source).not.toContain("elektrika");
    }
  });
});

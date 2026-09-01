import { describe, expect, it } from "vitest";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import { CURING_PRESETS } from "@/lib/curing-timer/presets";
import {
  buildCalculatorHrefForCuringPreset,
  buildCuringTimerHrefFromCalculator,
  CURING_TIMER_CALCULATOR_LINKS,
  getCalculatorLinkForCuringPreset,
  readCuringTimerTransfer,
} from "./curing-timer-links";

describe("связка калькуляторов с таймером схватывания", () => {
  it("строит ссылку только для однозначного пресета по выбранному материалу", () => {
    expect(buildCuringTimerHrefFromCalculator("gruntovka", { primerType: 1 })).toBe(
      "/instrumenty/tajmer-skhvatyvaniya/?preset=primer-contact&from=gruntovka",
    );
    expect(buildCuringTimerHrefFromCalculator("shtukaturka", { plasterType: 0 })).toContain(
      "preset=plaster-gypsum",
    );
    expect(buildCuringTimerHrefFromCalculator("shpaklevka", { puttyType: 2 })).toContain(
      "preset=putty-start",
    );
    expect(buildCuringTimerHrefFromCalculator("klej-dlya-plitki", {})).toContain(
      "preset=tile-adhesive",
    );
  });

  it("не угадывает пресет для неоднозначного или несовместимого состава", () => {
    expect(buildCuringTimerHrefFromCalculator("gruntovka", { primerType: 2 })).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("shtukaturka", { plasterType: 2 })).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("shpaklevka", { puttyType: 1 })).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("styazhka", { thickness: 60, screedType: 0 })).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("styazhka", { thickness: 50, screedType: 2 })).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("zatirka", { groutType: 1 })).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("kraska", {})).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("nalivnoy-pol", {})).toBeNull();
    expect(buildCuringTimerHrefFromCalculator("gidroizolyaciya-vlagozaschita", {})).toBeNull();
  });

  it("принимает только согласованную пару source и preset", () => {
    expect(readCuringTimerTransfer(new URLSearchParams("preset=grout&from=zatirka"))).toEqual({
      presetId: "grout",
      sourceCalculatorSlug: "zatirka",
    });
    expect(readCuringTimerTransfer(new URLSearchParams("preset=paint-latex&from=zatirka"))).toBeNull();
    expect(readCuringTimerTransfer(new URLSearchParams("preset=custom&from=kraska"))).toBeNull();
  });

  it("ведёт каждый типовой пресет в существующий canonical калькулятор", () => {
    const linkedPresets = new Set(CURING_TIMER_CALCULATOR_LINKS.map((link) => link.presetId));

    for (const preset of CURING_PRESETS) {
      if (preset.id === "custom") continue;
      expect(linkedPresets.has(preset.id)).toBe(true);
    }

    for (const link of CURING_TIMER_CALCULATOR_LINKS) {
      const calculator = getCalculatorMetaBySlug(link.calculatorSlug);
      expect(calculator?.title).toBe(link.calculatorTitle);
      expect(calculator?.categorySlug).toBe(link.calculatorCategorySlug);
      expect(buildCalculatorHrefForCuringPreset(link.presetId)).toBe(
        `/kalkulyatory/${link.calculatorCategorySlug}/${link.calculatorSlug}/`,
      );
      expect(getCalculatorLinkForCuringPreset(link.presetId)).toEqual(link);
    }
  });
});

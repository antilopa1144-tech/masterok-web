import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve("src/app/instrumenty/moy-remont/page.tsx"), "utf8");
const wizard = readFileSync(resolve("src/app/instrumenty/moy-remont/RoomMasterWizard.tsx"), "utf8");
const packs = readFileSync(resolve("src/lib/room-master/packs.ts"), "utf8");
const toolConfig = readFileSync(resolve("src/lib/tools/config.ts"), "utf8");

describe("room master public claims", () => {
  it("does not present the partial result as a complete purchase order", () => {
    expect(page).toContain("предварительная ведомость выбранных этапов");
    expect(wizard).toContain("Нужно проверить");
    expect(wizard).toContain("Что проверить перед покупкой");
    expect(wizard).not.toContain("Готово к закупке");
    expect(wizard).not.toContain("Полная ведомость");
  });

  it("states the actual bathroom scope after the calculator contract changed", () => {
    expect(packs).toContain("Плитка пола и стен — клей, затирка и подготовка считаются отдельно");
    expect(toolConfig).toContain("Для ванной основная ведомость содержит плитку пола и стен");
    expect(toolConfig).not.toContain("Для ванной — комплексный расчёт плитки, клея, затирки и гидроизоляции");
  });

  it("surfaces engine warnings and practical notes", () => {
    expect(wizard).toContain("run.merged.warnings");
    expect(wizard).toContain("run.merged.practicalNotes");
    expect(wizard).toContain("resultChecks.map");
  });

  it("pluralizes purchase units and item counters", () => {
    expect(wizard).toContain("pluralizePackageUnit(quantity, material.unit)");
    expect(wizard).toContain('["позиция", "позиции", "позиций"]');
    expect(wizard).toContain('["пункт", "пункта", "пунктов"]');
  });
});

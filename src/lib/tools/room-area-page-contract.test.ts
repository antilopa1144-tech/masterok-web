import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  resolve(process.cwd(), "src/app/instrumenty/ploshchad-komnaty/page.tsx"),
  "utf8",
);

describe("страница расчёта площади комнаты", () => {
  it("начинает мобильный сценарий с ввода размеров", () => {
    expect(page).toContain('useState<RoomWorkspaceStage>("parameters")');
  });

  it("обещает площадь в м² в H1 и объясняет замер", () => {
    expect(page).toContain("Калькулятор площади комнаты в м²");
    expect(page).toContain("Как снять размеры");
    expect(page).toContain("по линии пола");
    expect(page).toContain("общий габарит");
    expect(page).toContain("прямоугольника без пересечения");
  });

  it("не выдаёт площадь стен за чистую площадь отделки", () => {
    expect(page).toContain("без вычета окон и дверей");
  });
});

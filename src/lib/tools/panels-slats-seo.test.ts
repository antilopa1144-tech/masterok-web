import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getToolConfig } from "./config";
import { calculateWallSlatLayout } from "./wall-slat-layout";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("панели, рейки и раскрой: поисковый маршрут", () => {
  it("объясняет воспроизводимый пример раскладки реек", () => {
    const result = calculateWallSlatLayout({
      wallWidthMm: 3000,
      wallHeightMm: 2700,
      slatWidthMm: 30,
      desiredGapMm: 20,
      desiredCount: 40,
      mode: "by-gap",
      stockLengthMm: 3000,
      reservePercent: 5,
    });
    const page = read("src/app/instrumenty/raskladka-reek/page.tsx");
    const config = getToolConfig("raskladka-reek")!;

    expect(result.slatCount).toBe(60);
    expect(result.edgeGapMm).toBe(10);
    expect(result.exactLinearM).toBe(162);
    expect(result.purchasePieces).toBe(63);
    expect(page).toContain("60 вертикальных реек");
    expect(page).toContain("поля по 10 мм");
    expect(config.seoIntro).toContain("162 пог. м");
  });

  it("разводит декоративную раскладку, панели и раскрой хлыстов", () => {
    const page = read("src/app/instrumenty/raskladka-reek/page.tsx");

    expect(page).toContain('href="/instrumenty/lineynyy-raskroy/"');
    expect(page).toContain('href="/kalkulyatory/steny/paneli-dlya-sten/"');
    expect(page).toContain("не строит декоративный ритм реек");
  });

  it("не выдаёт раскладку поверхности за оптимизатор мебельных деталей", () => {
    const page = read("src/app/instrumenty/lineynyy-raskroy/page.tsx");
    const faq = getToolConfig("lineynyy-raskroy")!.faq.map(({ answer }) => answer).join(" ");

    expect(page).toContain("раскладку листов по поверхности");
    expect(page).toContain("не оптимизирует произвольный список");
    expect(faq).toContain("одной прямоугольной поверхности");
    expect(faq).toContain("не оптимизирует произвольный список деталей");
    expect(`${page} ${faq}`).not.toContain("раскладку деталей на листе");
  });
});

import { describe, expect, it } from "vitest";
import { wallPanelsDef } from "../formulas/wall-panels";
import { calculateRoomArea } from "../../tools/room-area";

describe("ПВХ-панели: поисковый сценарий ванной", () => {
  const html = wallPanelsDef.seoContent!.descriptionHtml;
  const faq = wallPanelsDef.seoContent!.faq!;

  it("объясняет чистую площадь облицовки и проверенный пример замера", () => {
    const room = calculateRoomArea({ shape: "rect", a: 2, b: 2, wallHeight: 2.5 });
    expect(room.wallArea! - 1 * 2).toBe(18);
    expect(room.floorArea).toBe(4);
    expect(html).toContain("18 м²");
    expect(html).toContain("а не площадь пола");
    expect(html).toContain("Запас второй раз");
    expect(faq.find((item) => item.question.includes("для ванной комнаты"))?.answer).toContain("18 м²");
  });

  it("связывает замер с облицовкой без обещания автоматического переноса", () => {
    expect(html).toContain('href="/instrumenty/ploshchad-komnaty/"');
    expect(html).toContain("перед переносом сюда их нужно вычесть");
    expect(html).not.toContain("utm_");
  });

  it("не скрывает округление площади и отсутствие раскроя", () => {
    expect(html).toContain("до ближайшего целого м²");
    const answer = faq.find((item) => item.question.includes("не заменяет раскрой"))?.answer;
    expect(answer).toContain("не проверяет длину полос");
    expect(answer).toContain("а не для подбора длины панелей");
    expect(answer).toContain("по фактическому контуру");
  });

  it("не оставляет HTML-сущности в текстовом FAQ для JSON-LD", () => {
    expect(faq.every((item) => !/&(?:\w+|#\d+);/.test(item.answer))).toBe(true);
    expect(html).toContain("⌈высота / шаг⌉ + 1");
  });
});

import type { LaminateDirection, LaminateLayoutResult } from "./laminate-layout";

export interface LaminateExportGeometry {
  width: number;
  height: number;
  planX: number;
  planY: number;
  planWidth: number;
  planHeight: number;
  summaryY: number;
}

/** Keep the plan readable without producing an unbounded image for a narrow corridor. */
export function getLaminateExportGeometry(viewBoxWidth: number, viewBoxHeight: number): LaminateExportGeometry {
  if (!(viewBoxWidth > 0) || !(viewBoxHeight > 0)) {
    throw new Error("Не удалось определить размер схемы");
  }
  const width = 1600;
  const scale = Math.min(1408 / viewBoxWidth, 1400 / viewBoxHeight);
  const planWidth = Math.round(viewBoxWidth * scale);
  const planHeight = Math.round(viewBoxHeight * scale);
  const planX = Math.round((width - planWidth) / 2);
  const planY = 225;
  const summaryY = planY + planHeight + 72;
  return { width, height: summaryY + 485, planX, planY, planWidth, planHeight, summaryY };
}

export function getLaminateExportCopy(result: LaminateLayoutResult, direction: LaminateDirection) {
  const isHerringbone = result.mode === "herringbone";
  const mode = result.mode === "deck-third" ? "Палуба 1/3" : result.mode === "deck-half" ? "Палуба 1/2" : "Ёлочка";
  return {
    title: "Раскладка ламината",
    parameters: `Комната ${result.surfaceW} × ${result.surfaceH} мм  ·  доска ${result.boardW} × ${result.boardH} мм`,
    method: `${mode}  ·  ${isHerringbone ? "рисунок под 45°" : direction === "along-length" ? "доски вдоль длины" : "доски вдоль ширины"}`,
    baseLabel: isHerringbone ? "По площади" : "На схему",
    caveat: isHerringbone
      ? "Ёлочка: схема ориентировочная; закупка оценена по площади с запасом."
      : "Проверьте торцевые стыки, крайние детали и зазоры по инструкции покрытия.",
  };
}

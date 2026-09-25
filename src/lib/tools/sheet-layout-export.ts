import type { SheetLayoutResult } from "./sheet-layout";

export interface SheetExportPlanGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A bounded, legible canvas for one or two layers with a shared purchase result. */
export function getSheetExportGeometry(viewBoxes: Array<{ width: number; height: number }>) {
  if (viewBoxes.length < 1 || viewBoxes.length > 2 || viewBoxes.some(({ width, height }) => !(width > 0) || !(height > 0))) {
    throw new Error("Не удалось определить размеры схемы");
  }
  let y = 242;
  const plans: SheetExportPlanGeometry[] = viewBoxes.map(({ width, height }) => {
    const scale = Math.min(1408 / width, 1280 / height);
    const planWidth = Math.round(width * scale);
    const planHeight = Math.round(height * scale);
    const plan = { x: Math.round((1600 - planWidth) / 2), y, width: planWidth, height: planHeight };
    y += planHeight + 56;
    return plan;
  });
  return { width: 1600, height: y + 450, plans, summaryY: y + 16 };
}

export function getSheetExportCopy(result: SheetLayoutResult) {
  const { input } = result;
  const surface = input.surface === "wall" ? "стена" : input.surface === "floor" ? "пол" : "потолок";
  const material = input.material === "drywall" ? "Гипсокартон" : input.material === "osb" ? "ОСП-плита" : "Листовой материал";
  return {
    title: `Раскладка листов · ${material}`,
    parameters: `${surface} ${input.surfaceWidthMm} × ${input.surfaceHeightMm} мм  ·  лист ${input.sheetWidthMm} × ${input.sheetLengthMm} мм`,
    method: `${input.layers} ${input.layers === 1 ? "слой" : "слоя"}  ·  зазор ${input.jointGapMm} мм  ·  запас ${input.reservePercent}%`,
    scope: input.layers === 2 ? "На планах оба слоя; числа закупки и раскроя суммарные." : "План и итог закупки для одного слоя.",
    caveat: "Стыки сверяйте с каркасом или лагами; проёмы и проектные узлы уточняйте отдельно.",
  };
}

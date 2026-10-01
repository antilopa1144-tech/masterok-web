import type { ConstructorRoom, RoomCalculation } from "./core";
import { decorFor, formatNumber } from "./presentation";
import { tileDecorFor } from "./tile-materials";

/** Общие подписи для PNG/PDF: скрытые параметры другого покрытия не попадают в документ. */
export function floorExportText(room: ConstructorRoom, calculation: RoomCalculation) {
  const f = room.floor, tile = f.kind === "tile" ? f.tile : undefined, result = calculation.floorTiles;
  if (tile && result) return {
    title: `${tileDecorFor(tile.decor).name} · плитка ${tile.tileWidthMm} × ${tile.tileHeightMm} мм`,
    parameters: `${tile.materialKey}; ${tileDecorFor(tile.decor).name}; плитка ${tile.tileWidthMm} × ${tile.tileHeightMm} мм.\nПрямая укладка ${tile.orientation === "horizontal" ? "вдоль ширины" : "вдоль длины"}; ${tile.alignment === "center" ? "по центру" : "от края"}; шов ${tile.jointMm} мм; зазор у стен ${tile.edgeGapMm} мм; резерв ${tile.reservePercent}%.`,
    shortSummary: `${formatNumber(result.coveredAreaM2, 3)} м² плитки без швов · ${result.baseTiles} исходных шт. · резерв ${formatNumber(tile.reservePercent)}%`,
    shortParameters: `Плитка ${tile.tileWidthMm} × ${tile.tileHeightMm} мм; шов ${tile.jointMm} мм; зазор ${tile.edgeGapMm} мм; обрезки не используются повторно.`,
    summary: `${formatNumber(calculation.areaM2)} м² помещения; ${formatNumber(result.netAreaM2, 3)} м² укладки со швами; ${formatNumber(result.coveredAreaM2, 3)} м² самой плитки.\n${result.baseTiles} исходных плиток, ${result.cutTiles} с подрезкой. Неуложенная часть: ${formatNumber(result.unlaidAreaM2, 3)} м².\nНомера на плане обозначают исходные плитки пола. Размеры всех деталей находятся в XLSX; обрезки повторно не используются.`,
  };
  return {
    title: `${decorFor(f.decor).name} · палуба ${f.pattern === "third" ? "1/3" : "1/2"}`,
    parameters: `${decorFor(f.decor).name}; доска ${f.boardLengthMm} × ${f.boardWidthMm} мм.\nПалуба ${f.pattern === "third" ? "1/3" : "1/2"}; направление вдоль ${f.direction === "width" ? "ширины" : "длины"}; зазор ${f.expansionGapMm} мм; пропил ${f.kerfMm} мм; резерв ${f.reservePercent}%.`,
    shortSummary: `${formatNumber(calculation.coveredAreaM2)} м² покрытия · ${calculation.baseBoards} досок по раскрою · резерв ${formatNumber(f.reservePercent)}%`,
    shortParameters: `Доска ${f.boardLengthMm} × ${f.boardWidthMm} мм; зазор ${f.expansionGapMm} мм; пропил ${f.kerfMm} мм.`,
    summary: `${formatNumber(calculation.areaM2)} м² помещения; ${formatNumber(calculation.coveredAreaM2)} м² покрытия.\n${calculation.pieces.length} деталей из ${calculation.baseBoards} исходных досок. Остатки: ${formatNumber(calculation.offcutAreaM2, 3)} м²; потеря на пропиле: ${formatNumber(calculation.kerfAreaM2, 4)} м².\nНомера на плане обозначают исходные доски. Смотрите соответствующие карты реза.`,
  };
}

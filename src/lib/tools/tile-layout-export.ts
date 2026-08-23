import type { Material, PdfPassportSummary } from "@/lib/export";
import type { TilePackagingResult } from "./tile-layout-purchase";

export interface TileLayoutExportInput {
  projectName?: string;
  surfaceLabel: "Стена" | "Пол";
  surfaceW: number;
  surfaceH: number;
  tileW: number;
  tileH: number;
  groutMm: number;
  layoutModeLabel: string;
  startModeLabel: string;
  edgeCuts: { left: number; right: number; top: number; bottom: number };
  surfaceAreaM2: number;
  basePurchaseTiles: number;
  reserveTiles: number;
  reservePercent: number;
  purchaseTiles: number;
  opening?: {
    widthMm: number;
    heightMm: number;
  };
  packaging: TilePackagingResult;
}

export interface TileLayoutExportPlan {
  calculatorName: string;
  passport: TileLayoutPassport;
  pdfPassport: PdfPassportSummary;
  materials: Material[];
  totals: Record<string, number>;
  warnings: string[];
  shareTitle: string;
  shareText: string;
}

export interface TileLayoutPassport {
  title: string;
  surface: string;
  tile: string;
  layout: string;
  opening: string | null;
  areaM2: number;
  schemeTiles: number;
  reserveTiles: number;
  reservePercent: number;
  requiredTiles: number;
  boxesToBuy: number;
  tilesPerBox: number;
  purchasedTiles: number;
  leftoverTiles: number;
  packagingSource: "label" | "estimated";
  packagingLabel: string;
  adhesiveHint: string;
  groutHint: string;
}

function formatRu(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits });
}

/**
 * Собирает единое представление результата для PDF и системного меню «Поделиться».
 * Расчёты сюда не дублируются: функция только объясняет уже полученный результат.
 */
export function buildTileLayoutExportPlan(input: TileLayoutExportInput): TileLayoutExportPlan {
  const surfaceSize = `${formatRu(input.surfaceW, 0)}×${formatRu(input.surfaceH, 0)} мм`;
  const tileSize = `${formatRu(input.tileW, 0)}×${formatRu(input.tileH, 0)} мм`;
  const openingText = input.opening
    ? ` · проём ${formatRu(input.opening.widthMm, 0)}×${formatRu(input.opening.heightMm, 0)} мм`
    : "";
  const packArea = input.packaging.requestedPackAreaM2 == null
    ? "не указана"
    : `${formatRu(input.packaging.requestedPackAreaM2)} м²/кор.`;
  const actualPackArea = formatRu(input.packaging.boxAreaM2);
  const packagingStatus = input.packaging.packagingSource === "label"
    ? "по этикетке"
    : "оценка";
  const projectName = input.projectName?.trim();
  const passport: TileLayoutPassport = {
    title: projectName || "Новая раскладка",
    surface: `${input.surfaceLabel} ${surfaceSize}`,
    tile: tileSize,
    layout: `${input.layoutModeLabel} · ${input.startModeLabel.toLocaleLowerCase("ru-RU")}`,
    opening: input.opening
      ? `${formatRu(input.opening.widthMm, 0)}×${formatRu(input.opening.heightMm, 0)} мм`
      : null,
    areaM2: input.surfaceAreaM2,
    schemeTiles: input.basePurchaseTiles,
    reserveTiles: input.reserveTiles,
    reservePercent: input.reservePercent,
    requiredTiles: input.purchaseTiles,
    boxesToBuy: input.packaging.boxesToBuy,
    tilesPerBox: input.packaging.tilesPerBox,
    purchasedTiles: input.packaging.purchasedTiles,
    leftoverTiles: input.packaging.leftoverTiles,
    packagingSource: input.packaging.packagingSource,
    packagingLabel: input.packaging.packagingSource === "label"
      ? "Фасовка по этикетке"
      : "Предварительная оценка",
    adhesiveHint: `Рассчитать по площади ${formatRu(input.surfaceAreaM2)} м² и формату ${tileSize}`,
    groutHint: `Уточнить расход: шов ${formatRu(input.groutMm)} мм, формат ${tileSize}`,
  };
  const pdfPassport: PdfPassportSummary = {
    eyebrow: "Паспорт раскладки",
    title: passport.title,
    subtitle: `${passport.surface} · плитка ${passport.tile} · ${passport.layout.toLocaleLowerCase("ru-RU")}`,
    badge: passport.packagingLabel,
    metrics: [
      { label: "Площадь", value: `${formatRu(passport.areaM2)} м²` },
      { label: "Нужно", value: `${passport.requiredTiles} шт.` },
      { label: "Купить", value: `${passport.boxesToBuy} кор.` },
      { label: "Остаток", value: `${passport.leftoverTiles} шт.` },
    ],
    procurement: `${passport.boxesToBuy} кор. × ${passport.tilesPerBox} шт. = ${passport.purchasedTiles} шт. к покупке; по схеме ${passport.schemeTiles} шт. + запас ${passport.reserveTiles} шт. (${formatRu(passport.reservePercent)}%).`,
    related: [
      `Клей: ${passport.adhesiveHint}`,
      `Затирка: ${passport.groutHint}`,
    ],
  };

  const materials: Material[] = [
    {
      name: `Плитка ${tileSize}`,
      subtitle: `${input.packaging.tilesPerBox} шт./кор. (${packagingStatus}) · купить ${input.packaging.purchasedTiles} шт. · остаток ${input.packaging.leftoverTiles} шт.`,
      quantity: input.packaging.boxesToBuy,
      unit: "кор.",
      waste: input.reservePercent / 100,
      category: "К покупке",
    },
    {
      name: "Плитка по схеме",
      subtitle: `${input.layoutModeLabel.toLocaleLowerCase("ru-RU")} · ${input.startModeLabel.toLocaleLowerCase("ru-RU")} · шов ${formatRu(input.groutMm)} мм`,
      quantity: input.basePurchaseTiles,
      unit: "шт.",
      category: "Раскладка",
    },
    {
      name: "Практический запас",
      subtitle: `${formatRu(input.reservePercent)}% сверх потребности по схеме`,
      quantity: input.reserveTiles,
      unit: "шт.",
      category: "Раскладка",
    },
  ];

  const layoutTitle = `Раскладка плитки — ${input.surfaceLabel.toLocaleLowerCase("ru-RU")} ${surfaceSize}`;
  const shareTitle = projectName ? `${projectName} · ${layoutTitle}` : layoutTitle;
  const shareText = [
    shareTitle,
    `Формат: ${tileSize}, шов ${formatRu(input.groutMm)} мм, ${input.layoutModeLabel.toLocaleLowerCase("ru-RU")}.`,
    `Старт: ${input.startModeLabel.toLocaleLowerCase("ru-RU")}. Крайние подрезки: слева ${formatRu(input.edgeCuts.left)} мм, справа ${formatRu(input.edgeCuts.right)} мм, сверху ${formatRu(input.edgeCuts.top)} мм, снизу ${formatRu(input.edgeCuts.bottom)} мм.`,
    `Площадь облицовки: ${formatRu(input.surfaceAreaM2)} м²${openingText}.`,
    `Потребность: ${input.basePurchaseTiles} шт. + запас ${input.reserveTiles} шт. (${formatRu(input.reservePercent)}%) = ${input.purchaseTiles} шт.`,
    `К покупке (${packagingStatus}): ${input.packaging.boxesToBuy} кор. × ${input.packaging.tilesPerBox} шт. = ${input.packaging.purchasedTiles} шт.`,
    `Остаток после укладки и запаса: ${input.packaging.leftoverTiles} шт.`,
  ].join("\n");

  return {
    calculatorName: shareTitle,
    passport,
    pdfPassport,
    materials,
    totals: {
      area: input.surfaceAreaM2,
      tilesNeeded: input.purchaseTiles,
      packsNeeded: input.packaging.boxesToBuy,
      packArea: input.packaging.requestedPackAreaM2 ?? input.packaging.boxAreaM2,
    },
    warnings: [
      input.packaging.packagingSource === "label"
        ? `Фасовка ${input.packaging.tilesPerBox} шт./кор. указана пользователем по этикетке; площадь на этикетке — ${packArea}, номинальная площадь по размерам плитки — ${actualPackArea} м².`
        : `Фасовка ${input.packaging.tilesPerBox} шт./кор. является оценкой по площади коробки (${packArea}), а не данными каталога. Перед покупкой подтвердите количество штук на этикетке коллекции.`,
      "Клей и затирка не включены в количество плитки. Рассчитайте их отдельно по площади, формату плитки, ширине шва и условиям основания.",
      "Объёмный вид иллюстративный. Для разметки и проверки подрезок используйте точный чертёж.",
    ],
    shareTitle,
    shareText,
  };
}

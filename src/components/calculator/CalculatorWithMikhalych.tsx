"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCalculator, type CalculatorWidgetProps } from "./useCalculator";
import { CALCULATOR_COMPANIONS } from "@/lib/calculators/companions";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import {
  buildConcreteCalculatorHrefFromFoundationResult,
  getFoundationConcreteSourceLabel,
} from "@/lib/calculators/foundation-cluster-links";
import {
  buildElectricFloorHrefFromScreedResult,
  buildScreedHrefFromElectricFloorResult,
  ELECTRIC_FLOOR_TRANSFER_FROM,
  SCREED_TRANSFER_FROM,
} from "@/lib/calculators/floor-system-cluster-links";
import {
  buildPartitionFinishingLinks,
  PARTITION_FINISHING_TRANSFER_FROM,
} from "@/lib/calculators/partition-finishing-links";
import {
  buildFinishLinksFromPuttyResult,
  buildPuttyHrefFromPlasterResult,
  PLASTER_FINISHING_TRANSFER_FROM,
  PUTTY_FINISHING_TRANSFER_FROM,
} from "@/lib/calculators/finishing-stage-links";
import {
  buildFacadeSystemLinksFromInsulationResult,
  buildInsulationHrefFromFacadeResult,
  INSULATION_FACADE_TRANSFER_FROM,
} from "@/lib/calculators/facade-system-links";
import {
  buildRoofingHrefFromGuttersResult,
  buildRoofingLinksFromRoofingResult,
  buildRoofingLinksFromSoftRoofingResult,
  GUTTERS_TRANSFER_FROM,
  ROOFING_TRANSFER_FROM,
  SOFT_ROOFING_TRANSFER_FROM,
} from "@/lib/calculators/roof-system-links";
import {
  buildDeckLayoutHrefFromTerraceResult,
  DECK_LAYOUT_TRANSFER_FROM,
  TERRACE_CALCULATOR_TRANSFER_FROM,
} from "@/lib/tools/deck-layout-to-calc";
import {
  buildPaverLayoutHrefFromCalculatorResult,
  PAVER_LAYOUT_TRANSFER_FROM,
  PAVING_CALCULATOR_TRANSFER_FROM,
} from "@/lib/tools/paver-layout-to-calc";
import {
  buildLightingLayoutHrefFromCeilingCalculator,
  CEILING_STRETCH_TRANSFER_FROM,
  LIGHTING_LAYOUT_TRANSFER_FROM,
  readLightingLayoutCeilingTransfer,
} from "@/lib/tools/lighting-layout-to-ceiling";
import {
  buildConsumptionNormHref,
  CONSUMPTION_NORMS_TOOL_SLUG,
} from "@/lib/tools/consumption-norm-links";
import {
  buildChecklistHrefForCalculator,
  getChecklistLinkForCalculator,
} from "@/lib/tools/checklist-calculator-links";
import {
  buildCuringTimerHrefFromCalculator,
  CURING_TIMER_TOOL_SLUG,
} from "@/lib/tools/curing-timer-links";
import { buildMikhalychCalcContext } from "@/lib/mikhalych/calc-context";
import { FieldInput, HistoryPanel, ResultBlock } from "./CalculatorParts";
import { CALCULATOR_UI_TEXT } from "./uiText";
import Staircase3DWrapper from "./Staircase3DWrapper";
import Roof3DWrapper from "./Roof3DWrapper";
import TileLayoutTransferBanner from "./TileLayoutTransferBanner";
import { pluralizeRu } from "@/lib/format/pluralize";
import {
  buildWallpaperLayoutHref,
  WALLPAPER_ROOM_TRANSFER_FROM,
} from "@/lib/tools/wallpaper-layout-to-calc";
import {
  BRICK_LAYOUT_TRANSFER_FROM,
  buildBrickworkLayoutHrefFromCalculatorResult,
} from "@/lib/tools/brickwork-layout-to-calc";
import {
  buildSheetLayoutHrefFromDrywall,
  buildSheetLayoutHrefFromFasteners,
  SHEET_LAYOUT_TRANSFER_FROM,
} from "@/lib/tools/sheet-layout-to-calc";
import {
  buildTileLayoutHrefFromCalculatorValues,
  TILE_ROOM_TRANSFER_FROM,
} from "@/lib/tools/tile-layout-to-calc";
import {
  buildLaminateLayoutHref,
  LAMINATE_LAYOUT_TRANSFER_FROM,
  LAMINATE_ROOM_TRANSFER_FROM,
} from "@/lib/tools/laminate-layout-to-calc";
import {
  trackCalculatorRelatedClick,
  trackCalculatorResultView,
} from "@/lib/analytics";
import CategoryIcon from "@/components/ui/CategoryIcon";

const MOBILE_PRIMARY_FIELD_COUNT = 6;
const DESKTOP_PRIMARY_FIELD_COUNT = 8;

const MikhalychWidget = dynamic(() => import("./MikhalychWidget"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <p className="animate-pulse text-sm text-slate-400">Загрузка Михалыча…</p>
    </div>
  ),
});

export type { CalculatorWidgetProps };

function getCompanionSlugs(slug: string): string[] {
  const companions = CALCULATOR_COMPANIONS[slug];
  if (!companions?.length) return [];
  return companions
    .map((item) => getCalculatorMetaBySlug(item.slug))
    .filter(Boolean)
    .map((item) => item!.title);
}

export default function CalculatorWithMikhalych({ calculator }: { calculator: CalculatorWidgetProps }) {
  const searchParams = useSearchParams();
  const transferSource = searchParams.get("from");
  const roomTransferValue = searchParams.get("inputMode") === "1"
    ? "площадь пола"
    : "длина и ширина комнаты";
  const wallpaperRollsHint = Number(searchParams.get("rollsHint"));
  const sheetLayoutHint = Number(searchParams.get("sheetsHint"));
  const transferredFinishingArea = Number(searchParams.get("area") ?? searchParams.get("facadeArea"));
  const transferredRoofArea = Number(searchParams.get("roofArea") ?? searchParams.get("projectSlopeAreaM2"));
  const deckLayoutBoardsHint = Number(searchParams.get("layoutBoardsHint"));
  const paverLayoutPiecesHint = Number(searchParams.get("layoutPaversHint"));
  const lightingLayoutTransfer = useMemo(
    () => readLightingLayoutCeilingTransfer(searchParams),
    [searchParams],
  );
  const foundationConcreteSourceLabel = getFoundationConcreteSourceLabel(transferSource);
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const hasTrackedResultViewRef = useRef(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [showMikhalych, setShowMikhalych] = useState(false);

  const {
    values,
    result,
    hasCalculated,
    hasStarted,
    calcNonce,
    shareState,
    showHistory,
    setShowHistory,
    category,
    visibleFields,
    invalidFields,
    hasValidationErrors,
    calcHistory,
    handleChange,
    handleCalculate,
    handleReset,
    handleShare,
    handleRestoreHistory,
  } = useCalculator(calculator);

  const concreteCalculatorHref = useMemo(
    () => buildConcreteCalculatorHrefFromFoundationResult(calculator.slug, result?.totals),
    [calculator.slug, result?.totals],
  );
  const electricFloorHref = useMemo(
    () => calculator.slug === "styazhka"
      ? buildElectricFloorHrefFromScreedResult(result?.totals)
      : null,
    [calculator.slug, result?.totals],
  );
  const screedHref = useMemo(
    () => calculator.slug === "teplyy-pol"
      ? buildScreedHrefFromElectricFloorResult(result?.totals)
      : null,
    [calculator.slug, result?.totals],
  );
  const brickworkLayoutHref = useMemo(
    () => buildBrickworkLayoutHrefFromCalculatorResult(calculator.slug, result?.totals),
    [calculator.slug, result?.totals],
  );
  const fastenersLayoutHref = useMemo(
    () => calculator.slug === "krepezh"
      ? buildSheetLayoutHrefFromFasteners({ materialType: values.materialType })
      : null,
    [calculator.slug, values.materialType],
  );
  const partitionFinishingLinks = useMemo(
    () => calculator.slug === PARTITION_FINISHING_TRANSFER_FROM && hasCalculated
      ? buildPartitionFinishingLinks({ length: values.length, height: values.height })
      : [],
    [calculator.slug, hasCalculated, values.height, values.length],
  );
  const puttyFromPlasterHref = useMemo(
    () => calculator.slug === PLASTER_FINISHING_TRANSFER_FROM && hasCalculated
      ? buildPuttyHrefFromPlasterResult(result?.totals)
      : null,
    [calculator.slug, hasCalculated, result?.totals],
  );
  const puttyFinishLinks = useMemo(
    () => calculator.slug === PUTTY_FINISHING_TRANSFER_FROM && hasCalculated
      ? buildFinishLinksFromPuttyResult(result?.totals, values.surface)
      : [],
    [calculator.slug, hasCalculated, result?.totals, values.surface],
  );
  const facadeSystemLinks = useMemo(
    () => calculator.slug === INSULATION_FACADE_TRANSFER_FROM && hasCalculated
      ? buildFacadeSystemLinksFromInsulationResult(result?.totals)
      : [],
    [calculator.slug, hasCalculated, result?.totals],
  );
  const insulationFromFacadeHref = useMemo(
    () => calculator.slug === "sayding" || calculator.slug === "fasadnye-paneli"
      ? buildInsulationHrefFromFacadeResult(calculator.slug, result?.totals)
      : null,
    [calculator.slug, result?.totals],
  );
  const roofSystemLinks = useMemo(() => {
    if (!hasCalculated) return [];
    if (calculator.slug === ROOFING_TRANSFER_FROM) {
      return buildRoofingLinksFromRoofingResult(result?.totals, {
        ridgeProjectM: values.ridgeProjectM,
        eavesProjectM: values.eavesProjectM,
        valleyProjectM: values.valleyProjectM,
      });
    }
    if (calculator.slug === SOFT_ROOFING_TRANSFER_FROM) {
      return buildRoofingLinksFromSoftRoofingResult(result?.totals);
    }
    return [];
  }, [
    calculator.slug,
    hasCalculated,
    result?.totals,
    values.eavesProjectM,
    values.ridgeProjectM,
    values.valleyProjectM,
  ]);
  const roofingFromGuttersHref = useMemo(
    () => calculator.slug === GUTTERS_TRANSFER_FROM && hasCalculated
      ? buildRoofingHrefFromGuttersResult(result?.totals)
      : null,
    [calculator.slug, hasCalculated, result?.totals],
  );
  const deckLayoutHref = useMemo(
    () => calculator.slug === TERRACE_CALCULATOR_TRANSFER_FROM && hasCalculated
      ? buildDeckLayoutHrefFromTerraceResult(result?.totals)
      : null,
    [calculator.slug, hasCalculated, result?.totals],
  );
  const paverLayoutHref = useMemo(
    () => calculator.slug === PAVING_CALCULATOR_TRANSFER_FROM && hasCalculated
      ? buildPaverLayoutHrefFromCalculatorResult(result?.totals)
      : null,
    [calculator.slug, hasCalculated, result?.totals],
  );
  const lightingLayoutHref = useMemo(
    () => calculator.slug === CEILING_STRETCH_TRANSFER_FROM && hasCalculated
      ? buildLightingLayoutHrefFromCeilingCalculator({ area: values.area, fixtures: values.fixtures })
      : null,
    [calculator.slug, hasCalculated, values.area, values.fixtures],
  );
  const consumptionNormHref = useMemo(
    () => hasCalculated ? buildConsumptionNormHref(calculator.slug) : null,
    [calculator.slug, hasCalculated],
  );
  const checklistLink = useMemo(
    () => hasCalculated ? getChecklistLinkForCalculator(calculator.slug) : null,
    [calculator.slug, hasCalculated],
  );
  const checklistHref = useMemo(
    () => hasCalculated ? buildChecklistHrefForCalculator(calculator.slug) : null,
    [calculator.slug, hasCalculated],
  );
  const curingTimerHref = useMemo(
    () => hasCalculated ? buildCuringTimerHrefFromCalculator(calculator.slug, values) : null,
    [calculator.slug, hasCalculated, values],
  );

  const accentColor = category?.color ?? "#f97316";
  const mobileCollapsedCount = Math.max(0, visibleFields.length - MOBILE_PRIMARY_FIELD_COUNT);
  const desktopCollapsedCount = Math.max(0, visibleFields.length - DESKTOP_PRIMARY_FIELD_COUNT);

  const triggerCalculate = () => {
    if (handleCalculate()) return;

    setShowAllFields(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(`calculator-field-${invalidFields[0]?.field.key}`)?.focus();
      });
    });
  };

  const reviewInput = useMemo(() => {
    if (!hasCalculated || !result || result.materials.length === 0) return null;
    return {
      calculatorTitle: calculator.title,
      calculatorSlug: calculator.slug,
      fields: calculator.fields,
      values,
      result,
      companionSlugs: getCompanionSlugs(calculator.slug),
    };
  }, [calculator, hasCalculated, result, values]);

  const mikhalychContext = reviewInput ? buildMikhalychCalcContext(reviewInput) : undefined;
  const practicalAdvice = result?.practicalNotes?.[0]
    ?? calculator.expertTips?.[0]?.content
    ?? "Проверяйте фасовку выбранного материала перед покупкой и округляйте упаковки в большую сторону.";

  useEffect(() => {
    if (calcNonce === 0 || !resultRef.current) return;
    const element = resultRef.current;
    const frame = requestAnimationFrame(() => {
      const top = element.getBoundingClientRect().top;
      if (window.innerWidth >= 1280 || (top >= 0 && top < window.innerHeight * 0.35)) return;
      window.scrollTo({ top: top + window.scrollY - 80, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [calcNonce]);

  useEffect(() => {
    if (!hasStarted || !result || hasTrackedResultViewRef.current) return;
    const element = resultRef.current;
    if (!element) return;

    const markResultViewed = () => {
      if (hasTrackedResultViewRef.current) return;
      hasTrackedResultViewRef.current = true;
      trackCalculatorResultView(calculator.slug);
    };

    if (!("IntersectionObserver" in window)) {
      markResultViewed();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        markResultViewed();
        observer.disconnect();
      },
      // Блок результата может быть выше viewport в несколько раз. 35% такого
      // блока недостижимы даже когда пользователь читает его верхнюю часть.
      { threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [calculator.slug, hasStarted, result]);

  const fieldVisibilityClass = (index: number) => {
    if (showAllFields) return "";
    if (index >= DESKTOP_PRIMARY_FIELD_COUNT) return "hidden";
    if (index >= MOBILE_PRIMARY_FIELD_COUNT) return "hidden sm:block";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3" data-print-hide>
        <TileLayoutTransferBanner />
        {calculator.slug === "plitka" && transferSource === TILE_ROOM_TRANSFER_FROM && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
            Из расчёта комнаты перенесены {roomTransferValue}. Здесь уточните формат плитки, фасовку, схему укладки, ширину шва и запас.
          </div>
        )}
        {calculator.slug === "beton" && foundationConcreteSourceLabel && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            Из расчёта {foundationConcreteSourceLabel} перенесены чистый объём бетона и запас. Здесь выберите класс бетона и способ закупки: готовая смесь или самостоятельный замес.
          </div>
        )}
        {calculator.slug === "teplyy-pol" && transferSource === ELECTRIC_FLOOR_TRANSFER_FROM && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            Из расчёта стяжки перенесена общая площадь помещения. Отдельно вычтите стационарную мебель и сантехнику, укажите фактическую площадь раскладки и паспортные данные выбранного комплекта.
          </div>
        )}
        {calculator.slug === "styazhka" && transferSource === SCREED_TRANSFER_FROM && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            Из электрического тёплого пола перенесена площадь всего помещения, а не только зона нагрева. Толщину и конструкцию стяжки укажите по проекту пола.
          </div>
        )}
        {calculator.slug === "kladka-kirpicha" && transferSource === BRICK_LAYOUT_TRANSFER_FROM && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300">
            Из раскладки перенесены размеры одного непрерывного участка, нулевая площадь проёмов, формат кирпича и допустимый шов. Толщину стены и реальные проёмы укажите по проекту.
          </div>
        )}
        {calculator.slug === "krepezh" && transferSource === SHEET_LAYOUT_TRANSFER_FROM && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-300">
            Из карты раскроя перенесено <strong>{values.sheetCount} {pluralizeRu(values.sheetCount, ["лист", "листа", "листов"])}</strong>, выбран материал и базовый шаг крепления. Проверьте шаг по системе производителя и условиям основания.
          </div>
        )}
        {transferSource === PARTITION_FINISHING_TRANSFER_FROM
          && ["gruntovka", "shtukaturka", "shpaklevka"].includes(calculator.slug) && (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
            data-testid="partition-finishing-transfer-banner"
          >
            Перенесена площадь обеих сторон перегородки
            {Number.isFinite(transferredFinishingArea) && transferredFinishingArea > 0
              ? <> — <strong>{transferredFinishingArea.toLocaleString("ru-RU")} м²</strong></>
              : null}.
            {calculator.slug === "gruntovka" && " Проверьте фактическую площадь, тип основания и число слоёв по инструкции состава."}
            {calculator.slug === "shtukaturka" && " Проёмы не вычтены: уточните площадь, вид смеси и толщину выравнивания."}
            {calculator.slug === "shpaklevka" && " Этот этап выполняют по уже выровненному основанию: выберите тип шпаклёвки и класс подготовки."}
          </div>
        )}
        {calculator.slug === "shpaklevka" && transferSource === PLASTER_FINISHING_TRANSFER_FROM && (
          <div
            className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300"
            data-testid="plaster-putty-transfer-banner"
          >
            Из штукатурки перенесена чистая площадь после вычета проёмов
            {Number.isFinite(transferredFinishingArea) && transferredFinishingArea > 0
              ? <> — <strong>{transferredFinishingArea.toLocaleString("ru-RU")} м²</strong></>
              : null}.
            Выберите тип шпаклёвки и класс подготовки под краску или обои.
          </div>
        )}
        {transferSource === PUTTY_FINISHING_TRANSFER_FROM
          && ["gruntovka", "kraska", "oboi"].includes(calculator.slug) && (
          <div
            className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300"
            data-testid="putty-finish-transfer-banner"
          >
            Из шпаклёвки перенесена площадь подготовленных стен
            {Number.isFinite(transferredFinishingArea) && transferredFinishingArea > 0
              ? <> — <strong>{transferredFinishingArea.toLocaleString("ru-RU")} м²</strong></>
              : null}.
            {calculator.slug === "gruntovka" && " Уточните тип основания и необходимое число слоёв по инструкции грунта."}
            {calculator.slug === "kraska" && " Переход предполагает уже загрунтованное основание: уточните число слоёв и укрывистость выбранной краски."}
            {calculator.slug === "oboi" && " Укажите фактическую высоту, площадь проёмов, размер рулона и раппорт: эти параметры нельзя восстановить из площади шпаклевания."}
          </div>
        )}
        {calculator.slug === "uteplenie-fasada-minvatoj" && transferSource === INSULATION_FACADE_TRANSFER_FROM && (
          <div
            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300"
            data-testid="wet-facade-transfer-banner"
          >
            Из общего расчёта перенесены площадь фасада, толщина и совместимый тип плит. Проверьте финишный слой и фактическое число плит в упаковке выбранного материала.
          </div>
        )}
        {transferSource === INSULATION_FACADE_TRANSFER_FROM
          && ["sayding", "fasadnye-paneli"].includes(calculator.slug) && (
          <div
            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300"
            data-testid="facade-cladding-transfer-banner"
          >
            Из утепления перенесена чистая площадь фасада
            {Number.isFinite(transferredFinishingArea) && transferredFinishingArea > 0
              ? <> — <strong>{transferredFinishingArea.toLocaleString("ru-RU")} м²</strong></>
              : null}.
            {calculator.slug === "sayding" && " Проёмы не вычитаются повторно; уточните реальный периметр, высоту, углы и тип сайдинга."}
            {calculator.slug === "fasadnye-paneli" && " Уточните полезную площадь панели, запас, шаг подсистемы, крепёж и доборные элементы по паспорту."}
          </div>
        )}
        {calculator.slug === INSULATION_FACADE_TRANSFER_FROM
          && (transferSource === "sayding" || transferSource === "fasadnye-paneli") && (
          <div
            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300"
            data-testid="facade-insulation-transfer-banner"
          >
            Из облицовки перенесена рассчитанная чистая площадь фасада
            {Number.isFinite(transferredFinishingArea) && transferredFinishingArea > 0
              ? <> — <strong>{transferredFinishingArea.toLocaleString("ru-RU")} м²</strong></>
              : null}
            и выбрана каркасная система. Материал, форму, толщину, климатическую зону, запас и упаковку укажите для своего проекта.
          </div>
        )}
        {calculator.slug === SOFT_ROOFING_TRANSFER_FROM && transferSource === ROOFING_TRANSFER_FROM && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
            data-testid="soft-roofing-transfer-banner"
          >
            Из общей ведомости перенесена площадь скатов
            {Number.isFinite(transferredRoofArea) && transferredRoofArea > 0
              ? <> — <strong>{transferredRoofArea.toLocaleString("ru-RU")} м²</strong></>
              : null}.
            Уклон переносится только из явного расчёта по проекции; длины — только из проектных полей. Проверьте все значения перед расчётом системы мягкой кровли.
          </div>
        )}
        {calculator.slug === ROOFING_TRANSFER_FROM
          && (transferSource === SOFT_ROOFING_TRANSFER_FROM || transferSource === GUTTERS_TRANSFER_FROM) && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
            data-testid="roofing-transfer-banner"
          >
            Перенесена фактическая площадь скатов
            {Number.isFinite(transferredRoofArea) && transferredRoofArea > 0
              ? <> — <strong>{transferredRoofArea.toLocaleString("ru-RU")} м²</strong></>
              : null}.
            {transferSource === SOFT_ROOFING_TRANSFER_FROM && " Тип мягкой черепицы и введённые проектные длины сохранены; полезную площадь товара, запасы и фасовки уточните."}
            {transferSource === GUTTERS_TRANSFER_FROM && " Тип покрытия, раскладку, запасы, фасовки и проектные позиции выберите отдельно: водосток их не определяет."}
          </div>
        )}
        {calculator.slug === GUTTERS_TRANSFER_FROM
          && (transferSource === ROOFING_TRANSFER_FROM || transferSource === SOFT_ROOFING_TRANSFER_FROM) && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
            data-testid="gutters-transfer-banner"
          >
            Из кровельного расчёта перенесена только площадь скатов
            {Number.isFinite(transferredRoofArea) && transferredRoofArea > 0
              ? <> — <strong>{transferredRoofArea.toLocaleString("ru-RU")} м²</strong></>
              : null}
            для проверки пропускной способности. Введите фактическую длину желобов, высоту стены, стояки, прямые участки, углы и заглушки по схеме дома.
          </div>
        )}
        {calculator.slug === TERRACE_CALCULATOR_TRANSFER_FROM && transferSource === DECK_LAYOUT_TRANSFER_FROM && (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
            data-testid="deck-calculator-transfer-banner"
          >
            Из раскладки перенесены размеры площадки с учётом направления настила, формат доски, зазор и запас.
            {Number.isFinite(deckLayoutBoardsHint) && deckLayoutBoardsHint > 0
              ? <> Визуальная схема дала <strong>{deckLayoutBoardsHint} {pluralizeRu(deckLayoutBoardsHint, ["доску", "доски", "досок"])} к покупке</strong>.</>
              : null}
            {" "}Для закупки доски сохраняйте результат раскладки: калькулятор ниже нужен прежде всего для лаг, клипс, крепежа, обработки и геотекстиля и не учитывает ширину пропила и разбежку стыков.
          </div>
        )}
        {calculator.slug === PAVING_CALCULATOR_TRANSFER_FROM && transferSource === PAVER_LAYOUT_TRANSFER_FROM && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300" data-testid="paving-calculator-transfer-banner">
            Из раскладки перенесены точные площадь прямоугольной площадки и периметр внутри бордюров.
            {Number.isFinite(paverLayoutPiecesHint) && paverLayoutPiecesHint > 0
              ? <> Схема дала <strong>{paverLayoutPiecesHint} {pluralizeRu(paverLayoutPiecesHint, ["элемент", "элемента", "элементов"])} плитки к покупке</strong>.</>
              : null}
            {" "}Этот штучный итог сохраняйте из раскладки; калькулятор ниже считает плитку в м², основание, песок для швов, бордюр и геотекстиль.
          </div>
        )}
        {calculator.slug === CEILING_STRETCH_TRANSFER_FROM
          && transferSource === LIGHTING_LAYOUT_TRANSFER_FROM
          && lightingLayoutTransfer && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300" data-testid="ceiling-lighting-transfer-banner">
            Из прямоугольной схемы перенесены площадь <strong>{lightingLayoutTransfer.areaM2.toLocaleString("ru-RU")} м²</strong>, четыре угла и <strong>{lightingLayoutTransfer.fixtures} {pluralizeRu(lightingLayoutTransfer.fixtures, ["светильник", "светильника", "светильников"])}</strong>. Точный геометрический периметр комнаты — <strong>{lightingLayoutTransfer.exactPerimeterM.toLocaleString("ru-RU")} м</strong>. Профиль ниже остаётся предварительной оценкой по эквивалентному квадрату; для сметы используйте фактический периметр и уточните ниши, трубы и тип полотна. Количество точек задано пользователем, а не рассчитано по освещённости.
          </div>
        )}
        {calculator.slug === "laminat" && transferSource === LAMINATE_LAYOUT_TRANSFER_FROM && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            Из схемы перенесены размеры комнаты и способ укладки. Здесь уточните площадь упаковки, подложку, плинтус и запас.
          </div>
        )}
        {calculator.slug === "laminat" && transferSource === LAMINATE_ROOM_TRANSFER_FROM && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
            Из расчёта комнаты перенесены {roomTransferValue}. Здесь уточните упаковку, способ укладки, запас, подложку и плинтус.
          </div>
        )}
        {calculator.slug === "oboi" && transferSource === WALLPAPER_ROOM_TRANSFER_FROM && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300">
            Из расчёта комнаты перенесены периметр и высота стен. Укажите площадь окон и дверей, параметры рулона, раппорт и запас.
          </div>
        )}
        {Number.isFinite(wallpaperRollsHint) && wallpaperRollsHint > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300">
            Из раскладки перенесено: <strong>{wallpaperRollsHint} {pluralizeRu(wallpaperRollsHint, ["рулон", "рулона", "рулонов"])}</strong>. Здесь уточняются клей, грунтовка и расходники.
          </div>
        )}
        {Number.isFinite(sheetLayoutHint) && sheetLayoutHint > 0 && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-300">
            Из карты раскроя перенесено: <strong>{sheetLayoutHint} {pluralizeRu(sheetLayoutHint, ["лист", "листа", "листов"])}</strong>. Здесь уточняются профиль, крепёж и расходники.
          </div>
        )}
      </div>

      {hasCalculated && result && (
        <nav className="sticky top-[4.5rem] z-20 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur sm:hidden dark:border-slate-700 dark:bg-slate-900/95" aria-label="Навигация по расчёту" data-print-hide>
          <button type="button" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-300">Параметры</button>
          <button type="button" onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-11 rounded-lg bg-accent-700 px-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50">Результат ↓</button>
        </nav>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section ref={formRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm scroll-mt-24 sm:p-6 dark:border-slate-700 dark:bg-slate-900" data-print-hide aria-labelledby="calculator-parameters-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="calculator-parameters-title" className="mr-auto text-xl font-bold text-slate-950 dark:text-white">Параметры расчёта</h2>
            <div className="ml-auto flex shrink-0 items-center gap-3">
              {calcHistory.length > 0 && (
                <button type="button" onClick={() => setShowHistory(!showHistory)} className="whitespace-nowrap text-sm font-medium text-slate-400 hover:text-accent-700" title={CALCULATOR_UI_TEXT.historyTitle}>История · {calcHistory.length}</button>
              )}
              <button type="button" onClick={() => { handleReset(); setShowAllFields(false); }} className="whitespace-nowrap text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Сбросить</button>
            </div>
          </div>

          {showHistory && calcHistory.length > 0 && <div className="mb-5"><HistoryPanel calcHistory={calcHistory} onRestore={handleRestoreHistory} /></div>}

          <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
            {visibleFields.map((field, index) => {
              const fullWidth = field.fullWidth || field.type === "slider" || field.type === "radio";
              return (
                <div key={field.key} className={`${fullWidth ? "sm:col-span-2" : ""} ${fieldVisibilityClass(index)}`.trim()}>
                  <FieldInput field={field} value={values[field.key] ?? field.defaultValue} onChange={(value) => handleChange(field.key, value)} accentColor={accentColor} />
                </div>
              );
            })}
          </div>

          {mobileCollapsedCount > 0 && (
            <button type="button" onClick={() => setShowAllFields((value) => !value)} aria-expanded={showAllFields} className="mt-5 flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 sm:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {showAllFields ? "Скрыть дополнительные параметры" : `Дополнительные параметры · ${mobileCollapsedCount}`}
              <span className={`transition-transform ${showAllFields ? "rotate-180" : ""}`} aria-hidden>⌄</span>
            </button>
          )}
          {desktopCollapsedCount > 0 && (
            <button type="button" onClick={() => setShowAllFields((value) => !value)} aria-expanded={showAllFields} className="mt-5 hidden min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 sm:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {showAllFields ? "Скрыть дополнительные параметры" : `Дополнительные параметры · ${desktopCollapsedCount}`}
              <span className={`transition-transform ${showAllFields ? "rotate-180" : ""}`} aria-hidden>⌄</span>
            </button>
          )}

          {hasValidationErrors && (
            <p id="calculator-validation-summary" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300" role="alert">
              Проверьте выделенные поля: значение должно быть в указанном диапазоне.
            </p>
          )}

          <button
            type="button"
            onClick={triggerCalculate}
            aria-describedby={hasValidationErrors ? "calculator-validation-summary" : undefined}
            className="btn-primary mt-5 min-h-12 w-full text-base"
          >
            {hasValidationErrors ? "Исправьте параметры" : "Рассчитать"}
          </button>

          {calculator.slug === "plitka" && (
            <Link
              href={buildTileLayoutHrefFromCalculatorValues(values)}
              onClick={() => trackCalculatorRelatedClick("plitka", "raskladka-plitki")}
              className="mt-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 no-underline dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300"
            >
              Увидеть плитку, швы и подрезку на схеме <span aria-hidden>→</span>
            </Link>
          )}

          {calculator.slug === "laminat" && (
            <Link
              href={buildLaminateLayoutHref({
                inputMode: values.inputMode,
                length: values.length,
                width: values.width,
                layingMethod: values.layingMethod,
                offsetMode: values.offsetMode,
              })}
              onClick={() => trackCalculatorRelatedClick("laminat", "raskladka-laminata")}
              className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 no-underline dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
            >
              Увидеть раскладку 1/3, 1/2 или ёлочкой <span aria-hidden>→</span>
            </Link>
          )}
          {calculator.slug === "oboi" && (
            <Link
              href={buildWallpaperLayoutHref({ perimeter: values.perimeter, height: values.height, rollLength: values.rollLength, rollWidth: values.rollWidth, rapport: values.rapport, reserveRolls: values.reserveRolls })}
              onClick={() => trackCalculatorRelatedClick("oboi", "raskladka-oboev")}
              className="mt-3 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 no-underline dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300"
            >
              Разложить полосы и увидеть раскрой рулонов <span aria-hidden>→</span>
            </Link>
          )}
          {calculator.slug === "gipsokarton" && (
            <Link
              href={buildSheetLayoutHrefFromDrywall({ length: values.length, height: values.height, layers: values.layers, sheetSize: values.sheetSize })}
              onClick={() => trackCalculatorRelatedClick("gipsokarton", "raskladka-listov")}
              className="mt-3 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 no-underline dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-300"
            >
              Разложить листы и увидеть карту раскроя <span aria-hidden>→</span>
            </Link>
          )}
          {fastenersLayoutHref && (
            <Link
              href={fastenersLayoutHref}
              onClick={() => trackCalculatorRelatedClick("krepezh", "raskladka-listov")}
              className="mt-3 flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-800 no-underline dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-300"
            >
              Разложить листы и сверить количество <span aria-hidden>→</span>
            </Link>
          )}
          {brickworkLayoutHref && (
            <Link
              href={brickworkLayoutHref}
              onClick={() => trackCalculatorRelatedClick(calculator.slug, "raskladka-kirpicha")}
              className="mt-3 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 no-underline dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300"
            >
              Построить схему отдельного участка кладки <span aria-hidden>→</span>
            </Link>
          )}
          {concreteCalculatorHref && (
            <Link
              href={concreteCalculatorHref}
              onClick={() => trackCalculatorRelatedClick(calculator.slug, "beton")}
              className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 no-underline hover:border-stone-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            >
              Уточнить марку, заказ миксера или состав замеса <span aria-hidden>→</span>
            </Link>
          )}
          {electricFloorHref && (
            <Link
              href={electricFloorHref}
              onClick={() => trackCalculatorRelatedClick("styazhka", "teplyy-pol")}
              className="mt-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 no-underline dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
            >
              Спланировать электрический тёплый пол <span aria-hidden>→</span>
            </Link>
          )}
          {screedHref && (
            <Link
              href={screedHref}
              onClick={() => trackCalculatorRelatedClick("teplyy-pol", "styazhka")}
              className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 no-underline dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
            >
              Рассчитать стяжку по площади помещения <span aria-hidden>→</span>
            </Link>
          )}
          {partitionFinishingLinks.length > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <p className="px-1 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Продолжить отделку обеих сторон перегородки
              </p>
              <p className="mt-1 px-1 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-300/80">
                Перенесём площадь без проёмов. На каждом этапе проверьте основание и систему материалов.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {partitionFinishingLinks.map((link) => (
                  <Link
                    key={link.target}
                    href={link.href}
                    onClick={() => trackCalculatorRelatedClick(PARTITION_FINISHING_TRANSFER_FROM, link.target)}
                    className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm no-underline transition-colors hover:border-emerald-400 dark:border-emerald-900/70 dark:bg-slate-900"
                  >
                    <span className="block font-semibold text-emerald-900 dark:text-emerald-200">{link.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{link.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {puttyFromPlasterHref && (
            <Link
              href={puttyFromPlasterHref}
              onClick={() => trackCalculatorRelatedClick(PLASTER_FINISHING_TRANSFER_FROM, PUTTY_FINISHING_TRANSFER_FROM)}
              className="mt-3 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800 no-underline dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300"
            >
              После высыхания рассчитать шпаклёвку по чистой площади <span aria-hidden>→</span>
            </Link>
          )}
          {puttyFinishLinks.length > 0 && (
            <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
              <p className="px-1 text-sm font-semibold text-violet-900 dark:text-violet-200">
                Выбрать финиш для подготовленных стен
              </p>
              <p className="mt-1 px-1 text-xs leading-relaxed text-violet-800/80 dark:text-violet-300/80">
                Перенесём только площадь. Слои, проёмы и параметры покрытия остаются вашим выбором.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {puttyFinishLinks.map((link) => (
                  <Link
                    key={link.target}
                    href={link.href}
                    onClick={() => trackCalculatorRelatedClick(PUTTY_FINISHING_TRANSFER_FROM, link.target)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm no-underline transition-colors hover:border-violet-400 dark:border-violet-900/70 dark:bg-slate-900"
                  >
                    <span className="block font-semibold text-violet-900 dark:text-violet-200">{link.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{link.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {facadeSystemLinks.length > 0 && (
            <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/50 dark:bg-orange-950/20">
              <p className="px-1 text-sm font-semibold text-orange-900 dark:text-orange-200">
                Продолжить расчёт фасадной системы
              </p>
              <p className="mt-1 px-1 text-xs leading-relaxed text-orange-800/80 dark:text-orange-300/80">
                Ветку выбирает указанная система монтажа. Переносим только совместимые параметры без подмены материала и геометрии.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {facadeSystemLinks.map((link) => (
                  <Link
                    key={link.target}
                    href={link.href}
                    onClick={() => trackCalculatorRelatedClick(INSULATION_FACADE_TRANSFER_FROM, link.target)}
                    className="rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-sm no-underline transition-colors hover:border-orange-400 dark:border-orange-900/70 dark:bg-slate-900"
                  >
                    <span className="block font-semibold text-orange-900 dark:text-orange-200">{link.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{link.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {insulationFromFacadeHref && (
            <Link
              href={insulationFromFacadeHref}
              onClick={() => trackCalculatorRelatedClick(calculator.slug, INSULATION_FACADE_TRANSFER_FROM)}
              className="mt-3 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 no-underline dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300"
            >
              Рассчитать утеплитель под вентфасад по чистой площади <span aria-hidden>→</span>
            </Link>
          )}
          {roofSystemLinks.length > 0 && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
              <p className="px-1 text-sm font-semibold text-red-900 dark:text-red-200">
                Продолжить расчёт кровельной системы
              </p>
              <p className="mt-1 px-1 text-xs leading-relaxed text-red-800/80 dark:text-red-300/80">
                Площадь скатов сохраняется. Покрытие и водосток остаются разными расчётами со своими проектными входами.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {roofSystemLinks.map((link) => (
                  <Link
                    key={link.target}
                    href={link.href}
                    onClick={() => trackCalculatorRelatedClick(calculator.slug, link.target)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm no-underline transition-colors hover:border-red-400 dark:border-red-900/70 dark:bg-slate-900"
                  >
                    <span className="block font-semibold text-red-900 dark:text-red-200">{link.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{link.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {roofingFromGuttersHref && (
            <Link
              href={roofingFromGuttersHref}
              onClick={() => trackCalculatorRelatedClick(GUTTERS_TRANSFER_FROM, ROOFING_TRANSFER_FROM)}
              className="mt-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 no-underline dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
            >
              Рассчитать кровельное покрытие по площади скатов <span aria-hidden>→</span>
            </Link>
          )}
          {deckLayoutHref && (
            <Link
              href={deckLayoutHref}
              onClick={() => trackCalculatorRelatedClick(TERRACE_CALCULATOR_TRANSFER_FROM, DECK_LAYOUT_TRANSFER_FROM)}
              className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 no-underline dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
            >
              Проверить направление, стыки и раскрой доски на схеме <span aria-hidden>→</span>
            </Link>
          )}
          {paverLayoutHref && (
            <Link
              href={paverLayoutHref}
              onClick={() => trackCalculatorRelatedClick(PAVING_CALCULATOR_TRANSFER_FROM, PAVER_LAYOUT_TRANSFER_FROM)}
              className="mt-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 no-underline dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
            >
              Построить схему и уточнить количество плиток по формату <span aria-hidden>→</span>
            </Link>
          )}
          {lightingLayoutHref && (
            <Link
              href={lightingLayoutHref}
              onClick={() => trackCalculatorRelatedClick(CEILING_STRETCH_TRANSFER_FROM, LIGHTING_LAYOUT_TRANSFER_FROM)}
              className="mt-3 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 no-underline dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300"
            >
              Расставить выбранные светильники на плане <span aria-hidden>→</span>
            </Link>
          )}
          {consumptionNormHref && (
            <Link
              href={consumptionNormHref}
              onClick={() => trackCalculatorRelatedClick(calculator.slug, CONSUMPTION_NORMS_TOOL_SLUG)}
              className="mt-3 flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-800 no-underline dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-300"
              data-testid="consumption-norms-link"
            >
              Сверить базовый расход с техкартами производителей <span aria-hidden>→</span>
            </Link>
          )}
          {checklistLink && checklistHref && (
            <Link
              href={checklistHref}
              onClick={() => trackCalculatorRelatedClick(calculator.slug, `chek-listy/${checklistLink.checklistSlug}`)}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm no-underline dark:border-emerald-900/50 dark:bg-emerald-950/20"
              data-testid="calculator-checklist-link"
            >
              <span>
                <span className="block font-semibold text-emerald-900 dark:text-emerald-200">
                  Перейти от расчёта к выполнению работ
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-600 dark:text-slate-400">
                  {checklistLink.checklistCta}: этапы, контроль и сохранение прогресса.
                </span>
              </span>
              <span className="shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden>→</span>
            </Link>
          )}
          {curingTimerHref && (
            <Link
              href={curingTimerHref}
              onClick={() => trackCalculatorRelatedClick(calculator.slug, CURING_TIMER_TOOL_SLUG)}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm no-underline dark:border-amber-900/50 dark:bg-amber-950/20"
              data-testid="calculator-curing-timer-link"
            >
              <span>
                <span className="block font-semibold text-amber-900 dark:text-amber-200">
                  Выбрать ориентир схватывания или высыхания
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-600 dark:text-slate-400">
                  Перенесём только тип материала. Срок нужно сверить с упаковкой, а таймер запустить вручную.
                </span>
              </span>
              <span className="shrink-0 text-amber-700 dark:text-amber-300" aria-hidden>→</span>
            </Link>
          )}
        </section>

        <section ref={resultRef} className="scroll-mt-24" aria-label="Результат расчёта">
          {result ? (
            <ResultBlock
              result={result}
              shareState={shareState}
              onShare={handleShare}
              calculatorSlug={calculator.slug}
              calculatorTitle={calculator.title}
              projectSave={{ calcId: calculator.id, calcTitle: calculator.title, slug: calculator.slug, categorySlug: calculator.categorySlug }}
            />
          ) : (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm xl:min-h-[36rem] dark:border-slate-700 dark:bg-slate-900">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-900/25 dark:text-accent-300"><CategoryIcon icon="calculator" size={27} color="currentColor" /></span>
              <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Здесь появится результат</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">Заполните параметры слева и нажмите «Рассчитать». Покажем точную потребность, запас и количество к покупке.</p>
            </div>
          )}
        </section>
      </div>

      {calculator.slug === "kalkulyator-lestnicy" && hasCalculated && (() => {
        const floorH = Number(values.floorHeight) || 2.8;
        const stepH = Number(values.stepHeight) || 170;
        const steps = Math.max(1, Math.round(floorH * 1000 / stepH));
        return <div data-print-hide><Staircase3DWrapper stepCount={steps} stepHeightM={floorH / steps} stepWidthM={(Number(values.stepWidth) || 280) / 1000} stairWidthM={Number(values.stairWidth) || 1} floorHeightM={floorH} materialType={Number(values.materialType) || 0} /></div>;
      })()}

      {calculator.slug === "krovlya" && hasCalculated && (() => {
        const area = Number(values.area) || 80;
        const ridgeLength = Number(values.ridgeLength) || 8;
        return <div data-print-hide><Roof3DWrapper spanM={ridgeLength > 0 ? area / ridgeLength : 8} lengthM={ridgeLength} slopeAngle={Number(values.slope) || 30} roofType={Number(values.roofingType) || 0} overhangM={0.5} /></div>;
      })()}

      <aside className="overflow-hidden rounded-2xl bg-slate-950 text-white dark:bg-black" data-print-hide aria-label="Совет Михалыча">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10"><CategoryIcon icon="bot" size={23} color="#fff" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white">Совет Михалыча</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-300">{practicalAdvice}</p>
          </div>
          <button type="button" onClick={() => setShowMikhalych((value) => !value)} className="min-h-11 shrink-0 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10" aria-expanded={showMikhalych}>
            {showMikhalych ? "Скрыть чат" : "Задать вопрос"}
          </button>
        </div>
        {showMikhalych && <div className="border-t border-white/10 bg-slate-50 p-3 dark:bg-slate-900"><MikhalychWidget calculatorTitle={calculator.title} calcContext={mikhalychContext} /></div>}
      </aside>
    </div>
  );
}

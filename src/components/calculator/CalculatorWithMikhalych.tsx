"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCalculator, type CalculatorWidgetProps } from "./useCalculator";
import { CALCULATOR_COMPANIONS } from "@/lib/calculators/companions";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import { buildMikhalychCalcContext } from "@/lib/mikhalych/calc-context";
import { FieldInput, HistoryPanel, ResultBlock } from "./CalculatorParts";
import { CALCULATOR_UI_TEXT } from "./uiText";
import Staircase3DWrapper from "./Staircase3DWrapper";
import Roof3DWrapper from "./Roof3DWrapper";
import TileLayoutTransferBanner from "./TileLayoutTransferBanner";
import { pluralizeRu } from "@/lib/format/pluralize";
import { buildWallpaperLayoutHref } from "@/lib/tools/wallpaper-layout-to-calc";
import { buildSheetLayoutHrefFromDrywall } from "@/lib/tools/sheet-layout-to-calc";
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
  const wallpaperRollsHint = Number(searchParams.get("rollsHint"));
  const sheetLayoutHint = Number(searchParams.get("sheetsHint"));
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  const [showMikhalych, setShowMikhalych] = useState(false);

  const {
    values,
    result,
    hasCalculated,
    calcNonce,
    shareState,
    showHistory,
    setShowHistory,
    category,
    visibleFields,
    calcHistory,
    handleChange,
    handleCalculate,
    handleReset,
    handleShare,
    handleRestoreHistory,
  } = useCalculator(calculator);

  const accentColor = category?.color ?? "#f97316";
  const mobileCollapsedCount = Math.max(0, visibleFields.length - MOBILE_PRIMARY_FIELD_COUNT);
  const desktopCollapsedCount = Math.max(0, visibleFields.length - DESKTOP_PRIMARY_FIELD_COUNT);

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
          <button type="button" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Параметры</button>
          <button type="button" onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-10 rounded-lg bg-accent-700 px-3 text-sm font-semibold text-white">Результат ↓</button>
        </nav>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section ref={formRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm scroll-mt-24 sm:p-6 dark:border-slate-700 dark:bg-slate-900" data-print-hide aria-labelledby="calculator-parameters-title">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="calculator-parameters-title" className="text-xl font-bold text-slate-950 dark:text-white">Параметры расчёта</h2>
            <div className="flex items-center gap-3">
              {calcHistory.length > 0 && (
                <button type="button" onClick={() => setShowHistory(!showHistory)} className="text-sm font-medium text-slate-400 hover:text-accent-700" title={CALCULATOR_UI_TEXT.historyTitle}>История · {calcHistory.length}</button>
              )}
              <button type="button" onClick={() => { handleReset(); setShowAllFields(false); }} className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Сбросить</button>
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

          <button type="button" onClick={handleCalculate} className="btn-primary mt-5 min-h-12 w-full text-base">Рассчитать</button>

          {calculator.slug === "oboi" && (
            <Link href={buildWallpaperLayoutHref({ perimeter: values.perimeter, height: values.height, rollLength: values.rollLength, rollWidth: values.rollWidth, rapport: values.rapport, reserveRolls: values.reserveRolls })} className="mt-3 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 no-underline dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300">
              Разложить полосы и увидеть раскрой рулонов <span aria-hidden>→</span>
            </Link>
          )}
          {calculator.slug === "gipsokarton" && (
            <Link href={buildSheetLayoutHrefFromDrywall({ length: values.length, height: values.height, layers: values.layers, sheetSize: values.sheetSize })} className="mt-3 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 no-underline dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-300">
              Разложить листы и увидеть карту раскроя <span aria-hidden>→</span>
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

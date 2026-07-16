"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useNearViewport } from "@/hooks/useNearViewport";
import { useCalculator, type CalculatorWidgetProps } from "./useCalculator";
import { CALCULATOR_COMPANIONS } from "@/lib/calculators/companions";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import { buildMikhalychCalcContext } from "@/lib/mikhalych/calc-context";
import { FieldInput, HistoryPanel, ResultBlock } from "./CalculatorParts";
import CompanionLinks from "./CompanionLinks";
import { CALCULATOR_UI_TEXT } from "./uiText";
import Staircase3DWrapper from "./Staircase3DWrapper";
import Roof3DWrapper from "./Roof3DWrapper";
import TileLayoutTransferBanner from "./TileLayoutTransferBanner";
import { pluralizeRu } from "@/lib/format/pluralize";

const MOBILE_PRIMARY_FIELD_COUNT = 6;

const MikhalychWidget = dynamic(() => import("./MikhalychWidget"), {
  ssr: false,
  loading: () => (
    <div className="card p-6 min-h-[400px] flex items-center justify-center">
      <div className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">
        Загрузка Михалыча...
      </div>
    </div>
  ),
});

const MikhalychCalcReview = dynamic(() => import("./MikhalychCalcReview"), {
  ssr: false,
  loading: () => (
    <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
  ),
});

export type { CalculatorWidgetProps };

function getCompanionSlugs(slug: string): string[] {
  const companions = CALCULATOR_COMPANIONS[slug];
  if (!companions?.length) return [];
  return companions
    .map((c) => getCalculatorMetaBySlug(c.slug))
    .filter(Boolean)
    .map((c) => c!.title);
}

export default function CalculatorWithMikhalych({
  calculator,
}: {
  calculator: CalculatorWidgetProps;
}) {
  const mikhalychAnchorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [seedReview, setSeedReview] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  const nearMikhalych = useNearViewport(mikhalychAnchorRef, { rootMargin: "500px" });

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
  const collapsedFieldCount = Math.max(0, visibleFields.length - MOBILE_PRIMARY_FIELD_COUNT);

  const scrollToSection = (target: HTMLDivElement | null) => {
    if (!target) return;
    const HEADER_OFFSET = 112;
    const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
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
  }, [hasCalculated, result, calculator, values]);

  const mikhalychContext = reviewInput ? buildMikhalychCalcContext(reviewInput) : undefined;
  const loadMikhalych = nearMikhalych || reviewInput !== null;

  // После явного «Рассчитать» подкидываем к результату — но только если он не
  // на виду (чтобы на десктопе с коротким экраном не дёргать страницу зря).
  // calcNonce растёт лишь по кнопке, поэтому live-пересчёт слайдеров не триггерит.
  useEffect(() => {
    if (calcNonce === 0) return;
    const el = resultRef.current;
    if (!el) return;
    // Считаем абсолютную цель сами (top + scrollY − отступ под липкий хедер).
    // Не используем scrollIntoView: на мобиле он недокручивает блок до верха
    // даже при неподвижной цели. Window.scrollTo с явной математикой точен.
    const raf = requestAnimationFrame(() => {
      const rectTop = el.getBoundingClientRect().top;
      const HEADER_OFFSET = 80; // высота sticky-хедера (h-16) + воздух
      // Если результат уже прижат к верху (юзер тапнул кнопку высоко на экране) —
      // не дёргаем. Иначе (результат начинается в нижних ~65% экрана или ниже
      // сгиба) подтягиваем его шапку под хедер, чтобы summary было видно сразу.
      if (rectTop >= 0 && rectTop < window.innerHeight * 0.35) return;
      window.scrollTo({ top: rectTop + window.scrollY - HEADER_OFFSET, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [calcNonce]);

  return (
    <>
      <div className="space-y-6">
        <TileLayoutTransferBanner />

        {hasCalculated && result && (
          <nav
            aria-label="Навигация по расчёту"
            className="sticky top-[4.5rem] z-20 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur sm:hidden dark:border-slate-700 dark:bg-slate-900/95"
            data-print-hide
          >
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => scrollToSection(formRef.current)}
                className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Параметры
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(resultRef.current)}
                className="min-h-10 rounded-xl bg-accent-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
              >
                Результат ↓
              </button>
            </div>
          </nav>
        )}

        <div ref={formRef} className="card p-5 sm:p-6 space-y-5 scroll-mt-28" data-print-hide>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {CALCULATOR_UI_TEXT.parametersTitle}
            </h2>
            <div className="flex items-center gap-3">
              {calcHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-slate-400 hover:text-accent-700 transition-colors"
                  title={CALCULATOR_UI_TEXT.historyTitle}
                >
                  🕒 {calcHistory.length}
                </button>
              )}
              <button
                onClick={() => {
                  handleReset();
                  setShowAllFields(false);
                }}
                className="text-sm text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>

          {showHistory && calcHistory.length > 0 && (
            <HistoryPanel calcHistory={calcHistory} onRestore={handleRestoreHistory} />
          )}

          {/* Двухколоночный грид на sm+: форма компактнее, меньше скролла
              (особенно на смартфоне). Слайдеры, радио и явные fullWidth-поля
              занимают всю ширину; короткие селекты/числа делят строку. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            {visibleFields.map((field, index) => {
              const spanFull =
                field.fullWidth || field.type === "slider" || field.type === "radio";
              const isMobileCollapsed = index >= MOBILE_PRIMARY_FIELD_COUNT && !showAllFields;
              return (
                <div
                  key={field.key}
                  className={`${spanFull ? "sm:col-span-2" : ""} ${isMobileCollapsed ? "hidden sm:block" : ""}`.trim() || undefined}
                >
                  <FieldInput
                    field={field}
                    value={values[field.key] ?? field.defaultValue}
                    onChange={(v) => handleChange(field.key, v)}
                    accentColor={accentColor}
                  />
                </div>
              );
            })}
          </div>

          {collapsedFieldCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllFields((value) => !value)}
              aria-expanded={showAllFields}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 sm:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-accent-700 dark:hover:text-accent-300"
            >
              {showAllFields
                ? "Скрыть дополнительные параметры"
                : `Ещё ${collapsedFieldCount} ${pluralizeRu(collapsedFieldCount, ["параметр", "параметра", "параметров"])}`}
              <span className={`transition-transform ${showAllFields ? "rotate-180" : ""}`} aria-hidden>⌄</span>
            </button>
          )}

          <button
            onClick={handleCalculate}
            className="btn-primary w-full text-base"
            style={{ backgroundColor: category?.color }}
          >
            {hasCalculated ? "Показать обновлённый результат" : "Рассчитать и показать результат"}
          </button>
        </div>

        {result && (
          <div ref={resultRef} className="scroll-mt-20">
            <ResultBlock
              result={result}
              shareState={shareState}
              onShare={handleShare}
              calculatorSlug={calculator.slug}
              calculatorTitle={calculator.title}
              projectSave={{
                calcId: calculator.id,
                calcTitle: calculator.title,
                slug: calculator.slug,
                categorySlug: calculator.categorySlug,
              }}
            />
          </div>
        )}

        {/* Невидимый поставщик: грузит авто-разбор и поднимает его в seedReview,
            чтобы он стал первым сообщением единого чата Михалыча (без двойного блока). */}
        {reviewInput && loadMikhalych && (
          <MikhalychCalcReview input={reviewInput} onReviewReady={setSeedReview} />
        )}

        {hasCalculated && <CompanionLinks slug={calculator.slug} values={values} />}

        {calculator.slug === "kalkulyator-lestnicy" && hasCalculated && (() => {
          const floorH = Number(values.floorHeight) || 2.8;
          const stepH = Number(values.stepHeight) || 170;
          const stepW = Number(values.stepWidth) || 280;
          const stairW = Number(values.stairWidth) || 1;
          const matType = Number(values.materialType) || 0;
          const steps = Math.max(1, Math.round(floorH * 1000 / stepH));
          const realStepH = floorH / steps;
          return (
            <div data-print-hide>
              <Staircase3DWrapper
                stepCount={steps}
                stepHeightM={realStepH}
                stepWidthM={stepW / 1000}
                stairWidthM={stairW}
                floorHeightM={floorH}
                materialType={matType}
              />
            </div>
          );
        })()}

        {calculator.slug === "krovlya" && hasCalculated && (() => {
          const area = Number(values.area) || 80;
          const slope = Number(values.slope) || 30;
          const ridgeLen = Number(values.ridgeLength) || 8;
          const roofType = Number(values.roofingType) || 0;
          const spanEst = ridgeLen > 0 ? area / ridgeLen : 8;
          return (
            <div data-print-hide>
              <Roof3DWrapper
                spanM={spanEst}
                lengthM={ridgeLen}
                slopeAngle={slope}
                roofType={roofType}
                overhangM={0.5}
              />
            </div>
          );
        })()}
      </div>

      <div ref={mikhalychAnchorRef} data-print-hide className="scroll-mt-24 min-h-[120px]">
        {loadMikhalych ? (
          <MikhalychWidget
            calculatorTitle={calculator.title}
            calcContext={mikhalychContext}
            seedReview={seedReview}
          />
        ) : (
          <div className="card flex min-h-[120px] items-center justify-center p-6">
            <p className="text-center text-sm text-slate-400 dark:text-slate-500">
              Прокрутите вниз — здесь появится чат с Михалычем
            </p>
          </div>
        )}
      </div>
    </>
  );
}

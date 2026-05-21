"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
  const [chatOpenSignal, setChatOpenSignal] = useState(0);

  const {
    values,
    result,
    hasCalculated,
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

  const openMikhalychChat = () => {
    setChatOpenSignal((n) => n + 1);
    requestAnimationFrame(() => {
      mikhalychAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <div className="space-y-6">
        <TileLayoutTransferBanner />
        <div className="card p-6 space-y-5" data-print-hide>
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
                onClick={handleReset}
                className="text-sm text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>

          {showHistory && calcHistory.length > 0 && (
            <HistoryPanel calcHistory={calcHistory} onRestore={handleRestoreHistory} />
          )}

          {visibleFields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key] ?? field.defaultValue}
              onChange={(v) => handleChange(field.key, v)}
              accentColor={accentColor}
            />
          ))}

          <button
            onClick={handleCalculate}
            className="btn-primary w-full text-base"
            style={{ backgroundColor: category?.color }}
          >
            Рассчитать
          </button>
        </div>

        {result && (
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
            reviewSlot={
              reviewInput ? (
                <MikhalychCalcReview input={reviewInput} onAskMore={openMikhalychChat} />
              ) : undefined
            }
          />
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

      <div ref={mikhalychAnchorRef} data-print-hide className="scroll-mt-24">
        <MikhalychWidget
          calculatorTitle={calculator.title}
          calcContext={mikhalychContext}
          openSignal={chatOpenSignal}
        />
      </div>
    </>
  );
}

"use client";

import type { CalculatorField } from "@/lib/calculators/types";
import MikhalychWidget from "./MikhalychWidget";
import {
  useCalculator,
  formatNumber,
  type CalculatorWidgetProps,
} from "./useCalculator";
import { CALCULATOR_COMPANIONS } from "@/lib/calculators/companions";
import { getCalculatorBySlug } from "@/lib/calculators";
import { FieldInput, HistoryPanel, ResultBlock } from "./CalculatorParts";
import { CALCULATOR_UI_TEXT } from "./uiText";
import Staircase3DWrapper from "./Staircase3DWrapper";
import Roof3DWrapper from "./Roof3DWrapper";

export type { CalculatorWidgetProps };

/** Генерирует человекочитаемый контекст для Михалыча */
function buildCalcContext(
  calculatorTitle: string,
  fields: CalculatorField[],
  values: Record<string, number>,
  result: ReturnType<typeof useCalculator>["result"]
): string {
  const fieldLines = fields
    .filter((f) => !["inputMode"].includes(f.key))
    .map((f) => `${f.label}: ${formatNumber(values[f.key] ?? f.defaultValue)}${f.unit ? " " + f.unit : ""}`)
    .join(", ");

  let ctx = `Калькулятор "${calculatorTitle}". Параметры: ${fieldLines}.`;

  if (result && result.materials.length > 0) {
    const matLines = result.materials.slice(0, 4)
      .map((m) => `${m.name}: ${formatNumber(m.purchaseQty ?? m.withReserve ?? m.quantity)} ${m.unit}`)
      .join(", ");
    ctx += ` Результат расчёта: ${matLines}.`;
  }

  return ctx;
}

function getCompanionContext(slug: string): string {
  const companions = CALCULATOR_COMPANIONS[slug];
  if (!companions || companions.length === 0) return "";
  const names = companions
    .map((c) => getCalculatorBySlug(c.slug))
    .filter(Boolean)
    .map((c) => c!.title);
  if (names.length === 0) return "";
  return ` Связанные калькуляторы на сайте: ${names.join(", ")}. Рекомендуй их, если пользователь спрашивает о смежных материалах.`;
}

export default function CalculatorWithMikhalych({
  calculator,
}: {
  calculator: CalculatorWidgetProps;
}) {
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

  // Контекст для Михалыча — обновляется при каждом расчёте
  const companionCtx = getCompanionContext(calculator.slug);
  const mikhalychContext = hasCalculated
    ? buildCalcContext(calculator.title, calculator.fields, values, result) + companionCtx
    : undefined;

  return (
    <>
      {/* Калькулятор */}
      <div className="space-y-6">
        <div className="card p-6 space-y-5" data-print-hide>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{CALCULATOR_UI_TEXT.parametersTitle}</h2>
            <div className="flex items-center gap-3">
              {calcHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-slate-400 hover:text-accent-600 transition-colors"
                  title={CALCULATOR_UI_TEXT.historyTitle}
                >
                  🕒 {calcHistory.length}
                </button>
              )}
              <button onClick={handleReset} className="text-sm text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
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

        {/* Результат */}
        {result && (
          <ResultBlock result={result} shareState={shareState} onShare={handleShare} calculatorSlug={calculator.slug} />
        )}

        {/* 3D-модель лестницы — обновляется при каждом изменении полей */}
        {calculator.slug === "kalkulyator-lestnicy" && hasCalculated && (() => {
          const floorH = Number(values.floorHeight) || 2.8;
          const stepH = Number(values.stepHeight) || 170;
          const stepW = Number(values.stepWidth) || 280;
          const stairW = Number(values.stairWidth) || 1;
          const matType = Number(values.materialType) || 0;
          const steps = Math.max(1, Math.round(floorH * 1000 / stepH));
          const realStepH = floorH / steps;
          return (
            <Staircase3DWrapper
              stepCount={steps}
              stepHeightM={realStepH}
              stepWidthM={stepW / 1000}
              stairWidthM={stairW}
              floorHeightM={floorH}
              materialType={matType}
            />
          );
        })()}

        {/* 3D-модель кровли — обновляется при каждом изменении полей */}
        {calculator.slug === "krovlya" && hasCalculated && (() => {
          const area = Number(values.area) || 80;
          const slope = Number(values.slope) || 30;
          const ridgeLen = Number(values.ridgeLength) || 8;
          const roofType = Number(values.roofingType) || 0;
          const spanEst = ridgeLen > 0 ? area / ridgeLen : 8;
          return (
            <Roof3DWrapper
              spanM={spanEst}
              lengthM={ridgeLen}
              slopeAngle={slope}
              roofType={roofType}
              overhangM={0.5}
            />
          );
        })()}
      </div>

      {/* Михалыч */}
      <div data-print-hide>
        <MikhalychWidget
          calculatorTitle={calculator.title}
          calcContext={mikhalychContext}
          key={mikhalychContext ?? "no-context"}
        />
      </div>
    </>
  );
}

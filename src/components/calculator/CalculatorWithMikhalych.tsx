"use client";

import type { CalculatorField } from "@/lib/calculators/types";
import MikhalychWidget from "./MikhalychWidget";
import {
  useCalculator,
  formatNumber,
  type CalculatorWidgetProps,
} from "./useCalculator";
import { FieldInput, HistoryPanel, ResultBlock } from "./CalculatorParts";
import { CALCULATOR_UI_TEXT } from "./uiText";

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
  const mikhalychContext = hasCalculated
    ? buildCalcContext(calculator.title, calculator.fields, values, result)
    : undefined;

  return (
    <>
      {/* Калькулятор */}
      <div className="space-y-6">
        <div className="card p-6 space-y-5">
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
              <button onClick={handleReset} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
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
          <ResultBlock result={result} shareState={shareState} onShare={handleShare} />
        )}
      </div>

      {/* Михалыч */}
      <MikhalychWidget
        calculatorTitle={calculator.title}
        calcContext={mikhalychContext}
        key={mikhalychContext ?? "no-context"}
      />
    </>
  );
}

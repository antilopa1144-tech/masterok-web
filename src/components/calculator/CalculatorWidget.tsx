"use client";

import { useCalculator, type CalculatorWidgetProps } from "./useCalculator";
import { FieldInput, HistoryPanel, ResultBlock } from "./CalculatorParts";
import { CALCULATOR_PRESETS } from "@/lib/calculators/presets";

export type { CalculatorWidgetProps };

interface Props {
  calculator: CalculatorWidgetProps;
}

export default function CalculatorWidget({ calculator }: Props) {
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
    applyPreset,
  } = useCalculator(calculator);

  const accentColor = category?.color ?? "#f97316";
  const presets = CALCULATOR_PRESETS[calculator.slug];

  return (
    <div className="space-y-6">
      {/* Пресеты (быстрые примеры) */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Примеры:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.values)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-accent-300 hover:text-accent-600 hover:bg-accent-50 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Форма калькулятора */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Параметры расчёта</h2>
          <div className="flex items-center gap-3">
            {calcHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-slate-400 hover:text-accent-600 transition-colors flex items-center gap-1"
                title="История расчётов"
              >
                🕒 {calcHistory.length}
              </button>
            )}
            <button
              onClick={handleReset}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
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
          {hasCalculated ? "Сохранить в историю" : "Рассчитать"}
        </button>
      </div>

      {/* Результат */}
      {result && (
        <ResultBlock result={result} shareState={shareState} onShare={handleShare} />
      )}
    </div>
  );
}

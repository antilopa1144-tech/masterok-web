"use client";

import { useCalculator, type CalculatorWidgetProps } from "./useCalculator";
import { FieldInput, HistoryPanel, ResultBlock, ExpertTips, CalculatorFAQ } from "./CalculatorParts";
import { ExportButtons } from "./ExportButtons";
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
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Примеры:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.values)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent-300 dark:hover:border-accent-500/40 hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Форма калькулятора */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Параметры расчёта</h2>
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
                className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Результаты расчёта</h2>
            <ExportButtons calculatorName={calculator.title} result={result} />
          </div>
          <ResultBlock result={result} shareState={shareState} onShare={handleShare} />
        </div>
      )}

      {/* Экспертные советы */}
      {calculator.expertTips && calculator.expertTips.length > 0 && (
        <ExpertTips tips={calculator.expertTips} />
      )}

      {/* FAQ */}
      {calculator.faq && calculator.faq.length > 0 && (
        <CalculatorFAQ faq={calculator.faq} />
      )}
    </div>
  );
}

"use client";

import { useCalculator, type CalculatorWidgetProps } from "./useCalculator";
import { FieldInput, HistoryPanel, ResultBlock, ExpertTips, CalculatorFAQ, AccuracyModeSelector, ComparisonTable, FeedbackPanel } from "./CalculatorParts";
import { ExportButtons } from "./ExportButtons";
import { CALCULATOR_PRESETS } from "@/lib/calculators/presets";
import { CALCULATOR_UI_TEXT } from "./uiText";

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
    accuracyMode,
    accuracyHint,
    comparisonResults,
    showComparison,
    handleChange,
    handleCalculate,
    handleReset,
    handleShare,
    handleRestoreHistory,
    handleAccuracyModeChange,
    handleToggleComparison,
    handleCustomModifiersChange,
    customModifiers,
    applyPreset,
  } = useCalculator(calculator);

  const accentColor = category?.color ?? "#f97316";
  const presets = CALCULATOR_PRESETS[calculator.slug];

  return (
    <div className="space-y-6">
      {/* Пресеты (быстрые примеры) */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{CALCULATOR_UI_TEXT.examples}</span>
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{CALCULATOR_UI_TEXT.parametersTitle}</h2>
            <div className="flex items-center gap-3">
              {calcHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-slate-400 hover:text-accent-600 transition-colors flex items-center gap-1"
                  title={CALCULATOR_UI_TEXT.historyTitle}
              >
                🕒 {calcHistory.length}
              </button>
            )}
              <button
                onClick={handleReset}
                className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {CALCULATOR_UI_TEXT.reset}
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

        <AccuracyModeSelector
          mode={accuracyMode}
          onChange={handleAccuracyModeChange}
          accentColor={accentColor}
          customModifiers={customModifiers}
          onCustomModifiersChange={handleCustomModifiersChange}
        />

        {accuracyHint && accuracyHint.suggested !== accuracyMode && (
          <button
            onClick={() => handleAccuracyModeChange(accuracyHint.suggested)}
            className="w-full text-left text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl px-3 py-2.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
          >
            <span className="font-medium">💡 {accuracyHint.reason}</span>
          </button>
        )}

        <button
          onClick={handleCalculate}
          className="btn-primary w-full text-base"
          style={{ backgroundColor: category?.color }}
        >
          {hasCalculated ? CALCULATOR_UI_TEXT.saveToHistory : CALCULATOR_UI_TEXT.calculate}
        </button>
      </div>

      {/* Результат */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{CALCULATOR_UI_TEXT.resultsTitle}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleComparison}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  showComparison
                    ? "border-accent-300 dark:border-accent-600 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {CALCULATOR_UI_TEXT.comparisonToggle}
              </button>
              <ExportButtons calculatorName={calculator.title} result={result} />
            </div>
          </div>
          <ResultBlock result={result} shareState={shareState} onShare={handleShare} />

          {/* Сравнение режимов */}
          {showComparison && comparisonResults && (
            <ComparisonTable comparisonResults={comparisonResults} currentMode={accuracyMode} />
          )}

          {/* Обратная связь */}
          <FeedbackPanel
            calculatorSlug={calculator.slug}
            primaryMaterial={result.materials.find((m) => m.category === "Основное") ?? result.materials[0]}
            accuracyMode={result.accuracyMode}
          />
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

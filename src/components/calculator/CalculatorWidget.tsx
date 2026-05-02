"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCalculator, type CalculatorWidgetProps } from "./useCalculator";
import { FieldInput, HistoryPanel, ResultBlock, ExpertTips, CalculatorFAQ, AccuracyModeSelector, ComparisonTable, FeedbackPanel, ExperienceModeToggle } from "./CalculatorParts";
import { ExportButtons } from "./ExportButtons";
import { CALCULATOR_PRESETS } from "@/lib/calculators/presets";
import { CALCULATOR_UI_TEXT } from "./uiText";
import Staircase3DWrapper from "./Staircase3DWrapper";
import Roof3DWrapper from "./Roof3DWrapper";
import Link from "next/link";
import { CALCULATOR_COMPANIONS } from "@/lib/calculators/companions";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { getCategoryById } from "@/lib/calculators/categories";
import { trackRecentCalculator } from "./RecentCalculators";
export type { CalculatorWidgetProps };

interface Props {
  calculator: CalculatorWidgetProps;
}

export default function CalculatorWidget({ calculator }: Props) {
  const searchParams = useSearchParams();
  const fromCalc = searchParams.get("from");
  const fromCalcDef = useMemo(() => fromCalc ? getCalculatorMetaBySlug(fromCalc) : null, [fromCalc]);
  const [experienceMode, setExperienceMode] = useState<"beginner" | "pro">("beginner");
  const [pulse, setPulse] = useState(false);
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

  // Track this calculator as recently viewed
  useEffect(() => {
    trackRecentCalculator({
      id: calculator.id,
      slug: calculator.slug,
      title: calculator.title,
      categorySlug: calculator.categorySlug,
      categoryIcon: category?.icon ?? "wrench",
      categoryColor: category?.color ?? "#64748b",
      categoryBg: category?.bgColor ?? "#f1f5f9",
    });
  }, [calculator.id, calculator.slug, calculator.title, calculator.categorySlug, category]);

  const triggerCalculate = () => {
    handleCalculate();
    setPulse(true);
    window.setTimeout(() => setPulse(false), 620);
  };

  // Enter key triggers calculation from any input field
  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      triggerCalculate();
    }
  };

  return (
    <div className="space-y-6" onKeyDown={handleFormKeyDown}>
      {/* Баннер: значения перенесены из другого калькулятора */}
      {fromCalcDef && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <span>📐</span>
          <span>Значения перенесены из <strong>{fromCalcDef.title}</strong></span>
        </div>
      )}

      {/* Пресеты (быстрые примеры) */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap" data-print-hide>
          <span className="text-xs text-slate-400 dark:text-slate-400 font-medium">{CALCULATOR_UI_TEXT.examples}</span>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.values)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent-300 dark:hover:border-accent-500/40 hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Форма калькулятора */}
        <div className="card p-6 space-y-5" data-print-hide>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 shrink-0">{CALCULATOR_UI_TEXT.parametersTitle}</h2>
            <div className="flex items-center gap-3" data-print-hide>
              <ExperienceModeToggle mode={experienceMode} onChange={setExperienceMode} />
              {calcHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-slate-400 hover:text-accent-700 transition-colors flex items-center gap-1"
                  title={CALCULATOR_UI_TEXT.historyTitle}
              >
                🕒 {calcHistory.length}
              </button>
            )}
              <button
                onClick={handleReset}
                className="text-sm text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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

        {experienceMode === "pro" && (
          <>
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
          </>
        )}

        <button
          onClick={triggerCalculate}
          className={`btn-primary w-full text-base${pulse ? " btn-primary-pulse" : ""}`}
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
            <div className="flex items-center gap-2" data-print-hide>
              {experienceMode === "pro" && (
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
              )}
              <ExportButtons calculatorName={calculator.title} result={result} />
            </div>
          </div>
          <ResultBlock
            result={result}
            shareState={shareState}
            onShare={handleShare}
            calculatorSlug={calculator.slug}
            projectSave={{
              calcId: calculator.id,
              calcTitle: calculator.title,
              slug: calculator.slug,
              categorySlug: calculator.categorySlug,
            }}
          />

          {/* 3D-модель лестницы */}
          {calculator.slug === "kalkulyator-lestnicy" && (
            <Staircase3DWrapper
              stepCount={result.totals.stepCount ?? 16}
              stepHeightM={result.totals.realStepH ?? (result.totals.stepHeight ?? 170) / 1000}
              stepWidthM={(result.totals.stepWidth ?? 280) / 1000}
              stairWidthM={result.totals.stairWidth ?? 1}
              floorHeightM={result.totals.floorHeight ?? 2.8}
              materialType={result.totals.materialType ?? 0}
            />
          )}

          {/* 3D-модель кровли */}
          {calculator.slug === "krovlya" && (
            <Roof3DWrapper
              spanM={(result.totals.ridgeLength ?? 8) > 0 ? (result.totals.area ?? 80) / (result.totals.ridgeLength ?? 8) : 8}
              lengthM={result.totals.ridgeLength ?? 8}
              slopeAngle={result.totals.slope ?? 30}
              roofType={result.totals.roofingType ?? 0}
              overhangM={0.5}
            />
          )}

          {/* Сравнение режимов */}
          {showComparison && comparisonResults && (
            <ComparisonTable comparisonResults={comparisonResults} currentMode={accuracyMode} />
          )}

          {/* Обратная связь */}
          <div data-print-hide>
            <FeedbackPanel
              calculatorSlug={calculator.slug}
              primaryMaterial={result.materials.find((m) => m.category === "Основное") ?? result.materials[0]}
              accuracyMode={result.accuracyMode}
            />
          </div>

          {/* Спутники — связанные калькуляторы */}
          <div data-print-hide>
            <CompanionLinks slug={calculator.slug} values={values} />
          </div>
        </div>
      )}

      {/* Экспертные советы */}
      {calculator.expertTips && calculator.expertTips.length > 0 && (
        <div data-print-hide>
          <ExpertTips tips={calculator.expertTips} />
        </div>
      )}

      {/* FAQ */}
      {calculator.faq && calculator.faq.length > 0 && (
        <div data-print-hide>
          <CalculatorFAQ faq={calculator.faq} />
        </div>
      )}
    </div>
  );
}

// Keys that commonly transfer between calculators
const TRANSFERABLE_KEYS = ["area", "length", "width", "height", "inputMode"];

function buildTransferParams(values: Record<string, number>, targetSlug: string): string {
  const params = new URLSearchParams();
  for (const key of TRANSFERABLE_KEYS) {
    if (values[key] != null && values[key] > 0) {
      params.set(key, String(values[key]));
    }
  }
  params.set("from", targetSlug);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function CompanionLinks({ slug, values }: { slug: string; values: Record<string, number> }) {
  const companions = CALCULATOR_COMPANIONS[slug];
  if (!companions || companions.length === 0) return null;

  const resolved = companions
    .map((c) => {
      const calc = getCalculatorMetaBySlug(c.slug);
      if (!calc) return null;
      const cat = getCategoryById(calc.category);
      return { ...c, calc, cat };
    })
    .filter(Boolean) as { slug: string; reason: string; calc: NonNullable<ReturnType<typeof getCalculatorMetaBySlug>>; cat: ReturnType<typeof getCategoryById> }[];

  if (resolved.length === 0) return null;

  return (
    <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Также может пригодиться
      </p>
      <div className="space-y-2">
        {resolved.map((c) => (
          <Link
            key={c.slug}
            href={`/kalkulyatory/${c.calc.categorySlug}/${c.calc.slug}/${buildTransferParams(values, slug)}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-600 transition-all no-underline group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: c.cat?.bgColor ?? "#f1f5f9" }}
            >
              <CategoryIcon icon={c.cat?.icon ?? "wrench"} size={18} color={c.cat?.color ?? "#64748b"} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-accent-700 transition-colors">
                {c.calc.title}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {c.reason}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

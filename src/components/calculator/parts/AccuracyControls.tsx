"use client";

import type { CalculatorResult } from "@/lib/calculators/types";
import { formatNumber } from "../useCalculator";
import { CALCULATOR_UI_TEXT } from "../uiText";
import { formatWeightParts } from "@/lib/format/weight";
import { formatMaterialQty } from "./shared";
import {
  ACCURACY_MODES,
  ACCURACY_MODE_LABELS,
  ACCURACY_MODE_DESCRIPTIONS,
  type AccuracyMode,
  type AccuracyModifiers,
} from "../../../../engine/accuracy";
// ── Селектор точности расчёта ────────────────────────────────────────────────

const CUSTOM_SLIDER_KEYS: Array<{ key: keyof AccuracyModifiers; label: string; min: number; max: number }> = [
  { key: "waste", label: "Отходы", min: 1.0, max: 1.15 },
  { key: "cutting", label: "Подрезка", min: 1.0, max: 1.15 },
  { key: "unevenness", label: "Неровности", min: 1.0, max: 1.20 },
  { key: "overconsumption", label: "Перерасход", min: 1.0, max: 1.15 },
  { key: "errorMargin", label: "Ошибки", min: 1.0, max: 1.10 },
  { key: "topUp", label: "Добор", min: 1.0, max: 1.10 },
];

export function AccuracyModeSelector({
  mode,
  onChange,
  accentColor,
  customModifiers,
  onCustomModifiersChange,
}: {
  mode: AccuracyMode;
  onChange: (mode: AccuracyMode) => void;
  accentColor: string;
  customModifiers?: Partial<AccuracyModifiers>;
  onCustomModifiersChange?: (modifiers: Partial<AccuracyModifiers>) => void;
}) {
  const isCustom = mode === "custom";

  return (
    <div>
      <label className="input-label">{CALCULATOR_UI_TEXT.accuracyModeTitle}</label>
      <div className="grid grid-cols-3 gap-2">
        {ACCURACY_MODES.map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => onChange(m)}
              className={`relative px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
              }`}
              style={isActive ? { backgroundColor: accentColor } : {}}
            >
              <span className="block">{ACCURACY_MODE_LABELS[m]}</span>
              <span className={`block text-[10px] font-normal mt-0.5 ${
                isActive ? "text-white/80" : "text-slate-400 dark:text-slate-400"
              }`}>
                {ACCURACY_MODE_DESCRIPTIONS[m]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom mode toggle */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => onChange(isCustom ? "realistic" : "custom")}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
            isCustom
              ? "border-accent-300 dark:border-accent-600 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300"
              : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:text-slate-600"
          }`}
        >
          {CALCULATOR_UI_TEXT.customModeToggle}
        </button>
      </div>

      {/* Custom sliders */}
      {isCustom && onCustomModifiersChange && (
        <div className="mt-3 space-y-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          {CUSTOM_SLIDER_KEYS.map(({ key, label, min, max }) => {
            const val = customModifiers?.[key] ?? 1.0;
            const pct = Math.round((val - 1) * 100);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">+{pct}%</span>
                </div>
                <input
                  type="range"
                  min={min * 100}
                  max={max * 100}
                  step={1}
                  value={Math.round(val * 100)}
                  onChange={(e) => {
                    const newVal = parseInt(e.target.value) / 100;
                    onCustomModifiersChange({ ...customModifiers, [key]: newVal });
                  }}
                  className="range-slider w-full"
                  style={{ accentColor }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Таблица сравнения режимов ────────────────────────────────────────────────

const MODE_COLORS: Record<AccuracyMode, string> = {
  basic: "text-slate-600 dark:text-slate-400",
  realistic: "text-blue-600 dark:text-blue-400",
  professional: "text-orange-600 dark:text-orange-400",
  custom: "text-purple-600 dark:text-purple-400",
};

export function ComparisonTable({
  comparisonResults,
  currentMode,
}: {
  comparisonResults: Record<AccuracyMode, CalculatorResult>;
  currentMode: AccuracyMode;
}) {
  // Collect all materials from all modes, keyed by name
  const allNames: string[] = [];
  const seen = new Set<string>();
  for (const mode of ACCURACY_MODES) {
    for (const m of comparisonResults[mode].materials) {
      if (!seen.has(m.name)) {
        seen.add(m.name);
        allNames.push(m.name);
      }
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {CALCULATOR_UI_TEXT.comparisonTitle}
      </h4>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium text-xs">
                {CALCULATOR_UI_TEXT.material}
              </th>
              {ACCURACY_MODES.map((mode) => (
                <th
                  key={mode}
                  className={`text-right py-2 px-2 font-medium text-xs whitespace-nowrap ${
                    mode === currentMode ? "bg-slate-50 dark:bg-slate-800/50 rounded-t-lg" : ""
                  } ${MODE_COLORS[mode]}`}
                >
                  {ACCURACY_MODE_LABELS[mode]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allNames.map((name) => (
              <tr key={name} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-200 text-xs leading-snug max-w-[180px] break-words">
                  {name}
                </td>
                {ACCURACY_MODES.map((mode) => {
                  const mat = comparisonResults[mode].materials.find((m) => m.name === name);
                  if (!mat) return <td key={mode} className="text-right py-2 px-2 text-slate-300">—</td>;
                  const rawQty = mat.purchaseQty ?? mat.withReserve ?? mat.quantity;
                  const useGrams = mat.unit === "кг" && rawQty > 0 && rawQty < 1;
                  const [displayVal, displayUnit] = useGrams
                    ? formatWeightParts(rawQty)
                    : [formatMaterialQty(rawQty, mat.unit), mat.unit];
                  return (
                    <td
                      key={mode}
                      className={`text-right py-2 px-2 whitespace-nowrap ${
                        mode === currentMode ? "bg-slate-50 dark:bg-slate-800/50 font-semibold" : ""
                      }`}
                    >
                      <span className="text-slate-900 dark:text-slate-100">{displayVal}</span>{" "}
                      <span className="text-slate-400 dark:text-slate-400 text-xs">{displayUnit}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 dark:border-slate-700">
              <td className="py-2 pr-3 text-xs text-slate-400 dark:text-slate-400 font-medium">
                {CALCULATOR_UI_TEXT.scenarioLabels.buy} (REC)
              </td>
              {ACCURACY_MODES.map((mode) => {
                const rec = comparisonResults[mode].scenarios?.REC;
                return (
                  <td
                    key={mode}
                    className={`text-right py-2 px-2 font-semibold ${
                      mode === currentMode ? "bg-slate-50 dark:bg-slate-800/50" : ""
                    } ${MODE_COLORS[mode]}`}
                  >
                    {rec ? formatNumber(rec.purchase_quantity) : "—"}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-400">
        {CALCULATOR_UI_TEXT.comparisonNote}
      </p>
    </div>
  );
}


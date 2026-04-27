"use client";

import { useState, useRef, useEffect } from "react";
import type { CalculatorResult, CalculatorField, CalculatorDefinition } from "@/lib/calculators/types";
import { formatNumber, type HistoryEntry } from "./useCalculator";
import { HIDDEN_TOTALS, TOTAL_LABELS, TOTAL_UNITS, INTEGER_TOTAL_KEYS, WEIGHT_KG_TOTAL_KEYS, TOTAL_LABEL_FORMS } from "./totalsDisplay";
import { CALCULATOR_UI_TEXT } from "./uiText";
import { pluralizeRu, pluralizePackageUnit, PACKAGE_UNIT_FORMS, displayUnit } from "@/lib/format/pluralize";
import { formatWeightParts } from "@/lib/format/weight";
import { getPrices, setPrice, resetScope, PRICE_SCOPES } from "@/lib/userPrices";
import {
  ACCURACY_MODES,
  ACCURACY_MODE_LABELS,
  ACCURACY_MODE_DESCRIPTIONS,
  type AccuracyMode,
  type AccuracyModifiers,
} from "../../../engine/accuracy";

// ── Округление материалов по единицам ────────────────────────────────────────

/** Единицы, для которых количество всегда целое число */
const INTEGER_UNITS = new Set(["шт", "мешков", "рулонов", "листов", "упаковок", "канистр", "уп", "упак.", "рулон", "ведро", "баллон", "вёдер", "банок", "туб", "г"]);

function formatMaterialQty(value: number, unit: string): string {
  if (value === undefined || value === null || isNaN(value)) return "—";
  // Целые единицы (штуки, мешки, рулоны) — всегда округляем вверх
  if (INTEGER_UNITS.has(unit)) {
    return Math.ceil(value).toLocaleString("ru-RU");
  }
  // Весовые/объёмные — до 1 знака
  if (Number.isInteger(value)) return value.toLocaleString("ru-RU");
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

// ── Русские названия для key_factors ─────────────────────────────────────────

const KEY_FACTOR_LABELS: Record<string, string> = {
  // Core scenario factors (from engine/factors.ts)
  surface_quality: "Качество основания",
  geometry_complexity: "Сложность геометрии",
  installation_method: "Способ монтажа",
  worker_skill: "Уровень мастера",
  waste_factor: "Отходы",
  logistics_buffer: "Запас на доставку",
  packaging_rounding: "Округление упаковки",
  // Other possible factors
  base_consumption: "Базовый расход",
  area_factor: "Площадь",
  volume_factor: "Объём",
  layer_factor: "Слои",
  thickness_factor: "Толщина",
  coverage_rate: "Норма покрытия",
  material_density: "Плотность материала",
  joint_factor: "Фактор швов",
  overlap_factor: "Нахлёст",
  cutting_factor: "Подрезка",
  reserve_factor: "Запас",
  packaging_factor: "Упаковка",
  round_up: "Округление",
};

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

// ── Компонент экспертных советов ─────────────────────────────────────────────

export function ExpertTips({ tips }: { tips: NonNullable<CalculatorDefinition["expertTips"]> }) {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <span>👷‍♂️</span> {CALCULATOR_UI_TEXT.expertTips}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((tip, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{tip.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip.content}</p>
            {tip.author && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center text-[10px]">🏗️</div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-400">{tip.author}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Компонент FAQ ────────────────────────────────────────────────────────────

export function CalculatorFAQ({ faq }: { faq: NonNullable<CalculatorDefinition["faq"]> }) {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{CALCULATOR_UI_TEXT.faqTitle}</h2>
      <div className="space-y-3">
        {faq.map((item, i) => (
          <details key={i} className="group bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors list-none">
              <span>{item.question}</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-700">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// ── Компонент поля ввода ─────────────────────────────────────────────────────

// ── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-accent-100 hover:text-accent-700 dark:hover:bg-accent-900/30 dark:hover:text-accent-400 transition-colors"
        aria-label="Подсказка"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700" />
        </div>
      )}
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {hint && <Tooltip text={hint} />}
    </span>
  );
}

// ── Переключатель Новичок / Профи ───────────────────────────────────────────

export function ExperienceModeToggle({
  mode,
  onChange,
}: {
  mode: "beginner" | "pro";
  onChange: (mode: "beginner" | "pro") => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      <button
        onClick={() => onChange("beginner")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === "beginner"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        Новичок
      </button>
      <button
        onClick={() => onChange("pro")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === "pro"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        Профи
      </button>
    </div>
  );
}

export function FieldInput({
  field, value, onChange, accentColor,
}: {
  field: CalculatorField;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}) {
  if (field.type === "select" || field.type === "radio") {
    const isRadio = field.type === "radio";
    return (
      <div>
        <label className="input-label"><FieldLabel label={field.label} hint={field.hint} /></label>
        {isRadio ? (
          <div className="flex gap-2 flex-wrap">
            {field.options?.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] ${
                  value === opt.value
                    ? "border-transparent text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                }`}
                style={value === opt.value ? { backgroundColor: accentColor } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="input-field"
            aria-label={field.label}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel label={field.label} hint={field.hint} /></label>
        </div>
        <button
          onClick={() => onChange(value > 0 ? 0 : 1)}
          role="switch"
          aria-checked={value > 0}
          aria-label={field.label}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            value > 0 ? "" : "bg-slate-200 dark:bg-slate-700"
          }`}
          style={value > 0 ? { backgroundColor: accentColor } : {}}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-slate-100 rounded-full shadow-sm transition-transform ${value > 0 ? "translate-x-5" : ""}`} />
        </button>
      </div>
    );
  }

  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const isOutOfRange = value < min || value > max;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="input-label mb-0"><FieldLabel label={field.label} hint={field.hint} /></label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            className={`w-20 text-right text-sm font-semibold border bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-2 transition-colors ${
              isOutOfRange
                ? "text-red-600 border-red-300 focus:ring-red-500/30 focus:border-red-500"
                : "text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-accent-500/30 focus:border-accent-500"
            }`}
            aria-invalid={isOutOfRange}
            aria-label={field.label}
          />
          {field.unit && <span className="text-xs text-slate-400 dark:text-slate-400 w-8 shrink-0">{field.unit}</span>}
        </div>
      </div>
      {field.type === "slider" && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="range-slider"
          aria-label={field.label}
          style={{ accentColor }}
        />
      )}
      {isOutOfRange && (
        <p className="mt-1 text-xs text-red-500">
          {CALCULATOR_UI_TEXT.allowedValues(min, max, field.unit)}
        </p>
      )}
      {/* hint shown via tooltip icon next to label */}
    </div>
  );
}

// ── Список материалов ────────────────────────────────────────────────────────

/** Pluralize a material unit by quantity */
function pluralizeUnit(qty: number, unit: string): string {
  const forms = PACKAGE_UNIT_FORMS[unit];
  return forms ? pluralizeRu(Math.ceil(qty), forms) : unit;
}

export function MaterialList({ materials }: { materials: CalculatorResult["materials"] }) {
  const groups: Record<string, typeof materials> = {};
  for (const m of materials) {
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName}>
          <p className="text-xs text-slate-400 dark:text-slate-400 font-medium uppercase tracking-wider mb-2">{groupName}</p>
          <div className="space-y-2">
            {items.map((m, i) => {
              const rawQty = m.purchaseQty ?? m.withReserve ?? m.quantity;
              const useGrams = m.unit === "кг" && rawQty > 0 && rawQty < 1;
              const [displayVal, displayUnit] = useGrams
                ? formatWeightParts(rawQty)
                : [formatMaterialQty(rawQty, m.unit), pluralizeUnit(rawQty, m.unit)];
              // "без запаса" line
              const reserveQty = m.quantity;
              const reserveUnit = useGrams ? formatWeightParts(reserveQty)[1] : pluralizeUnit(reserveQty, m.unit);
              const reserveVal = useGrams ? formatWeightParts(reserveQty)[0] : formatMaterialQty(reserveQty, m.unit);
              return (
                <div key={i} className="flex items-start justify-between gap-2 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 leading-snug min-w-0 break-words">{m.name}</span>
                  <div className="text-right shrink-0 max-w-[50%]">
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {displayVal}{" "}
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{displayUnit}</span>
                    </div>
                    {m.packageInfo && (
                      <div className="text-xs text-slate-400 dark:text-slate-400">
                        {m.packageInfo.count} {pluralizePackageUnit(m.packageInfo.count, m.packageInfo.packageUnit)} × {m.packageInfo.size} {m.unit}
                      </div>
                    )}
                    {!m.packageInfo && m.withReserve != null && m.withReserve !== m.quantity && (
                      <div className="text-xs text-slate-400 dark:text-slate-400">
                        {CALCULATOR_UI_TEXT.withoutReserve}: {reserveVal} {reserveUnit}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Итоговое значение ────────────────────────────────────────────────────────

export function TotalItem({ name, value }: { name: string; value: number }) {
  if (HIDDEN_TOTALS.has(name)) return null;

  const isInteger = INTEGER_TOTAL_KEYS.has(name);
  const isWeightKg = WEIGHT_KG_TOTAL_KEYS.has(name);

  // For countable items: ceil the value
  const displayValue = isInteger ? Math.ceil(value) : value;

  // Determine label — pluralize if forms exist, otherwise static label
  const labelForms = TOTAL_LABEL_FORMS[name];
  const label = labelForms ? pluralizeRu(displayValue, labelForms) : (TOTAL_LABELS[name] ?? name);

  // Determine unit — for weight keys < 1 kg, convert to grams
  let unit = TOTAL_UNITS[name] ?? "";
  let formattedValue: string;

  if (isWeightKg && value > 0 && value < 1) {
    const [wVal, wUnit] = formatWeightParts(value);
    formattedValue = wVal;
    unit = wUnit;
  } else {
    formattedValue = formatNumber(displayValue);
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
      <p className="text-xs text-slate-400 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {formattedValue}
        {unit && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}


// ── Блок итогов (адаптивный) ─────────────────────────────────────────────────

function TotalsBlock({ totals }: { totals: CalculatorResult["totals"] }) {
  const visibleEntries = Object.entries(totals).filter(([key]) => key in TOTAL_LABELS && !HIDDEN_TOTALS.has(key));

  if (visibleEntries.length === 0) return null;

  // 1-2 значения — компактная строка без карточки
  if (visibleEntries.length <= 2) {
    return (
      <div className="flex items-center gap-4 flex-wrap text-sm text-slate-600 dark:text-slate-300">
        {visibleEntries.map(([key, val]) => (
          <TotalInline key={key} name={key} value={val} />
        ))}
      </div>
    );
  }

  // 3+ значений — карточка с сеткой
  return (
    <div className="card p-5">
      <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {CALCULATOR_UI_TEXT.total}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {visibleEntries.map(([key, val]) => (
          <TotalItem key={key} name={key} value={val} />
        ))}
      </div>
    </div>
  );
}

function TotalInline({ name, value }: { name: string; value: number }) {
  if (HIDDEN_TOTALS.has(name)) return null;

  const isInteger = INTEGER_TOTAL_KEYS.has(name);
  const isWeightKg = WEIGHT_KG_TOTAL_KEYS.has(name);
  const displayValue = isInteger ? Math.ceil(value) : value;
  const labelForms = TOTAL_LABEL_FORMS[name];
  const label = labelForms ? pluralizeRu(displayValue, labelForms) : (TOTAL_LABELS[name] ?? name);
  let unit = TOTAL_UNITS[name] ?? "";
  let formattedValue: string;

  if (isWeightKg && value > 0 && value < 1) {
    const [wVal, wUnit] = formatWeightParts(value);
    formattedValue = wVal;
    unit = wUnit;
  } else {
    formattedValue = formatNumber(displayValue);
  }

  return (
    <span>
      {label}: <span className="font-semibold text-slate-900 dark:text-slate-100">{formattedValue}</span>
      {unit && <span className="text-slate-400 dark:text-slate-400 ml-0.5 text-xs">{unit}</span>}
    </span>
  );
}

// ── {CALCULATOR_UI_TEXT.scenariosTitle} ───────────────────────────────────────────────────

function ScenarioBlock({ result }: { result: CalculatorResult }) {
  if (!result.scenarios) return null;

  const rec = result.scenarios.REC;
  const min = result.scenarios.MIN;
  const max = result.scenarios.MAX;
  if (!rec) return null;

  // Get unit from buy_plan or primary material, translate to Russian
  const rawUnit = rec.buy_plan?.unit ?? result.materials[0]?.unit ?? "";
  const translatedUnit = displayUnit(rawUnit);
  const recUnit = pluralizeUnit(rec.purchase_quantity, translatedUnit) || translatedUnit;
  const minUnit = min ? (pluralizeUnit(min.purchase_quantity, translatedUnit) || translatedUnit) : translatedUnit;
  const maxUnit = max ? (pluralizeUnit(max.purchase_quantity, translatedUnit) || translatedUnit) : translatedUnit;

  return (
    <div className="card p-5">
      <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {CALCULATOR_UI_TEXT.scenariosTitle}
      </h4>

      {/* Рекомендуемый — крупно */}
      <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/40 rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-accent-700 dark:text-accent-400 mb-1">{CALCULATOR_UI_TEXT.scenarioLabels.recommended}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatNumber(rec.purchase_quantity)}{" "}
              <span className="text-base font-normal text-slate-500 dark:text-slate-400">{recUnit}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {CALCULATOR_UI_TEXT.scenarioLabels.need}: {formatNumber(rec.exact_need)} {translatedUnit}
            </p>
            {rec.leftover > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-400">
                {CALCULATOR_UI_TEXT.scenarioLabels.leftover}: {formatNumber(rec.leftover)} {translatedUnit}
              </p>
            )}
            {rec.buy_plan && rec.buy_plan.packages_count > 0 && (() => {
              const bpUnit = rec.buy_plan.unit;
              // If buy_plan.unit is a raw unit (kg, l, m), show "N шт × size unit"
              // If buy_plan.unit is a package type (мешков, канистр), pluralize it
              const isRawUnit = !!({ kg: 1, g: 1, l: 1, m: 1, m2: 1 } as Record<string, number>)[bpUnit];
              const countLabel = isRawUnit
                ? pluralizeRu(rec.buy_plan.packages_count, ["шт.", "шт.", "шт."])
                : pluralizePackageUnit(rec.buy_plan.packages_count, bpUnit);
              const sizeLabel = isRawUnit ? displayUnit(bpUnit) : "";
              return (
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                  {rec.buy_plan.packages_count} {countLabel} × {rec.buy_plan.package_size}{sizeLabel ? ` ${sizeLabel}` : ""}
                </p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Диапазон MIN — MAX, компактно */}
      {min && max && (
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 dark:bg-green-500 shrink-0" />
            <span>{CALCULATOR_UI_TEXT.scenarioLabels.minimum}: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatNumber(min.purchase_quantity)}</span> {minUnit}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500 shrink-0" />
            <span>{CALCULATOR_UI_TEXT.scenarioLabels.maximum}: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatNumber(max.purchase_quantity)}</span> {maxUnit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Обратная связь по реальному расходу ──────────────────────────────────────

export function FeedbackPanel({
  calculatorSlug,
  primaryMaterial,
  accuracyMode,
}: {
  calculatorSlug: string;
  primaryMaterial?: { name: string; purchaseQty?: number; unit: string };
  accuracyMode?: AccuracyMode;
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isReturningUser] = useState(() => {
    try {
      const key = `masterok-calc-visited-${calculatorSlug}`;
      const visited = localStorage.getItem(key);
      if (visited) return true;
      localStorage.setItem(key, Date.now().toString());
      return false;
    } catch {
      return false;
    }
  });

  if (!primaryMaterial || submitted) {
    if (submitted) {
      return (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/60 rounded-xl px-4 py-3 text-xs text-green-700 dark:text-green-300">
          {CALCULATOR_UI_TEXT.feedbackThanks}
        </div>
      );
    }
    return null;
  }

  // Don't show to first-time visitors
  if (!isReturningUser) return null;

  const handleSubmit = () => {
    if (!value.trim()) return;
    // Store feedback in localStorage for now (can be sent to backend later)
    try {
      const key = "masterok-feedback";
      const prev = JSON.parse(localStorage.getItem(key) ?? "[]");
      prev.push({
        calculator: calculatorSlug,
        material: primaryMaterial.name,
        calculated: primaryMaterial.purchaseQty,
        actual: parseFloat(value),
        unit: primaryMaterial.unit,
        mode: accuracyMode,
        ts: Date.now(),
      });
      // Keep last 50 entries
      localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
    } catch {}
    setSubmitted(true);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
        {CALCULATOR_UI_TEXT.feedbackTitle}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-400 shrink-0 max-w-[120px] truncate">
          {primaryMaterial.name}:
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={CALCULATOR_UI_TEXT.feedbackPlaceholder}
          className="flex-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 min-h-[36px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
        <span className="text-xs text-slate-400 dark:text-slate-400">{primaryMaterial.unit}</span>
        <button
          onClick={handleSubmit}
          className="text-xs px-3 py-1.5 rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors shrink-0"
        >
          {CALCULATOR_UI_TEXT.feedbackSubmit}
        </button>
      </div>
    </div>
  );
}

// ── Панель истории ───────────────────────────────────────────────────────────

export function HistoryPanel({
  calcHistory,
  onRestore,
}: {
  calcHistory: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-1 border border-slate-200 dark:border-slate-700">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
        {CALCULATOR_UI_TEXT.pastCalculations}
      </p>
      {calcHistory.map((entry) => (
        <button
          key={entry.ts}
          onClick={() => onRestore(entry)}
          className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
            {new Date(entry.ts).toLocaleString("ru-RU", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
            {entry.calcTitle}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-400 truncate">
            {entry.result.materials.slice(0, 2).map(
              (m) => `${formatNumber(m.purchaseQty ?? m.withReserve ?? m.quantity)} ${m.unit}`
            ).join(", ")}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Вспомогательная функция: скопировать список материалов ───────────────────

async function copyMaterialsAsText(materials: CalculatorResult["materials"]): Promise<boolean> {
  const lines = materials.map((m) => {
    const qty = m.purchaseQty ?? m.withReserve ?? m.quantity;
    const useGrams = m.unit === "кг" && qty > 0 && qty < 1;
    const [val, unit] = useGrams ? formatWeightParts(qty) : [formatNumber(qty), m.unit];
    const pkgSuffix = m.packageInfo
      ? ` (${m.packageInfo.count} ${pluralizePackageUnit(m.packageInfo.count, m.packageInfo.packageUnit)} × ${m.packageInfo.size} ${m.unit})`
      : "";
    return `• ${m.name}: ${val} ${unit}${pkgSuffix}`;
  });
  const text = `${CALCULATOR_UI_TEXT.copyMaterialsHeading}\n\n${lines.join("\n")}`;
  const { copyText } = await import("@/lib/clipboard");
  return copyText(text);
}

// ── Практические советы прораба ──────────────────────────────────────────────

function PracticalNotes({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">💡</span>
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Совет прораба</span>
      </div>
      {notes.map((note, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
          <span className="shrink-0 mt-0.5">•</span>
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}

// ── Блок результата (warnings + materials + totals + share) ──────────────────

// ── Оценка стоимости ──────────────────────────────────────────────────────

function PriceEstimate({ materials, scope }: { materials: CalculatorResult["materials"]; scope: string }) {
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    setPrices(getPrices(scope));
  }, [scope]);

  // Берём то же количество, что отображается в MaterialList (с запасом/упаковкой),
  // чтобы итог в оценке совпадал с цифрой у пользователя на виду.
  const qtyFor = (m: CalculatorResult["materials"][number]) =>
    m.purchaseQty ?? m.withReserve ?? m.quantity;

  const total = materials.reduce((sum, m) => {
    const price = prices[m.name] ?? 0;
    return sum + qtyFor(m) * price;
  }, 0);

  const handlePriceChange = (name: string, value: number) => {
    setPrice(scope, name, value);
    setPrices((prev) => {
      const next = { ...prev };
      if (value > 0) next[name] = value;
      else delete next[name];
      return next;
    });
  };

  const handleResetAll = () => {
    resetScope(scope);
    setPrices({});
  };

  const filledCount = Object.values(prices).filter((v) => v > 0).length;

  return (
    <details className="mt-3 group" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-accent-700 transition-colors py-2">
        <span>💰 Оценка стоимости</span>
        {total > 0 && (
          <span className="ml-auto text-accent-700 dark:text-accent-400 font-bold">
            {total.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
          </span>
        )}
        {total === 0 && filledCount === 0 && (
          <span className="ml-auto text-xs text-slate-400">введите цены</span>
        )}
        <span className="group-open:rotate-180 transition-transform text-slate-400">▼</span>
      </summary>

      <div className="mt-2 space-y-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400 dark:text-slate-400">
            Введите цену за единицу — итог обновится автоматически
          </p>
          {filledCount > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
              title="Сбросить все введённые цены"
            >
              Сбросить
            </button>
          )}
        </div>
        {materials.map((m) => {
          const qty = qtyFor(m);
          const price = prices[m.name] ?? 0;
          const lineTotal = qty * price;
          const hasCustom = price > 0;
          return (
            <div key={m.name} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-slate-600 dark:text-slate-300 truncate text-xs flex items-center gap-1.5">
                {hasCustom && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-accent-500 shrink-0"
                    title="Кастомная цена"
                    aria-label="Кастомная цена"
                  />
                )}
                <span className="truncate">{m.name}</span>
                <span className="text-[10px] text-slate-400 shrink-0">× {qty}</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={price || ""}
                placeholder="₽"
                onChange={(e) => handlePriceChange(m.name, Number(e.target.value) || 0)}
                className={`w-20 text-right text-xs border rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent-500/30 ${
                  hasCustom
                    ? "border-accent-300 dark:border-accent-600 bg-accent-50/50 dark:bg-accent-900/10"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                }`}
              />
              <span className="text-xs text-slate-400 w-16 text-right tabular-nums">
                {lineTotal > 0 ? `${lineTotal.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽` : "—"}
              </span>
            </div>
          );
        })}
        {total > 0 && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold">
            <span className="text-slate-700 dark:text-slate-200">Итого</span>
            <span className="text-accent-700 dark:text-accent-400">
              {total.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
            </span>
          </div>
        )}
      </div>
    </details>
  );
}

function isResultEmpty(result: CalculatorResult): boolean {
  return result.materials.length === 0 ||
    result.materials.every((m) => !m.quantity || isNaN(m.quantity) || m.quantity === 0);
}

export function ResultBlock({
  result,
  shareState,
  onShare,
  calculatorSlug,
}: {
  result: CalculatorResult;
  shareState: "idle" | "copied";
  onShare: () => void;
  calculatorSlug?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const priceScope = calculatorSlug ? `materials:${calculatorSlug}` : PRICE_SCOPES.materials;

  const handleCopyMaterials = async () => {
    const ok = await copyMaterialsAsText(result.materials);
    setCopyState(ok ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), 2500);
  };

  if (isResultEmpty(result)) {
    return (
      <div className="card p-6 text-center space-y-3">
        <div className="text-3xl">📐</div>
        <p className="text-slate-700 dark:text-slate-200 font-medium">Недостаточно данных для расчёта</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Проверьте, что размеры помещения и параметры материалов заполнены корректно (больше нуля).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 slide-up">
      {result.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1 dark:bg-amber-950/30 dark:border-amber-900/60">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
              <span className="shrink-0">⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Режим точности — компактная расшифровка */}
      {result.accuracyExplanation && result.accuracyExplanation.appliedModifiers.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {result.accuracyExplanation.modeLabel}
            </span>
            {result.accuracyExplanation.combinedMultiplier !== 1 && (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                &times;{result.accuracyExplanation.combinedMultiplier.toFixed(2)}
              </span>
            )}
            <span>{CALCULATOR_UI_TEXT.howCalculated}</span>
            <span className="group-open:rotate-180 transition-transform ml-auto">▼</span>
          </summary>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mt-1 space-y-2 border border-slate-200 dark:border-slate-700">
            {/* Поправки — компактной строкой */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {result.accuracyExplanation.appliedModifiers.map((mod, i) => (
                <span key={i} className="text-[11px] text-slate-500 dark:text-slate-400">
                  {mod.label} <span className="font-semibold text-slate-700 dark:text-slate-200">+{Math.round((mod.value - 1) * 100)}%</span>
                </span>
              ))}
            </div>

            {/* Факторы расчёта — если есть */}
            {result.scenarios?.REC?.key_factors && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                {Object.entries(result.scenarios.REC.key_factors)
                  .filter(([k]) => k !== "field_multiplier" && k !== "accuracy_multiplier")
                  .map(([key, value]) => (
                    <span key={key} className="text-[11px] text-slate-400 dark:text-slate-400">
                      {KEY_FACTOR_LABELS[key] ?? key}: <span className="font-mono">{(value as number).toFixed(2)}</span>
                    </span>
                  ))
                }
              </div>
            )}
          </div>
        </details>
      )}

      {/* Карточка результатов */}
      <div className="result-card">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">{CALCULATOR_UI_TEXT.materialsListTitle}</h3>

        <MaterialList materials={result.materials} />

        {/* Оценка стоимости — пользователь вводит свои цены */}
        <PriceEstimate materials={result.materials} scope={priceScope} />

        {/* Кнопки действий — компактная полоса под материалами */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700" data-print-hide>
          <button
            onClick={handleCopyMaterials}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title={CALCULATOR_UI_TEXT.copyForMessengerTitle}
          >
            {copyState === "copied" ? "✓" : copyState === "failed" ? "✕" : "📋"}{" "}
            {copyState === "copied"
              ? CALCULATOR_UI_TEXT.copied
              : copyState === "failed"
              ? "Ошибка"
              : CALCULATOR_UI_TEXT.copy}
          </button>
          <span className="text-slate-200 dark:text-slate-700">|</span>
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title={CALCULATOR_UI_TEXT.shareLinkTitle}
          >
            {shareState === "copied" ? "✓" : "🔗"} {shareState === "copied" ? CALCULATOR_UI_TEXT.copied : CALCULATOR_UI_TEXT.share}
          </button>
          <span className="text-slate-200 dark:text-slate-700">|</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title={CALCULATOR_UI_TEXT.printTitle}
          >
            🖨 {CALCULATOR_UI_TEXT.print}
          </button>
        </div>
      </div>

      {/* Сколько покупать */}
      {result.scenarios && (<ScenarioBlock result={result} />)}

      {/* Итого — компактный, скрывается если пусто */}
      <TotalsBlock totals={result.totals} />

      {/* Советы прораба — после итогов */}
      {result.practicalNotes && result.practicalNotes.length > 0 && (
        <PracticalNotes notes={result.practicalNotes} />
      )}
    </div>
  );
}

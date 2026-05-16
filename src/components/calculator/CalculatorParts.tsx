"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { CalculatorResult, CalculatorField, CalculatorDefinition } from "@/lib/calculators/types";
import { formatNumber, type HistoryEntry } from "./useCalculator";
import { HIDDEN_TOTALS, TOTAL_LABELS, TOTAL_UNITS, INTEGER_TOTAL_KEYS, WEIGHT_KG_TOTAL_KEYS, TOTAL_LABEL_FORMS } from "./totalsDisplay";
import { CALCULATOR_UI_TEXT } from "./uiText";
import { pluralizeRu, pluralizePackageUnit, PACKAGE_UNIT_FORMS, displayUnit } from "@/lib/format/pluralize";
import { formatWeightParts } from "@/lib/format/weight";
import { getPrices, setPrice, resetScope, PRICE_SCOPES } from "@/lib/userPrices";
import { addFeedback } from "@/lib/storage/feedback";
import {
  getMaterialPriceBasis,
  getMaterialPriceTotal,
  getMaterialStoredPrice,
  getRelevantPriceCount,
  type MaterialPriceMap,
} from "@/lib/pricing/materialPriceBasis";
import {
  ACCURACY_MODES,
  ACCURACY_MODE_LABELS,
  ACCURACY_MODE_DESCRIPTIONS,
  type AccuracyMode,
  type AccuracyModifiers,
} from "../../../engine/accuracy";
import SaveToProjectButton from "./SaveToProjectButton";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// ── Округление материалов по единицам ────────────────────────────────────────

/** Единицы, для которых количество всегда целое число */
const INTEGER_UNITS = new Set(["шт", "мешков", "рулонов", "листов", "упаковок", "канистр", "уп", "упак.", "рулон", "ведро", "баллон", "вёдер", "банок", "туб", "г"]);

/**
 * Дискретные единицы (штучные товары и тары). Для них:
 *  - количество всегда целое — невозможны «0.5 рулона» или «1.4 мешка»;
 *  - не показываем подпись «без запаса / расход» — она бессмысленна
 *    (расход в штуках = округлённая покупка минус целое = 0).
 */
function isDiscreteUnit(unit: string): boolean {
  return INTEGER_UNITS.has(unit) && unit !== "г";
}

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

/** Подбор круглой цветной иконки и тона по названию категории */
function getCategoryVisual(name: string, fallbackIndex: number): { icon: string; tone: "accent" | "violet" | "emerald" | "amber" | "slate" } {
  const n = name.toLowerCase();
  // Подложка / подкладка — отдельно (до общего "покрытия", т.к. "под" может мэтчить лишнее)
  if (/подложк|подкладк|подбив/.test(n))
    return { icon: "📐", tone: "emerald" };
  // Плинтус / пороги / окантовка
  if (/плинтус|порож|порог|окантов|молдинг/.test(n))
    return { icon: "📏", tone: "amber" };
  // Монтаж / установка / клинья
  if (/монтаж|установк|клинь|распорн/.test(n))
    return { icon: "🔨", tone: "amber" };
  // Покрытия и финиш
  if (/покрыт|напольн|кровл|облиц|плитк|ламин|паркет|линол|обои|штукатур|крас|шпакл/.test(n))
    return { icon: "📦", tone: "violet" };
  // Каркас / профили / стропила
  if (/каркас|профил|стойк|обреш|балк|стропил|лаг|косоур|тетив/.test(n))
    return { icon: "🏗", tone: "violet" };
  // Крепёж
  if (/креп|саморе|шуруп|дюбел|гвозд|анкер|термошайб|болт|шайб|гайк/.test(n))
    return { icon: "🪛", tone: "violet" };
  // Двери / окна / форточки / фурнитура
  if (/двер|форточ|окн|петл|шпингал|фурнитур|ручк|замок/.test(n))
    return { icon: "🚪", tone: "violet" };
  // Уплотнение / герметизация
  if (/уплотн|герметик|пен|скотч|лент(?!а арматур)/.test(n))
    return { icon: "🌀", tone: "violet" };
  // Изоляция и утепление
  if (/изол|утепл|мембран|пароизол|гидроизол|вата|пенопласт|пеноплэкс|эковат/.test(n))
    return { icon: "🛡", tone: "emerald" };
  // Грунтовка / подготовка основания
  if (/подгот|основан|выравн|стяжк|наливн|грунт/.test(n))
    return { icon: "🪣", tone: "emerald" };
  // Фундамент / бетон / арматура
  if (/фундамент|бетон|раствор|цемент|арматур|щеб|песок|брус|свай/.test(n))
    return { icon: "🧱", tone: "amber" };
  // Электрика
  if (/электр|кабел|провод|розетк|выключател|автомат|узо|светильник/.test(n))
    return { icon: "⚡", tone: "amber" };
  // Сантехника и трубы
  if (/труб|кран|сантехн|радиатор|стояк|вентил|канализ/.test(n))
    return { icon: "🔧", tone: "emerald" };
  // Основное (бэйдж по умолчанию для "Основное")
  if (/основн/.test(n))
    return { icon: "📦", tone: "accent" };
  // Fallback: ротация по индексу группы
  const tones = ["violet", "emerald", "amber", "accent"] as const;
  return { icon: "📦", tone: tones[fallbackIndex % tones.length] };
}

export function MaterialList({ materials }: { materials: CalculatorResult["materials"] }) {
  const groups: Record<string, typeof materials> = {};
  for (const m of materials) {
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }

  const toneClasses: Record<string, string> = {
    accent:  "bg-accent-100/80  text-accent-600  dark:bg-accent-900/30  dark:text-accent-300",
    violet:  "bg-violet-100/80  text-violet-600  dark:bg-violet-900/30  dark:text-violet-300",
    emerald: "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber:   "bg-amber-100/80   text-amber-600   dark:bg-amber-900/30   dark:text-amber-300",
    slate:   "bg-slate-100      text-slate-600   dark:bg-slate-800      dark:text-slate-200",
  };

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, items], groupIndex) => {
        const visual = getCategoryVisual(groupName, groupIndex);
        return (
        <div
          key={groupName}
          className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3 px-4 pt-3 pb-2 sm:px-5 sm:pt-4 sm:pb-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base sm:h-10 sm:w-10 sm:text-lg ${toneClasses[visual.tone]}`} aria-hidden>
              {visual.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{groupName}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {items.length} {pluralizeRu(items.length, ["позиция", "позиции", "позиций"])}
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 px-4 pb-2 sm:px-5 dark:divide-slate-800">
            {items.map((m, i) => {
              const rawQty = m.purchaseQty ?? m.withReserve ?? m.quantity;
              const useGrams = m.unit === "кг" && rawQty > 0 && rawQty < 1;
              const [displayVal, displayUnit] = useGrams
                ? formatWeightParts(rawQty)
                : [formatMaterialQty(rawQty, m.unit), pluralizeUnit(rawQty, m.unit)];
              // Подпись «расход материала» — точный физический расход без запаса.
              // Имеет смысл только для делимых материалов (л, кг, м², м³, м, м.п.).
              // Для штучных (шт, рулонов, мешков, ...) расход = округление вниз,
              // что обычно совпадает с покупкой — подпись не нужна.
              const reserveQty = m.quantity;
              const reserveUnit = useGrams ? formatWeightParts(reserveQty)[1] : pluralizeUnit(reserveQty, m.unit);
              const reserveVal = useGrams ? formatWeightParts(reserveQty)[0] : formatMaterialQty(reserveQty, m.unit);
              const isDiscrete = isDiscreteUnit(m.unit);
              const showConsumption = !isDiscrete
                && !m.packageInfo
                && m.withReserve != null
                && Math.abs(rawQty - reserveQty) > 0.005
                && `${displayVal} ${displayUnit}` !== `${reserveVal} ${reserveUnit}`;
              return (
                <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-3 py-3 transition-colors">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug min-w-0 break-words">{m.name}</span>
                  <div className="text-right shrink-0 max-w-[12rem]">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                      {CALCULATOR_UI_TEXT.toBuyPrefix}
                    </div>
                    <div className="text-lg font-bold tabular-nums text-slate-950 dark:text-slate-50">
                      {displayVal}{" "}
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{displayUnit}</span>
                    </div>
                    {m.packageInfo && (
                      <div className="text-xs text-slate-400 dark:text-slate-400">
                        {m.packageInfo.count} {pluralizePackageUnit(m.packageInfo.count, m.packageInfo.packageUnit)} × {m.packageInfo.size} {m.unit}
                        {/* Для дискретных единиц (шт, листов, рулонов) показываем
                            итоговое произведение — чтобы было однозначно понятно
                            «11 упак × 6 шт = 66 плит». Для непрерывных (кг, л, м²)
                            итог = withReserve, который уже выведен сверху. */}
                        {isDiscrete && (
                          <> = {m.packageInfo.count * m.packageInfo.size} {pluralizeUnit(m.packageInfo.count * m.packageInfo.size, m.unit)}</>
                        )}
                      </div>
                    )}
                    {showConsumption && (
                      <div className="text-xs text-slate-400 dark:text-slate-400">
                        {CALCULATOR_UI_TEXT.consumptionPrefix}: {reserveVal} {reserveUnit}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
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
  const visibleEntries = getVisibleTotals(totals);

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
              const isBulkRounding = (bpUnit === "м³" || bpUnit === "m3") && rec.buy_plan.package_size < 1;
              const isSinglePieceStep = (bpUnit === "шт" || bpUnit === "piece") && rec.buy_plan.package_size === 1;
              if (isSinglePieceStep) return null;
              if (isBulkRounding) {
                return (
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                    {CALCULATOR_UI_TEXT.scenarioLabels.rounding}: {formatNumber(rec.buy_plan.package_size)} {displayUnit(bpUnit)}
                  </p>
                );
              }
              // If buy_plan.unit is a raw unit (kg, l, m), show "N шт × size unit"
              // If buy_plan.unit is a package type (мешков, канистр), pluralize it
              const isRawUnit = !!({ kg: 1, g: 1, l: 1, m: 1, m2: 1, m3: 1, "м²": 1, "м³": 1 } as Record<string, number>)[bpUnit];
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
    void addFeedback({
      calculator: calculatorSlug,
      material: primaryMaterial.name,
      calculated: primaryMaterial.purchaseQty,
      actual: parseFloat(value),
      unit: primaryMaterial.unit,
      mode: accuracyMode,
    });
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

type MaterialPrices = MaterialPriceMap;

type WorkPriceBenchmark = {
  id: string;
  label: string;
  unit: string;
  min: number;
  avg: number;
  max: number;
  keywords: string[];
  source: string;
};

// Справочные рыночные ориентиры работ, Москва/крупные города, 2026.
// Источники: СметаЧек (smetacheck.ru), Ремо-нт (remo-nt.ru), Лето Ремонт (letoremont.ru).
// Не включаем их в итог автоматически: регион, объём, демонтаж и сложность могут менять цену в разы.
const WORK_PRICE_BENCHMARKS: WorkPriceBenchmark[] = [
  { id: "brickwork-m2", label: "Кладка кирпича / перегородки", unit: "м²", min: 800, avg: 2600, max: 3500, keywords: ["кирпич", "кладк", "кладочн"], source: "Profi.ru / Workerprice" },
  { id: "brickwork-m3", label: "Кладка стен из кирпича", unit: "м³", min: 5900, avg: 6500, max: 7000, keywords: ["кирпич", "кладк", "кладочн"], source: "Workerprice" },
  { id: "brickwork-facing", label: "Облицовочная кладка кирпича", unit: "м²", min: 2500, avg: 3000, max: 3800, keywords: ["облицов", "кирпич"], source: "Workerprice" },
  { id: "tile-floor", label: "Укладка плитки на пол", unit: "м²", min: 1250, avg: 2125, max: 3750, keywords: ["плитк", "кафель", "керамогранит", "затирк"], source: "СметаЧек" },
  { id: "tile-wall", label: "Укладка плитки на стены", unit: "м²", min: 1600, avg: 2720, max: 4800, keywords: ["плитк", "кафель", "керамогранит", "мозаик"], source: "СметаЧек" },
  { id: "tile-grout", label: "Затирка швов плитки", unit: "м²", min: 200, avg: 340, max: 600, keywords: ["затирк"], source: "СметаЧек" },
  { id: "plaster", label: "Штукатурка стен по маякам", unit: "м²", min: 500, avg: 850, max: 1500, keywords: ["штукатур", "маяк", "ротбанд"], source: "СметаЧек" },
  { id: "decor-plaster", label: "Декоративная штукатурка", unit: "м²", min: 800, avg: 1360, max: 2400, keywords: ["декоратив", "штукатур"], source: "СметаЧек" },
  { id: "paint", label: "Покраска стен", unit: "м²", min: 250, avg: 425, max: 750, keywords: ["краск", "покраск", "окраск"], source: "СметаЧек" },
  { id: "wallpaper", label: "Поклейка обоев", unit: "м²", min: 290, avg: 300, max: 750, keywords: ["обо", "клей для обоев"], source: "Ремо-нт / Лето Ремонт" },
  { id: "laminate", label: "Укладка ламината", unit: "м²", min: 400, avg: 680, max: 1200, keywords: ["ламинат", "подложк", "плинтус"], source: "СметаЧек" },
  { id: "linoleum", label: "Укладка линолеума", unit: "м²", min: 330, avg: 561, max: 990, keywords: ["линолеум"], source: "СметаЧек" },
  { id: "parquet", label: "Укладка паркетной доски", unit: "м²", min: 750, avg: 1275, max: 2250, keywords: ["паркет"], source: "СметаЧек" },
  { id: "screed", label: "Стяжка пола", unit: "м²", min: 600, avg: 1020, max: 1800, keywords: ["стяжк", "цпс", "смесь", "наливн"], source: "СметаЧек" },
  { id: "self-leveling", label: "Устройство наливного пола", unit: "м²", min: 500, avg: 850, max: 1500, keywords: ["наливн"], source: "СметаЧек" },
  { id: "drywall", label: "Монтаж гипсокартона", unit: "м²", min: 590, avg: 850, max: 1350, keywords: ["гипсокартон", "гкл", "профил", "серпянк"], source: "Ремо-нт / СметаЧек" },
  { id: "waterproofing", label: "Гидроизоляционные работы", unit: "м²", min: 350, avg: 595, max: 1050, keywords: ["гидроизоляц", "мастик"], source: "СметаЧек" },
  { id: "insulation", label: "Утепление стен минватой", unit: "м²", min: 600, avg: 1020, max: 1800, keywords: ["утепл", "минват", "пенопл", "пароизоляц"], source: "СметаЧек" },
  { id: "siding", label: "Монтаж сайдинга", unit: "м²", min: 570, avg: 969, max: 1710, keywords: ["сайдинг", "фасад"], source: "СметаЧек" },
  { id: "wall-panels", label: "Монтаж стеновых панелей", unit: "м²", min: 400, avg: 680, max: 1200, keywords: ["панел"], source: "СметаЧек" },
  { id: "stretch-ceiling", label: "Монтаж натяжного потолка", unit: "м²", min: 490, avg: 870, max: 1360, keywords: ["натяжн"], source: "Ремо-нт / Лето Ремонт" },
  { id: "suspended-ceiling", label: "Монтаж подвесного потолка", unit: "м²", min: 450, avg: 765, max: 1350, keywords: ["подвесн", "реечн", "кассет"], source: "СметаЧек" },
  { id: "paving", label: "Укладка тротуарной плитки", unit: "м²", min: 1650, avg: 2805, max: 4950, keywords: ["тротуар", "брусчат"], source: "СметаЧек" },
  { id: "electric-cable", label: "Прокладка кабеля", unit: "п.м.", min: 100, avg: 170, max: 300, keywords: ["кабель", "электр"], source: "СметаЧек" },
  { id: "electric-floor", label: "Монтаж электрического тёплого пола", unit: "м²", min: 600, avg: 1020, max: 1800, keywords: ["тёплый пол"], source: "СметаЧек" },
  { id: "water-floor", label: "Монтаж водяного тёплого пола", unit: "м²", min: 900, avg: 1530, max: 2700, keywords: ["водяной тёплый пол"], source: "СметаЧек" },
];

const WORK_PRICE_HINTS_BY_CALCULATOR: Record<string, string[]> = {
  kirpich: ["brickwork-m2", "brickwork-m3"],
  "kladka-kirpicha": ["brickwork-m2", "brickwork-m3"],
  "oblitsovochnyj-kirpich": ["brickwork-facing", "brickwork-m2"],
  plitka: ["tile-floor", "tile-wall", "tile-grout"],
  zatirka: ["tile-grout"],
  "klej-dlya-plitki": ["tile-floor", "tile-wall"],
  laminat: ["laminate"],
  parket: ["parquet"],
  linoleum: ["linoleum"],
  styazhka: ["screed"],
  "nalivnoy-pol": ["self-leveling", "screed"],
  "teplyy-pol": ["electric-floor"],
  "vodyanoy-teplyy-pol": ["water-floor", "screed"],
  gipsokarton: ["drywall"],
  "gipsokarton-potolok": ["drywall"],
  "podvesnoy-potolok-gkl": ["drywall", "suspended-ceiling"],
  shtukaturka: ["plaster"],
  "dekorativnaya-shtukaturka": ["decor-plaster", "plaster"],
  kraska: ["paint"],
  oboi: ["wallpaper"],
  shpaklevka: ["plaster"],
  "gidroizolyaciya-vlagozaschita": ["waterproofing"],
  "vannaya-komnata": ["tile-floor", "tile-wall", "tile-grout", "waterproofing"],
  uteplenie: ["insulation"],
  "uteplenie-fasada-minvatoj": ["insulation", "plaster"],
  sayding: ["siding", "insulation"],
  "paneli-dlya-sten": ["wall-panels"],
  "otdelka-balkona": ["wall-panels", "insulation"],
  "otdelka-mansardy": ["insulation", "drywall"],
  "natyazhnoj-potolok": ["stretch-ceiling"],
  "reechnyj-potolok": ["suspended-ceiling"],
  "kassetnyi-potolok": ["suspended-ceiling"],
  "uteplenie-potolka": ["insulation"],
  "trotuarnaya-plitka": ["paving"],
  elektrika: ["electric-cable"],
};

const qtyForMaterial = (m: CalculatorResult["materials"][number]) =>
  m.purchaseQty ?? m.withReserve ?? m.quantity;

function getVisibleTotals(totals: CalculatorResult["totals"]) {
  return Object.entries(totals).filter(([key, value]) =>
    key in TOTAL_LABELS
    && !HIDDEN_TOTALS.has(key)
    && Number.isFinite(value)
    && value !== 0
  );
}

function formatTotalMetric(key: string, value: number) {
  const isInteger = INTEGER_TOTAL_KEYS.has(key);
  const isWeightKg = WEIGHT_KG_TOTAL_KEYS.has(key);
  const displayValue = isInteger ? Math.ceil(value) : value;
  const labelForms = TOTAL_LABEL_FORMS[key];
  const label = labelForms ? pluralizeRu(displayValue, labelForms) : (TOTAL_LABELS[key] ?? key);
  let unit = TOTAL_UNITS[key] ?? "";
  let formattedValue: string;

  if (isWeightKg && value > 0 && value < 1) {
    const [wVal, wUnit] = formatWeightParts(value);
    formattedValue = wVal;
    unit = wUnit;
  } else {
    formattedValue = formatNumber(displayValue);
  }

  return { label, value: formattedValue, unit };
}

const FEATURED_TOTAL_PRIORITY = [
  "area", "totalArea", "realArea", "netArea", "wallArea", "floorArea", "roofArea", "facadeArea",
  "volume", "totalVolume", "totalVolumeM3", "length", "totalLinearM", "perimeter", "totalPerimeter",
];

function pickFeaturedTotal(totals: CalculatorResult["totals"]) {
  const visible = getVisibleTotals(totals);
  if (visible.length === 0) return null;

  for (const key of FEATURED_TOTAL_PRIORITY) {
    const found = visible.find(([totalKey]) => totalKey === key);
    if (found) return { key: found[0], rawValue: found[1], ...formatTotalMetric(found[0], found[1]) };
  }

  const [key, value] = visible[0];
  return { key, rawValue: value, ...formatTotalMetric(key, value) };
}

const SECONDARY_TOTAL_PRIORITY = [
  // Вес — самое полезное на стройке после площади/объёма
  "totalKg", "cementKg", "cpsTotalKg", "rebarWeightKg", "rebarTons", "ecoWoolKg",
  // Жидкости и расход
  "litersWithReserve", "litersNeeded", "totalL", "kgPerSqm", "lPerSqm",
  // Длины — если ключевой параметр был площадью
  "perimeter", "totalPerimeter", "totalLinearM", "ridgeLength", "totalPipe",
  // Объёмы — если ключевой параметр был площадью
  "totalVolume", "volume", "concreteM3", "mortarVolume",
  // Площади — если ключевой параметр был объёмом/длиной
  "totalArea", "area", "realArea", "wallArea", "floorArea", "roofArea",
  // Счётные итоги
  "totalSheets", "sheetsNeeded", "tilesNeeded", "blocksNeeded", "bricksNeeded",
  "packs", "rolls", "stepCount",
];

function pickSecondaryTotal(totals: CalculatorResult["totals"], excludeKey?: string) {
  const excludeUnit = excludeKey ? (TOTAL_UNITS[excludeKey] ?? "") : "";
  // Filter out: the primary key itself, AND any total with the same unit
  // (avoids "Площадь 50 м² + Площадь плиты 0.72 м²").
  const visible = getVisibleTotals(totals).filter(([k]) => {
    if (k === excludeKey) return false;
    if (excludeUnit && (TOTAL_UNITS[k] ?? "") === excludeUnit) return false;
    return true;
  });
  if (visible.length === 0) return null;

  for (const key of SECONDARY_TOTAL_PRIORITY) {
    const found = visible.find(([totalKey]) => totalKey === key);
    if (found) return { key: found[0], rawValue: found[1], ...formatTotalMetric(found[0], found[1]) };
  }

  const [key, value] = visible[0];
  return { key, rawValue: value, ...formatTotalMetric(key, value) };
}

function formatCurrency(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function parsePriceInput(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function pickWorkPriceBenchmarks(materials: CalculatorResult["materials"], calculatorSlug?: string) {
  if (calculatorSlug) {
    const allowedIds = WORK_PRICE_HINTS_BY_CALCULATOR[calculatorSlug];
    if (allowedIds) {
      return allowedIds
        .map((id) => WORK_PRICE_BENCHMARKS.find((item) => item.id === id))
        .filter((item): item is WorkPriceBenchmark => Boolean(item))
        .slice(0, 4);
    }
    return [];
  }

  const text = materials
    .map((m) => `${m.category ?? ""} ${m.name}`)
    .join(" ")
    .toLowerCase();

  const picked = WORK_PRICE_BENCHMARKS.filter((item) =>
    item.keywords.some((keyword) => text.includes(keyword))
  );

  return picked.slice(0, 4);
}

function WorkPriceHints({ materials, calculatorSlug }: { materials: CalculatorResult["materials"]; calculatorSlug?: string }) {
  const hints = pickWorkPriceBenchmarks(materials, calculatorSlug);

  if (hints.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">Ориентиры по работам</p>
          <p className="mt-0.5 text-slate-400 dark:text-slate-500">Средние ставки мастеров, 2026</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          справочно
        </span>
      </div>
      <div className="space-y-2">
        {hints.map((hint) => (
          <div key={hint.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium leading-snug text-slate-700 dark:text-slate-200">{hint.label}</span>
              <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-slate-50">
                ~{formatCurrency(hint.avg)} ₽/{hint.unit}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Диапазон {formatCurrency(hint.min)}–{formatCurrency(hint.max)} ₽/{hint.unit}, источник: {hint.source}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        Это не смета и не оферта: точная цена зависит от региона, объёма, демонтажа и сложности основания.
      </p>
    </div>
  );
}

function ResultMetricCard({
  icon,
  label,
  value,
  unit,
  hint,
  tone = "slate",
}: {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "accent" | "violet" | "emerald" | "slate" | "amber";
}) {
  const toneClasses = {
    accent:  "bg-accent-100/80  text-accent-600  dark:bg-accent-900/30  dark:text-accent-300",
    violet:  "bg-violet-100/80  text-violet-600  dark:bg-violet-900/30  dark:text-violet-300",
    emerald: "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber:   "bg-amber-100/80   text-amber-600   dark:bg-amber-900/30   dark:text-amber-300",
    slate:   "bg-slate-100      text-slate-600   dark:bg-slate-800      dark:text-slate-200",
  }[tone];

  return (
    <div className="rounded-2xl border border-[#E5EAF2] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl sm:h-14 sm:w-14 sm:text-2xl ${toneClasses}`} aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-0.5 text-2xl font-bold leading-tight tabular-nums text-slate-950 sm:text-[26px] dark:text-white">
            {value}
            {unit && <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
          </p>
          {hint && <p className="mt-1 truncate text-[11px] leading-snug text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/** Разбивка стоимости по категориям материалов */
function getCostByCategory(
  materials: CalculatorResult["materials"],
  prices: MaterialPrices
): { name: string; total: number }[] {
  const sums: Record<string, number> = {};
  for (const m of materials) {
    const basis = getMaterialPriceBasis(m);
    const price = getMaterialStoredPrice(prices, m, basis);
    if (price <= 0) continue;
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    sums[cat] = (sums[cat] ?? 0) + basis.quantity * price;
  }
  return Object.entries(sums)
    .filter(([, v]) => v > 0)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function PriceEstimate({
  materials,
  calculatorSlug,
  prices,
  total,
  filledCount,
  onPriceChange,
  onResetAll,
}: {
  materials: CalculatorResult["materials"];
  calculatorSlug?: string;
  prices: MaterialPrices;
  total: number;
  filledCount: number;
  onPriceChange: (key: string, value: number) => void;
  onResetAll: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const hasPrices = total > 0;
  const breakdown = useMemo(() => getCostByCategory(materials, prices), [materials, prices]);

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 dark:border-amber-900/60 dark:from-amber-950/30 dark:to-orange-950/20">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm dark:bg-slate-900" aria-hidden>💰</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Оценка стоимости проекта</p>
          <p className="text-2xl font-bold leading-tight tabular-nums text-slate-950 sm:text-[26px] dark:text-white">
            {hasPrices ? (
              <>{formatCurrency(total)} <span className="text-base font-semibold text-slate-500 dark:text-slate-400">₽</span></>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">— ₽</span>
            )}
          </p>
        </div>
      </div>

      {hasPrices && breakdown.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-amber-200/70 pt-3 text-sm dark:border-amber-900/40">
          {breakdown.map((b) => (
            <div key={b.name} className="flex items-center justify-between gap-3">
              <span className="truncate text-slate-600 dark:text-slate-300">{b.name}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {formatCurrency(b.total)} ₽
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-amber-200/70 pt-2.5 mt-2 dark:border-amber-900/40">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Итого (ориентировочно)</span>
            <span className="text-lg font-bold tabular-nums text-accent-600 dark:text-accent-400">
              {formatCurrency(total)} ₽
            </span>
          </div>
        </div>
      )}

      {!hasPrices && (
        <p className="mt-4 rounded-xl bg-white/70 px-3 py-2.5 text-xs leading-snug text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
          <span className="mr-1">💡</span>
          Итоговая стоимость может отличаться в зависимости от региона и поставщика. Введите цены, чтобы рассчитать общую стоимость материалов.
        </p>
      )}

      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
      >
        {editing ? "Свернуть форму цен" : hasPrices ? "Изменить цены вручную" : "Ввести цены вручную"}
        <span className={`transition-transform ${editing ? "rotate-180" : ""}`}>→</span>
      </button>

      {editing && (
        <div className="mt-4 space-y-2 rounded-xl border border-amber-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-xs leading-snug text-slate-400 dark:text-slate-400">
              Введите цену за покупаемую единицу: мешок, рулон, пруток, ведро, м³ или шт.
            </p>
            {filledCount > 0 && (
              <button
                type="button"
                onClick={onResetAll}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                title="Сбросить все введённые цены"
              >
                Сбросить
              </button>
            )}
          </div>
          {materials.map((m, index) => {
            const basis = getMaterialPriceBasis(m);
            const price = getMaterialStoredPrice(prices, m, basis);
            const lineTotal = basis.quantity * price;
            const hasCustom = price > 0;
            return (
              <div key={`${m.category ?? "default"}-${m.name}-${index}`} className="grid gap-2 rounded-xl px-1 py-2 text-sm">
                <div className="flex min-w-0 items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${hasCustom ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-600"}`}
                    aria-label={hasCustom ? "Цена указана" : "Цена не указана"}
                  />
                  <span className="min-w-0 flex-1 leading-snug">{m.name}</span>
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-slate-400">× {basis.calculationLabel}</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,auto)] items-start gap-2">
                  <div className="min-w-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={price || ""}
                      placeholder={`₽/${basis.unitLabel}`}
                      onChange={(e) => onPriceChange(basis.key, parsePriceInput(e.target.value))}
                      className={`w-full rounded-xl border px-3 py-2 text-right text-sm tabular-nums text-slate-700 outline-none transition-colors focus:ring-2 focus:ring-accent-500/30 dark:text-slate-200 ${
                        hasCustom
                          ? "border-accent-300 bg-accent-50/50 dark:border-accent-600 dark:bg-accent-900/10"
                          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                      }`}
                      aria-label={`Цена за ${basis.unitDescription}: ${m.name}`}
                    />
                    <p className="mt-1 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                      Цена за {basis.unitDescription}
                    </p>
                  </div>
                  <span className="pt-2 text-right text-xs tabular-nums text-slate-400">
                    {lineTotal > 0 ? `${formatCurrency(lineTotal)} ₽` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="mt-3">
          <WorkPriceHints materials={materials} calculatorSlug={calculatorSlug} />
        </div>
      )}
    </div>
  );
}

function isResultEmpty(result: CalculatorResult): boolean {
  return result.materials.length === 0 ||
    result.materials.every((m) => !m.quantity || isNaN(m.quantity) || m.quantity === 0);
}

function EstimatePrintSheet({
  calculatorTitle,
  result,
  priceTotal,
  accuracyLabel,
}: {
  calculatorTitle?: string;
  result: CalculatorResult;
  priceTotal: number;
  accuracyLabel: string;
}) {
  const groups: Record<string, CalculatorResult["materials"]> = {};
  for (const m of result.materials) {
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }

  const siteHost = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const visibleTotals = getVisibleTotals(result.totals);

  return (
    <div className="estimate-print-sheet hidden print:block text-black">
      <header className="mb-3 border-b border-neutral-400 pb-2">
        <p className="mb-0.5 text-[9pt] text-neutral-600">
          {SITE_NAME} — {siteHost}
        </p>
        <h1 className="m-0 text-[13pt] font-bold leading-tight text-black">
          {calculatorTitle ?? "Расчёт материалов"}
        </h1>
        <p className="mt-1 mb-0 text-[9pt] text-neutral-600">
          Дата: {new Date().toLocaleDateString("ru-RU")} · Режим: {accuracyLabel}
        </p>
      </header>

      {result.warnings.length > 0 && (
        <section className="mb-3 rounded border border-amber-700 p-2 text-[9pt] print:break-inside-avoid">
          <p className="mb-1 mt-0 font-bold">Важно</p>
          <ul className="mb-0 mt-0 pl-4">
            {result.warnings.map((w, i) => (
              <li key={i} className="mb-0.5">
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="print:break-inside-auto">
        <h2 className="m-0 mb-2 text-[11pt] font-bold text-black">Материалы к закупке</h2>
        <table className="ep-materials w-full border-collapse text-[9pt]">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-1 pr-2 text-left font-semibold text-black">Наименование</th>
              <th className="w-[30%] py-1 pl-2 text-right font-semibold text-black">Количество</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).flatMap(([groupName, items]) => [
              <tr key={`${groupName}__h`}>
                <td
                  colSpan={2}
                  className="ep-print-cat pt-2 pb-0.5 text-[8pt] font-bold uppercase tracking-wide text-neutral-800"
                >
                  {groupName}
                </td>
              </tr>,
              ...items.map((m, i) => {
                const rawQty = qtyForMaterial(m);
                const useGrams = m.unit === "кг" && rawQty > 0 && rawQty < 1;
                const [displayVal, displayUnit] = useGrams
                  ? formatWeightParts(rawQty)
                  : [formatMaterialQty(rawQty, m.unit), pluralizeUnit(rawQty, m.unit)];
                return (
                  <tr key={`${groupName}__${i}`} className="border-b border-neutral-300">
                    <td className="ep-print-td-name py-1 pr-2 align-top text-black">
                      <span className="font-medium">{m.name}</span>
                      {m.packageInfo ? (
                        <div className="mt-0.5 text-[8pt] text-neutral-600">
                          {m.packageInfo.count}{" "}
                          {pluralizePackageUnit(m.packageInfo.count, m.packageInfo.packageUnit)} ×{" "}
                          {m.packageInfo.size} {m.unit}
                        </div>
                      ) : null}
                    </td>
                    <td className="ep-print-td-qty whitespace-nowrap py-1 pl-2 text-right align-top tabular-nums text-black">
                      {displayVal} {displayUnit}
                    </td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
      </section>

      {visibleTotals.length > 0 && (
        <section className="mt-4 print:break-inside-avoid">
          <h2 className="m-0 mb-2 text-[11pt] font-bold text-black">Параметры расчёта</h2>
          <table className="ep-totals w-full border-collapse text-[9pt]">
            <tbody>
              {visibleTotals.map(([key, val]) => {
                const { label, value: formattedValue, unit } = formatTotalMetric(key, val);
                return (
                  <tr key={key} className="border-b border-neutral-300">
                    <td className="py-1 pr-2 text-black">{label}</td>
                    <td className="py-1 pl-2 text-right font-medium tabular-nums text-black">
                      {formattedValue}
                      {unit ? ` ${unit}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {priceTotal > 0 && (
        <p className="mt-3 mb-0 text-[10pt] font-bold text-black print:break-inside-avoid">
          Ориентировочная стоимость материалов: {formatCurrency(priceTotal)} ₽
        </p>
      )}

      <footer className="mt-4 border-t border-neutral-400 pt-2 text-[8pt] text-neutral-600 print:break-inside-avoid">
        Количества приведены с учётом запаса и округления под закупку. Уточняйте по условиям объекта и маркам материалов.
      </footer>
    </div>
  );
}

export type ResultBlockProjectSave = {
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
};

export function ResultBlock({
  result,
  shareState,
  onShare,
  calculatorSlug,
  projectSave,
  calculatorTitle,
}: {
  result: CalculatorResult;
  shareState: "idle" | "copied";
  onShare: () => void;
  calculatorSlug?: string;
  /** Если задано — в блоке действий показывается «В проект» (смета в localStorage). */
  projectSave?: ResultBlockProjectSave;
  /** Короткое название калькулятора для печати/PDF. */
  calculatorTitle?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const priceScope = calculatorSlug ? `materials:${calculatorSlug}` : PRICE_SCOPES.materials;
  const [prices, setPrices] = useState<MaterialPrices>({});

  useEffect(() => {
    let cancelled = false;
    void getPrices(priceScope).then((storedPrices) => {
      if (!cancelled) setPrices(storedPrices);
    });
    return () => {
      cancelled = true;
    };
  }, [priceScope]);

  const priceTotal = useMemo(() => getMaterialPriceTotal(result.materials, prices), [result.materials, prices]);
  const filledPriceCount = useMemo(() => getRelevantPriceCount(result.materials, prices), [result.materials, prices]);
  const featuredTotal = useMemo(() => pickFeaturedTotal(result.totals), [result.totals]);
  const secondaryTotal = useMemo(
    () => pickSecondaryTotal(result.totals, featuredTotal?.key),
    [result.totals, featuredTotal?.key]
  );
  const categoryCount = useMemo(
    () => new Set(result.materials.map((m) => m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory)).size,
    [result.materials]
  );
  const primaryMaterial = result.materials[0];
  const primaryQty = primaryMaterial ? qtyForMaterial(primaryMaterial) : 0;
  const primaryDisplay = primaryMaterial
    ? formatMaterialQty(primaryQty, primaryMaterial.unit)
    : "—";
  const accuracyLabel = result.accuracyMode
    ? ACCURACY_MODE_LABELS[result.accuracyMode]
    : result.accuracyExplanation?.modeLabel ?? "Расчёт";
  const accuracyMultiplier = result.accuracyExplanation?.combinedMultiplier;

  const handlePriceChange = (key: string, value: number) => {
    void setPrice(priceScope, key, value);
    setPrices((prev) => {
      const next = { ...prev };
      if (value > 0) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const handleResetAllPrices = () => {
    void resetScope(priceScope);
    setPrices({});
  };

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
        <div className="print:hidden bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1 dark:bg-amber-950/30 dark:border-amber-900/60">
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
        <details className="group print:hidden">
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

      {/* Карточка результатов (на печати — компактный EstimatePrintSheet ниже) */}
      <div className="result-card print:hidden overflow-hidden p-0">
        <div className="border-b border-accent-100 bg-gradient-to-br from-white via-accent-50/70 to-violet-50 px-4 py-5 sm:px-5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-600 text-xl text-white shadow-lg shadow-accent-500/20" aria-hidden>✓</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-300">Расчёт готов</p>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700"
                    title={accuracyMultiplier && accuracyMultiplier !== 1 ? `Коэффициент точности ×${accuracyMultiplier.toFixed(2)}` : "Стандартный расчёт"}
                  >
                    <span className="text-accent-600 dark:text-accent-400">✦</span>
                    {accuracyLabel}
                    {accuracyMultiplier && accuracyMultiplier !== 1 && (
                      <span className="text-slate-400 dark:text-slate-500">×{accuracyMultiplier.toFixed(2)}</span>
                    )}
                  </span>
                </div>
                <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{CALCULATOR_UI_TEXT.resultsTitle}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Материалы сгруппированы для закупки, стоимость считается по вашим ценам.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ResultMetricCard
              icon="📦"
              label="Всего материалов"
              value={String(result.materials.length)}
              unit={pluralizeRu(result.materials.length, ["позиция", "позиции", "позиций"])}
              hint={`${categoryCount} ${pluralizeRu(categoryCount, ["раздел", "раздела", "разделов"])}`}
              tone="violet"
            />
            {featuredTotal && (
              <ResultMetricCard
                icon="📐"
                label={featuredTotal.label}
                value={featuredTotal.value}
                unit={featuredTotal.unit}
                hint="ключевой параметр"
                tone="emerald"
              />
            )}
            {secondaryTotal ? (
              <ResultMetricCard
                icon="⚖"
                label={secondaryTotal.label}
                value={secondaryTotal.value}
                unit={secondaryTotal.unit}
                hint="расчётный итог"
                tone="slate"
              />
            ) : (
              <ResultMetricCard
                icon="🧾"
                label="Позиций к закупке"
                value={String(result.materials.length)}
                unit={pluralizeRu(result.materials.length, ["позиция", "позиции", "позиций"])}
                hint="готово к покупке"
                tone="slate"
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{CALCULATOR_UI_TEXT.materialsListTitle}</h4>
              {primaryMaterial && (
                <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:max-w-[18rem]">
                  Основное: {primaryDisplay} {pluralizeUnit(primaryQty, primaryMaterial.unit)}
                </span>
              )}
            </div>
            <MaterialList materials={result.materials} />
          </div>

          <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
            <PriceEstimate
              materials={result.materials}
              calculatorSlug={calculatorSlug}
              prices={prices}
              total={priceTotal}
              filledCount={filledPriceCount}
              onPriceChange={handlePriceChange}
              onResetAll={handleResetAllPrices}
            />
          </aside>
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3 text-sm text-violet-800 sm:p-4 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-200">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-base dark:bg-violet-900/40" aria-hidden>🔒</span>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">Сохраняйте расчёты и возвращайтесь к ним позже.</p>
              <p className="mt-0.5 text-xs leading-snug text-violet-700/80 dark:text-violet-300/80">
                Данные не передаются третьим лицам и хранятся только у вас, локально в браузере.
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки действий — полоса под информационной плашкой */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-5 dark:border-slate-700" data-print-hide>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyMaterials}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              title={CALCULATOR_UI_TEXT.copyForMessengerTitle}
            >
              <span aria-hidden>{copyState === "copied" ? "✓" : copyState === "failed" ? "✕" : "📋"}</span>
              {copyState === "copied"
                ? CALCULATOR_UI_TEXT.copied
                : copyState === "failed"
                ? "Ошибка"
                : CALCULATOR_UI_TEXT.copy}
            </button>
            <button
              onClick={onShare}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              title={CALCULATOR_UI_TEXT.shareLinkTitle}
            >
              <span aria-hidden>{shareState === "copied" ? "✓" : "🔗"}</span>
              {shareState === "copied" ? CALCULATOR_UI_TEXT.copied : CALCULATOR_UI_TEXT.share}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              title={CALCULATOR_UI_TEXT.printTitle}
            >
              <span aria-hidden>🖨</span> {CALCULATOR_UI_TEXT.print}
            </button>
          </div>
          {projectSave && (
            <div className="w-full sm:ml-auto sm:w-auto">
              <SaveToProjectButton
                calcId={projectSave.calcId}
                calcTitle={projectSave.calcTitle}
                slug={projectSave.slug}
                categorySlug={projectSave.categorySlug}
                materials={result.materials.map((m) => ({
                  name: m.name,
                  quantity: m.purchaseQty ?? m.withReserve ?? m.quantity,
                  unit: m.unit,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      <EstimatePrintSheet
        calculatorTitle={calculatorTitle}
        result={result}
        priceTotal={priceTotal}
        accuracyLabel={accuracyLabel}
      />

      <div className="print:hidden">
        {result.scenarios && <ScenarioBlock result={result} />}

        <TotalsBlock totals={result.totals} />

        {result.practicalNotes && result.practicalNotes.length > 0 && (
          <PracticalNotes notes={result.practicalNotes} />
        )}
      </div>
    </div>
  );
}

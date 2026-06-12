"use client";

import type { CalculatorResult } from "@/lib/calculators/types";
import { formatNumber } from "../useCalculator";
import { CALCULATOR_UI_TEXT } from "../uiText";
import {
  HIDDEN_TOTALS,
  TOTAL_LABELS,
  TOTAL_UNITS,
  INTEGER_TOTAL_KEYS,
  WEIGHT_KG_TOTAL_KEYS,
  TOTAL_LABEL_FORMS,
} from "../totalsDisplay";
import { pluralizeRu, pluralizePackageUnit, displayUnit } from "@/lib/format/pluralize";
import { formatWeightParts } from "@/lib/format/weight";
import {
  formatMaterialQty,
  isDiscreteUnit,
  pluralizeUnit,
  getCategoryVisual,
  getVisibleTotals,
} from "./shared";
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
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug break-words">{m.name}</span>
                    {m.subtitle && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">{m.subtitle}</p>
                    )}
                  </div>
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

export function TotalsBlock({ totals }: { totals: CalculatorResult["totals"] }) {
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

export function ScenarioBlock({ result }: { result: CalculatorResult }) {
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


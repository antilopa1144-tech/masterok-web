"use client";

import type { MaterialResult } from "@/lib/calculators/types";
import { CALCULATOR_UI_TEXT } from "./uiText";
import { pluralizeRu, pluralizePackageUnit, PACKAGE_UNIT_FORMS } from "@/lib/format/pluralize";

const INTEGER_UNITS = new Set([
  "шт",
  "упаковок",
  "рулонов",
  "мешков",
  "канистр",
  "листов",
  "плит",
]);

function isDiscreteUnit(unit: string): boolean {
  return INTEGER_UNITS.has(unit) && unit !== "г";
}

function formatMaterialQty(value: number, unit: string): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (INTEGER_UNITS.has(unit)) {
    return Math.ceil(value).toLocaleString("ru-RU");
  }
  if (Number.isInteger(value)) return value.toLocaleString("ru-RU");
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

function pluralizeUnit(qty: number, unit: string): string {
  const forms = PACKAGE_UNIT_FORMS[unit];
  return forms ? pluralizeRu(Math.ceil(qty), forms) : unit;
}

function formatWeightParts(kg: number): [string, string] {
  if (kg >= 1) return [kg.toFixed(kg >= 10 ? 0 : 1), "кг"];
  return [(kg * 1000).toFixed(0), "г"];
}

type Props = {
  materials: MaterialResult[];
  banner?: string;
};

export function InsulationMaterialList({ materials, banner }: Props) {
  const groups = new Map<string, MaterialResult[]>();
  for (const m of materials) {
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    const list = groups.get(cat) ?? [];
    list.push(m);
    groups.set(cat, list);
  }

  const groupEntries = [...groups.entries()];

  return (
    <div className="space-y-4">
      {banner && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
          <span className="font-semibold">Состав закупки: </span>
          {banner}
        </div>
      )}

      {groupEntries.map(([groupName, items]) => (
        <div
          key={groupName}
          className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100/80 text-lg text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {groupName.startsWith("Утеплитель") || groupName.includes("Напыляемая") ? "🛡" : "📦"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {groupName}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {items.length}{" "}
                {pluralizeRu(items.length, ["позиция", "позиции", "позиций"])}
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((m, i) => {
              const rawQty = m.purchaseQty ?? m.withReserve ?? m.quantity;
              const useGrams = m.unit === "кг" && rawQty > 0 && rawQty < 1;
              const [displayVal, displayUnit] = useGrams
                ? formatWeightParts(rawQty)
                : [formatMaterialQty(rawQty, m.unit), pluralizeUnit(rawQty, m.unit)];

              return (
                <div
                  key={`${groupName}-${i}`}
                  className={`grid grid-cols-[1fr_auto] items-start gap-3 px-4 py-3 sm:px-5 ${
                    m.highlight ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm leading-snug break-words ${
                          m.highlight
                            ? "font-semibold text-slate-900 dark:text-slate-50"
                            : "font-medium text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {m.name}
                      </span>
                      {m.highlight && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          основной
                        </span>
                      )}
                    </div>
                    {m.subtitle && (
                      <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
                        {m.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 max-w-[12rem] text-right">
                    <div className="mb-0.5 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {CALCULATOR_UI_TEXT.toBuyPrefix}
                    </div>
                    <div className="text-lg font-bold tabular-nums text-slate-950 dark:text-slate-50">
                      {displayVal}{" "}
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                        {displayUnit}
                      </span>
                    </div>
                    {m.packageInfo && (
                      <div className="text-xs text-slate-400 dark:text-slate-400">
                        {m.packageInfo.count}{" "}
                        {pluralizePackageUnit(m.packageInfo.count, m.packageInfo.packageUnit)} ×{" "}
                        {m.packageInfo.size} {m.unit}
                        {isDiscreteUnit(m.unit) && (
                          <>
                            {" "}
                            = {m.packageInfo.count * m.packageInfo.size}{" "}
                            {pluralizeUnit(
                              m.packageInfo.count * m.packageInfo.size,
                              m.unit,
                            )}
                          </>
                        )}
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

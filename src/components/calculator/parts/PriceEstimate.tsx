"use client";

import { useState, useMemo } from "react";
import type { CalculatorResult } from "@/lib/calculators/types";
import { CALCULATOR_UI_TEXT } from "../uiText";
import { getMaterialPriceBasis, getMaterialStoredPrice } from "@/lib/pricing/materialPriceBasis";
import { getReferencePrice } from "@/lib/pricing/referencePrices";
import {
  formatCurrency,
  parsePriceInput,
  pickWorkPriceBenchmarks,
  type MaterialPrices,
} from "./shared";

export function WorkPriceHints({ materials, calculatorSlug }: { materials: CalculatorResult["materials"]; calculatorSlug?: string }) {
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

export function ResultMetricCard({
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
          <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-300">{label}</p>
          <p className="mt-0.5 text-2xl font-bold leading-tight tabular-nums text-slate-950 sm:text-[26px] dark:text-white">
            {value}
            {unit && <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
          </p>
          {hint && <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p>}
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

export function PriceEstimate({
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
            <button
              type="button"
              onClick={() => {
                for (const m of materials) {
                  const basis = getMaterialPriceBasis(m);
                  const refPrice = getReferencePrice(basis.key);
                  if (refPrice !== undefined && refPrice > 0) {
                    onPriceChange(basis.key, refPrice);
                  }
                }
              }}
              className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-medium transition-colors"
              title="Подставить ориентировочные розничные цены (Москва, 2026)"
            >
              📊 Подставить справочные цены
            </button>
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


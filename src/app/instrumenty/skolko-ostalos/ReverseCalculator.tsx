"use client";

import { useState, useMemo } from "react";
import {
  calculateReverseCoverage,
  COVERAGE_MATERIALS,
  formatCoverageArea,
  getCoverageMaterial,
} from "@/lib/tools/reverse-coverage";

export default function ReverseCalculator() {
  const [materialId, setMaterialId] = useState("paint-acrylic");
  const [amount, setAmount] = useState(5);
  const [adjustmentValue, setAdjustmentValue] = useState<number | null>(null);

  const material = getCoverageMaterial(materialId);
  const adjustment = material.adjustment;
  const effectiveAdjustment = adjustmentValue ?? adjustment.defaultValue;

  const result = useMemo(
    () => calculateReverseCoverage({ material, amount, adjustmentValue: effectiveAdjustment }),
    [material, amount, effectiveAdjustment],
  );

  const adjustmentSummary = adjustment.kind === "fixed"
    ? "Типовой расход материала уже учтён"
    : adjustment.kind === "layers"
      ? `${result.adjustmentValue} ${result.adjustmentValue === 1 ? "слой" : result.adjustmentValue < 5 ? "слоя" : "слоёв"} уже учтено в результате`
      : `Слой ${result.adjustmentValue} ${adjustment.unit} уже учтён в результате`;

  return (
    <div className="max-w-5xl space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card order-2 space-y-5 p-4 sm:p-6 lg:order-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">
              Что осталось
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Материал и количество
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ответ пересчитывается сразу — отдельная кнопка не нужна.
            </p>
          </div>

          <div>
            <label htmlFor="coverage-material" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Материал
            </label>
            <select
              id="coverage-material"
              value={materialId}
              onChange={(event) => {
                setMaterialId(event.target.value);
                setAdjustmentValue(null);
              }}
              className="input-field min-h-12 w-full"
            >
              {COVERAGE_MATERIALS.map((item) => (
                <option key={item.id} value={item.id}>{item.icon} {item.name}</option>
              ))}
            </select>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              {material.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div>
              <label htmlFor="coverage-amount" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Осталось, {material.unit}
              </label>
              <div className="relative">
                <input
                  id="coverage-amount"
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step={0.1}
                  value={amount}
                  onChange={(event) => setAmount(Math.max(0.01, Number(event.target.value) || 0.01))}
                  className="input-field min-h-12 w-full pr-10 text-lg font-semibold"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {material.unit}
                </span>
              </div>
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Быстрый выбор
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5, 10, 20, 25].map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setAmount(value)}
                    className={`min-h-12 rounded-lg border px-2 text-xs transition-colors ${
                      amount === value
                        ? "border-accent-400 bg-accent-50 font-semibold text-accent-700 dark:bg-accent-900/20 dark:text-accent-300"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {value} {material.unit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {adjustment.kind !== "fixed" && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {adjustment.label}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {adjustment.kind === "thickness" && (
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={adjustment.min}
                      max={adjustment.max}
                      step={adjustment.step}
                      value={effectiveAdjustment}
                      onChange={(event) => setAdjustmentValue(Number(event.target.value) || adjustment.min)}
                      className="input-field min-h-11 w-28 pr-10"
                      aria-label={`${adjustment.label}, ${adjustment.unit}`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      {adjustment.unit}
                    </span>
                  </div>
                )}
                {adjustment.quickValues.map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setAdjustmentValue(value)}
                    className={`min-h-11 rounded-lg border px-4 text-sm transition-colors ${
                      effectiveAdjustment === value
                        ? "border-accent-400 bg-accent-50 font-medium text-accent-700 dark:bg-accent-900/20 dark:text-accent-300"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {value}{adjustment.kind === "thickness" ? ` ${adjustment.unit}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card order-1 overflow-hidden lg:sticky lg:top-20 lg:order-2">
          <div className="border-b border-blue-200 bg-gradient-to-br from-blue-50 via-white to-accent-50 p-5 dark:border-blue-800/40 dark:from-blue-950/40 dark:via-slate-900 dark:to-accent-950/30 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                  Хватит примерно на
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {formatCoverageArea(result.area)}
                </p>
              </div>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white text-2xl shadow-sm dark:border-slate-700 dark:bg-slate-800" aria-hidden="true">
                {material.icon}
              </span>
            </div>
            {result.area >= 1 && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Квадратная зона около {result.roomSide.toFixed(1)} × {result.roomSide.toFixed(1)} м
              </p>
            )}
            <p className="mt-3 inline-flex rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-800 dark:bg-slate-900/70 dark:text-blue-300">
              {adjustmentSummary}
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-lg font-bold text-slate-950 dark:text-white">{amount} {material.unit}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">В наличии</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-lg font-bold text-slate-950 dark:text-white">
                  {result.consumptionPerM2.toFixed(2)} {material.unit}/м²
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">Расход с учётом условий</p>
              </div>
            </div>

            {result.amountInKilograms !== undefined && (
              <div className="flex justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                <span className="text-slate-500">Эквивалент массы</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{result.amountInKilograms.toFixed(1)} кг</span>
              </div>
            )}
            {result.amountInLiters !== undefined && (
              <div className="flex justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                <span className="text-slate-500">Эквивалент объёма</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{result.amountInLiters.toFixed(1)} л</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">
        * Расход по средним нормам. Фактический расход зависит от основания, способа нанесения и толщины слоя.
      </p>
    </div>
  );
}

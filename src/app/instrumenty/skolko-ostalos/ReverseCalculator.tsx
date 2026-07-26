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

  return (
    <div className="max-w-xl space-y-6">
      <div className="card p-6 space-y-5">
        {/* Material selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Материал
          </label>
          <select
            value={materialId}
            onChange={(e) => { setMaterialId(e.target.value); setAdjustmentValue(null); }}
            className="input-field w-full"
          >
            {COVERAGE_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">{material.description}</p>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Сколько осталось ({material.unit})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            step={0.1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0.01, Number(e.target.value) || 0.01))}
            className="input-field text-lg w-32"
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mt-2">
            {[1, 2, 5, 10, 20, 25].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  amount === v
                    ? "border-accent-300 bg-accent-50 text-accent-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {v} {material.unit}
              </button>
            ))}
          </div>
        </div>

        {adjustment.kind !== "fixed" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                    onChange={(e) => setAdjustmentValue(Number(e.target.value) || adjustment.min)}
                    className="input-field w-28 pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {adjustment.unit}
                  </span>
                </div>
              )}
              {adjustment.quickValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setAdjustmentValue(value)}
                  className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                    effectiveAdjustment === value
                      ? "border-accent-400 bg-accent-50 text-accent-700 font-medium"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {value}{adjustment.kind === "thickness" ? ` ${adjustment.unit}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      <div className="card overflow-hidden">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 border-b border-blue-200 dark:border-blue-800/40">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            Хватит на
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {formatCoverageArea(result.area)}
          </p>
          {result.area >= 1 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Комната ~{result.roomSide.toFixed(1)} × {result.roomSide.toFixed(1)} м
            </p>
          )}
        </div>

        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Расход на 1 м²</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {result.consumptionPerM2.toFixed(2)} {material.unit}/м²
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">В наличии</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {amount} {material.unit}
            </span>
          </div>
          {adjustment.kind !== "fixed" && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{adjustment.resultLabel}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {result.adjustmentValue}
                {adjustment.kind === "thickness" ? ` ${adjustment.unit}` : ""}
              </span>
            </div>
          )}
          {result.amountInKilograms !== undefined && (
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">В наличии (в кг)</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {result.amountInKilograms.toFixed(1)} кг
              </span>
            </div>
          )}
          {result.amountInLiters !== undefined && (
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">В наличии (в литрах)</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {result.amountInLiters.toFixed(1)} л
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">
        * Расход по средним нормам. Фактический расход зависит от основания, способа нанесения и толщины слоя.
      </p>
    </div>
  );
}

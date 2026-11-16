"use client";

import { useState } from "react";
import { parseDecimalDraft } from "@/components/calculator/parts/numericInput";
import { pluralizePackageUnit } from "@/lib/format/pluralize";
import {
  calculateVetonitLrPlus,
  formatVetonitNumber,
  VETONIT_LR_PLUS_BAGS,
  VETONIT_LR_PLUS_LAYER,
  type VetonitBagWeight,
} from "@/lib/tools/vetonit-lr-plus";

const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 aria-invalid:border-red-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100";
const errorClass = "mt-1.5 text-sm text-red-700 dark:text-red-300";
const minAreaM2 = 0.01;
const maxAreaM2 = 100_000;

export default function VetonitCalculator() {
  const [areaDraft, setAreaDraft] = useState("20");
  const [thicknessDraft, setThicknessDraft] = useState("1");
  const [bagWeight, setBagWeight] = useState<VetonitBagWeight>(20);
  const area = parseDecimalDraft(areaDraft);
  const thickness = parseDecimalDraft(thicknessDraft);
  const areaIsValid = area !== null && area >= minAreaM2 && area <= maxAreaM2;
  const { min, max } = VETONIT_LR_PLUS_LAYER;
  const thicknessIsValid = thickness !== null && thickness >= min && thickness <= max;
  const result = areaIsValid && thicknessIsValid
    ? calculateVetonitLrPlus(area, thickness, bagWeight)
    : null;

  return (
    <section className="card p-4 sm:p-6" aria-labelledby="vetonit-calculator-title">
      <h2 id="vetonit-calculator-title" className="text-xl font-bold">
        Сколько смеси купить
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="min-w-0">
          <label htmlFor="vetonit-area" className="block text-sm font-semibold">
            Площадь без проёмов, м²
          </label>
          <input
            id="vetonit-area"
            className={fieldClass}
            type="text"
            inputMode="decimal"
            value={areaDraft}
            onChange={(event) => setAreaDraft(event.target.value)}
            aria-invalid={!areaIsValid}
            aria-describedby={areaIsValid ? undefined : "vetonit-area-error"}
          />
          {!areaIsValid && (
            <p id="vetonit-area-error" className={errorClass}>
              Введите площадь от {formatVetonitNumber(minAreaM2)} до {formatVetonitNumber(maxAreaM2)} м².
            </p>
          )}
        </div>
        <div className="min-w-0">
          <label htmlFor="vetonit-thickness" className="block text-sm font-semibold">
            Толщина слоя, мм
          </label>
          <input
            id="vetonit-thickness"
            className={fieldClass}
            type="text"
            inputMode="decimal"
            value={thicknessDraft}
            onChange={(event) => setThicknessDraft(event.target.value)}
            aria-invalid={!thicknessIsValid}
            aria-describedby="vetonit-layer-range"
          />
          <p
            id="vetonit-layer-range"
            className={thicknessIsValid ? "mt-1.5 text-sm text-slate-600 dark:text-slate-400" : errorClass}
          >
            {thicknessIsValid
              ? `${min}–${max} мм за одно нанесение`
              : `Введите толщину от ${min} до ${max} мм.`}
          </p>
        </div>
        <div className="min-w-0">
          <label htmlFor="vetonit-bag-weight" className="block text-sm font-semibold">
            Вес мешка
          </label>
          <select
            id="vetonit-bag-weight"
            className={fieldClass}
            value={bagWeight}
            onChange={(event) => {
              const weight = VETONIT_LR_PLUS_BAGS.find((bag) => String(bag) === event.target.value);
              if (weight !== undefined) setBagWeight(weight);
            }}
          >
            {VETONIT_LR_PLUS_BAGS.map((weight) => (
              <option key={weight} value={weight}>{weight} кг</option>
            ))}
          </select>
        </div>
      </div>
      <div
        role="status"
        aria-atomic="true"
        className="mt-5 rounded-xl bg-cyan-50 p-4 dark:bg-cyan-950/40"
      >
        {result ? (
          <>
            <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">К покупке</p>
            <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">
              {formatVetonitNumber(result.packages)} {pluralizePackageUnit(result.packages, "мешков")} по {bagWeight} кг
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt>Нужно сухой смеси</dt>
                <dd className="font-semibold tabular-nums">{formatVetonitNumber(result.baseNeedKg)} кг</dd>
              </div>
              <div>
                <dt>Всего в мешках</dt>
                <dd className="font-semibold tabular-nums">{formatVetonitNumber(result.purchaseKg)} кг</dd>
              </div>
              <div>
                <dt>Останется</dt>
                <dd className="font-semibold tabular-nums">{formatVetonitNumber(result.leftoverKg)} кг</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm">Укажите площадь и толщину слоя, чтобы рассчитать количество мешков.</p>
        )}
      </div>
    </section>
  );
}

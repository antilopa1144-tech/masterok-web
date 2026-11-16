"use client";

import { useState } from "react";
import { parseDecimalDraft } from "@/components/calculator/parts/numericInput";
import { CalculationDecimalField, calculationFieldClassName } from "@/components/tools/CalculationDecimalField";
import {
  calculateFugenPurchase,
  formatFugenRange,
  FUGEN_BAG_WEIGHTS_KG,
  FUGEN_THICKNESS_MM,
  FUGEN_WORK,
  type FugenBagWeight,
  type FugenWork,
} from "@/lib/tools/knauf-fugen";

const minArea = 0.01;
const maxArea = 100_000;

export default function FugenCalculator() {
  const [work, setWork] = useState<FugenWork>("surface");
  const [surfaceAreaDraft, setSurfaceAreaDraft] = useState("25");
  const [boardAreaDraft, setBoardAreaDraft] = useState("25");
  const [thicknessDraft, setThicknessDraft] = useState("1");
  const [bagWeightKg, setBagWeightKg] = useState<FugenBagWeight>(10);

  const isSurface = work === "surface";
  const areaDraft = isSurface ? surfaceAreaDraft : boardAreaDraft;
  const areaM2 = parseDecimalDraft(areaDraft);
  const thicknessMm = parseDecimalDraft(thicknessDraft);
  const { min, max } = FUGEN_THICKNESS_MM;
  const validArea = areaM2 !== null && areaM2 >= minArea && areaM2 <= maxArea;
  const validThickness = thicknessMm !== null && thicknessMm >= min && thicknessMm <= max;
  const result = !validArea ? null : work === "surface"
    ? (validThickness ? calculateFugenPurchase({ work, areaM2, thicknessMm, bagWeightKg }) : null)
    : calculateFugenPurchase({ work, areaM2, bagWeightKg });

  return (
    <section className="card p-4 sm:p-6" aria-labelledby="fugen-calculator-title">
      <h2 id="fugen-calculator-title" className="text-xl font-bold">Сколько смеси купить</h2>

      <div className="mt-4 min-w-0 sm:max-w-md">
        <label htmlFor="fugen-work" className="block text-sm font-semibold">Вид работы</label>
        <select
          id="fugen-work"
          value={work}
          className={calculationFieldClassName + " truncate"}
          onChange={(event) => {
            const nextWork = event.target.value;
            if (Object.hasOwn(FUGEN_WORK, nextWork)) setWork(nextWork as FugenWork);
          }}
        >
          {Object.entries(FUGEN_WORK).map(([value, { label }]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <CalculationDecimalField
          id="fugen-area"
          label={isSurface ? "Площадь без проёмов, м²" : "Площадь обшивки, м²"}
          value={areaDraft}
          onChange={isSurface ? setSurfaceAreaDraft : setBoardAreaDraft}
          hint={isSurface ? undefined : "Сложите площади однослойной обшивки со стыками, которые будете заделывать."}
          error={validArea ? undefined : `Введите площадь от ${formatFugenRange(minArea)} до ${formatFugenRange(maxArea)} м².`}
        />
        {isSurface && (
          <CalculationDecimalField
            id="fugen-thickness"
            label="Толщина слоя, мм"
            value={thicknessDraft}
            onChange={setThicknessDraft}
            hint={`${min}–${max} мм за одно нанесение`}
            error={validThickness ? undefined : `Введите толщину от ${min} до ${max} мм.`}
          />
        )}
        <div className="min-w-0">
          <label htmlFor="fugen-bag" className="block text-sm font-semibold">Вес мешка</label>
          <select
            id="fugen-bag"
            className={calculationFieldClassName}
            value={bagWeightKg}
            onChange={(event) => {
              const weight = FUGEN_BAG_WEIGHTS_KG.find((bag) => String(bag) === event.target.value);
              if (weight !== undefined) setBagWeightKg(weight);
            }}
          >
            {FUGEN_BAG_WEIGHTS_KG.map((bag) => <option key={bag} value={bag}>{bag} кг</option>)}
          </select>
        </div>
      </div>

      <div role="status" aria-atomic="true" className="mt-5 rounded-xl bg-cyan-50 p-4 dark:bg-cyan-950/40">
        {result ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">К покупке, мешков по {bagWeightKg} кг</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{formatFugenRange(result.lower.packages, result.upper.packages)}</dd>
            </div>
            <div>
              <dt className="text-sm">Нужно сухой смеси</dt>
              <dd className="mt-1 font-semibold tabular-nums">{formatFugenRange(result.lower.baseNeedKg, result.upper.baseNeedKg)} кг</dd>
            </div>
            <div>
              <dt className="text-sm">Всего в мешках</dt>
              <dd className="mt-1 font-semibold tabular-nums">{formatFugenRange(result.lower.purchaseKg, result.upper.purchaseKg)} кг</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm">Проверьте введённые данные, чтобы рассчитать количество мешков.</p>
        )}
        {result && (
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            Дополнительный запас в расчёт не входит.
          </p>
        )}
      </div>
    </section>
  );
}

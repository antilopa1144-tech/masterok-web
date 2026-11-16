"use client";

import { useState } from "react";
import { parseDecimalDraft } from "@/components/calculator/parts/numericInput";
import { CalculationDecimalField } from "@/components/tools/CalculationDecimalField";
import { pluralizePackageUnit } from "@/lib/format/pluralize";
import {
  calculateUnterputtsPurchase,
  formatUnterputtsNumber,
  UNTERPUTTS_BAG_KG,
  UNTERPUTTS_LAYER_MM,
} from "@/lib/tools/knauf-unterputts";

const minArea = 0.01;
const maxArea = 100_000;

export default function UnterputtsCalculator() {
  const [areaDraft, setAreaDraft] = useState("20");
  const [thicknessDraft, setThicknessDraft] = useState("10");
  const area = parseDecimalDraft(areaDraft);
  const thickness = parseDecimalDraft(thicknessDraft);
  const { min, max } = UNTERPUTTS_LAYER_MM;
  const validArea = area !== null && area >= minArea && area <= maxArea;
  const validThickness = thickness !== null && thickness >= min && thickness <= max;
  const result = validArea && validThickness ? calculateUnterputtsPurchase(area, thickness) : null;

  return (
    <section className="card p-4 sm:p-6" aria-labelledby="unterputts-calculator-title">
      <h2 id="unterputts-calculator-title" className="text-xl font-bold">Сколько штукатурки купить</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CalculationDecimalField
          id="unterputts-area"
          label="Площадь без проёмов, м²"
          value={areaDraft}
          onChange={setAreaDraft}
          error={validArea ? undefined : `Введите площадь от ${formatUnterputtsNumber(minArea)} до ${formatUnterputtsNumber(maxArea)} м².`}
        />
        <CalculationDecimalField
          id="unterputts-thickness"
          label="Средняя толщина слоя, мм"
          value={thicknessDraft}
          onChange={setThicknessDraft}
          hint={`${min}–${max} мм за одно нанесение`}
          error={validThickness ? undefined : `Введите толщину от ${min} до ${max} мм.`}
        />
      </div>
      <div role="status" aria-atomic="true" className="mt-5 rounded-xl bg-cyan-50 p-4 dark:bg-cyan-950/40">
        {result ? (
          <>
            <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">К покупке по расчёту</p>
            <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">
              {formatUnterputtsNumber(result.packages)} {pluralizePackageUnit(result.packages, "мешков")} по {UNTERPUTTS_BAG_KG} кг
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt>Нужно сухой смеси</dt>
                <dd className="font-semibold tabular-nums">≈ {formatUnterputtsNumber(result.baseNeedKg)} кг</dd>
              </div>
              <div>
                <dt>Всего в мешках</dt>
                <dd className="font-semibold tabular-nums">{formatUnterputtsNumber(result.purchaseKg)} кг</dd>
              </div>
              <div>
                <dt>Остаток по расчёту</dt>
                <dd className="font-semibold tabular-nums">≈ {formatUnterputtsNumber(result.leftoverKg)} кг</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">Оценка по норме производителя без запаса на потери.</p>
          </>
        ) : (
          <p className="text-sm">Укажите допустимую площадь и толщину слоя, чтобы рассчитать количество мешков.</p>
        )}
      </div>
    </section>
  );
}

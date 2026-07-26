"use client";

import { useState, useMemo, useEffect } from "react";
import { getPrices as getUserPrices, setPrices as setUserPrices, resetScope, PRICE_SCOPES } from "@/lib/userPrices";
import {
  calculateRenovationCost,
  formatRenovationPrice,
  formatRenovationPriceRange,
  getRenovationType,
  RENOVATION_TYPES,
  ROOM_PRESETS,
} from "@/lib/tools/renovation-cost";

// ── Component ────────────────────────────────────────────────────────────────

export default function RenovationCostCalculator() {
  const [area, setArea] = useState(55);
  const [typeId, setTypeId] = useState("standard");
  const [withWork, setWithWork] = useState(true);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const scopeKey = `${PRICE_SCOPES.renovation}:${typeId}`;

  useEffect(() => {
    let cancelled = false;
    void getUserPrices(scopeKey).then((prices) => {
      if (!cancelled) setCustomPrices(prices);
    });
    return () => {
      cancelled = true;
    };
  }, [scopeKey]);

  const type = getRenovationType(typeId);

  // Persist custom prices
  useEffect(() => {
    if (Object.keys(customPrices).length > 0) {
      void setUserPrices(scopeKey, customPrices);
    }
  }, [customPrices, scopeKey]);

  const handleResetPrices = () => {
    void resetScope(scopeKey);
    setCustomPrices({});
  };

  const result = useMemo(
    () => calculateRenovationCost({ area, typeId, withWork, prices: customPrices }),
    [area, typeId, withWork, customPrices],
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Input form */}
      <div className="card p-6 space-y-5">
        {/* Area */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Площадь квартиры, м²
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={5}
            max={500}
            value={area}
            onChange={(e) => setArea(Math.max(1, Number(e.target.value) || 1))}
            className="input-field text-lg w-32"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {ROOM_PRESETS.map((p) => (
              <button
                key={p.area}
                onClick={() => setArea(p.area)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  area === p.area
                    ? "border-accent-300 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Тип ремонта
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RENOVATION_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeId(t.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  typeId === t.id
                    ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="text-2xl mb-1">{t.icon}</div>
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{t.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* With work toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={withWork}
            onChange={(e) => setWithWork(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Включить стоимость работ (наёмные мастера)
          </span>
        </label>
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        {/* Total banner */}
        <div className="bg-accent-50 dark:bg-accent-900/20 p-6 border-b border-accent-200 dark:border-accent-800/40">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-accent-700 dark:text-accent-400 uppercase tracking-wider mb-1">
                Ваша смета
              </p>
              {result.hasAnyPrice ? (
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {formatRenovationPriceRange(result.total)[0]} — {formatRenovationPriceRange(result.total)[1]} ₽
                </p>
              ) : (
                <p className="text-base text-slate-500 dark:text-slate-400">
                  Введите свои цены в таблицах ниже — итог появится здесь
                </p>
              )}
            </div>
            <div className="text-right space-y-0.5">
              {result.hasAnyPrice && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatRenovationPrice(result.perM2)} ₽/м²
                </p>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                ~{result.durationDays} дней
              </p>
            </div>
          </div>

          {/* Breakdown bar */}
          {withWork && result.hasAnyPrice && result.total > 0 && (
            <div className="mt-4">
              <div className="flex rounded-full overflow-hidden h-3">
                <div
                  className="bg-blue-400 dark:bg-blue-500"
                  style={{ width: `${(result.materialTotal / result.total) * 100}%` }}
                  title={`Материалы: ${formatRenovationPrice(result.materialTotal)} ₽`}
                />
                <div
                  className="bg-emerald-400 dark:bg-emerald-500"
                  style={{ width: `${(result.workTotal / result.total) * 100}%` }}
                  title={`Работы: ${formatRenovationPrice(result.workTotal)} ₽`}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Материалы: {formatRenovationPrice(result.materialTotal)} ₽
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Работы: {formatRenovationPrice(result.workTotal)} ₽
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Materials table */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Материалы
            </h3>
            {Object.values(customPrices).some((v) => v > 0) && (
              <button
                type="button"
                onClick={handleResetPrices}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                title="Сбросить все введённые цены"
              >
                Сбросить все цены
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-400 mb-2">Введите свои цены — итог появится автоматически</p>
          <div className="space-y-1.5">
            {result.materialLines.map((line, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <span className="text-slate-700 dark:text-slate-200 flex-1">{line.name}</span>
                <span className="text-slate-400 dark:text-slate-400 text-xs w-16 text-right">
                  {line.qty} {line.unit}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={customPrices[line.name] || ""}
                  placeholder="₽"
                  onChange={(e) => setCustomPrices((p) => ({ ...p, [line.name]: Number(e.target.value) || 0 }))}
                  className={`w-16 text-right text-xs border rounded px-1 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent-500/30 ${
                    line.price > 0
                      ? "border-accent-300 dark:border-accent-600 bg-accent-50/50 dark:bg-accent-900/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}
                  title="Ваша цена за единицу"
                />
                <span className="font-medium text-slate-900 dark:text-slate-100 w-24 text-right">
                  {line.cost > 0 ? `${formatRenovationPrice(line.cost)} ₽` : "—"}
                </span>
              </div>
            ))}
            {result.materialTotal > 0 && (
              <div className="flex items-center justify-between text-sm font-semibold pt-2 text-slate-900 dark:text-slate-100">
                <span>Итого материалы</span>
                <span>{formatRenovationPrice(result.materialTotal)} ₽</span>
              </div>
            )}
          </div>
        </div>

        {/* Works table */}
        {withWork && result.workLines.length > 0 && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Работы
            </h3>
            <div className="space-y-1.5">
              {result.workLines.map((line, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <span className="text-slate-700 dark:text-slate-200 flex-1">{line.name}</span>
                  <span className="text-slate-400 dark:text-slate-400 text-xs w-16 text-right">
                    {line.qty} {line.unit}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={customPrices[`work:${line.name}`] || ""}
                    placeholder="₽"
                    onChange={(e) => setCustomPrices((p) => ({ ...p, [`work:${line.name}`]: Number(e.target.value) || 0 }))}
                    className={`w-16 text-right text-xs border rounded px-1 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent-500/30 ${
                      line.price > 0
                        ? "border-accent-300 dark:border-accent-600 bg-accent-50/50 dark:bg-accent-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    }`}
                    title="Ваша цена за единицу"
                  />
                  <span className="font-medium text-slate-900 dark:text-slate-100 w-24 text-right">
                    {line.cost > 0 ? `${formatRenovationPrice(line.cost)} ₽` : "—"}
                  </span>
                </div>
              ))}
              {result.workTotal > 0 && (
                <div className="flex items-center justify-between text-sm font-semibold pt-2 text-slate-900 dark:text-slate-100">
                  <span>Итого работы</span>
                  <span>{formatRenovationPrice(result.workTotal)} ₽</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">
        * Цены вводите сами — так смета получается честной, под ваш регион и поставщиков. Итог показан в диапазоне ±15%.
        Расходы материалов рассчитаны по типовым нормативам на м² пола. Для точного расчёта отдельных материалов используйте наши калькуляторы.
      </p>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { getPrices as getUserPrices, setPrices as setUserPrices, resetScope, PRICE_SCOPES } from "@/lib/userPrices";

// ── Структура нормативов (расходы на м²). Цены пользователь вводит сам. ──────

interface MaterialPrice {
  name: string;
  unit: string;
  consumptionPerM2: number; // units per m² of floor area
}

interface WorkPrice {
  name: string;
  unit: string;
  consumptionPerM2: number;
}

interface RenovationType {
  id: string;
  label: string;
  description: string;
  icon: string;
  materials: MaterialPrice[];
  works: WorkPrice[];
  durationDaysPerM2: number;
}

const RENOVATION_TYPES: RenovationType[] = [
  {
    id: "cosmetic",
    label: "Косметический",
    description: "Обои, покраска потолка, замена плинтусов. Без демонтажа и замены коммуникаций.",
    icon: "🎨",
    durationDaysPerM2: 0.3,
    materials: [
      { name: "Обои виниловые", unit: "рулон", consumptionPerM2: 0.18 },
      { name: "Клей обойный", unit: "уп", consumptionPerM2: 0.02 },
      { name: "Краска потолочная", unit: "л", consumptionPerM2: 0.3 },
      { name: "Грунтовка", unit: "л", consumptionPerM2: 0.2 },
      { name: "Плинтус напольный", unit: "м.п.", consumptionPerM2: 0.5 },
      { name: "Расходники (скотч, валики, кисти)", unit: "компл", consumptionPerM2: 0.015 },
    ],
    works: [
      { name: "Поклейка обоев", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Покраска потолка", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Монтаж плинтуса", unit: "м.п.", consumptionPerM2: 0.5 },
      { name: "Грунтовка стен", unit: "м²", consumptionPerM2: 2.5 },
    ],
  },
  {
    id: "standard",
    label: "Стандартный",
    description: "Выравнивание стен, стяжка, плитка в ванной, ламинат, электрика. Основной вариант для жилья.",
    icon: "🏠",
    durationDaysPerM2: 0.7,
    materials: [
      { name: "Штукатурка гипсовая", unit: "мешок 30кг", consumptionPerM2: 0.35 },
      { name: "Шпаклёвка финишная", unit: "мешок 25кг", consumptionPerM2: 0.08 },
      { name: "Грунтовка глубокого проникновения", unit: "л", consumptionPerM2: 0.4 },
      { name: "Ламинат", unit: "м²", consumptionPerM2: 0.7 },
      { name: "Подложка", unit: "м²", consumptionPerM2: 0.7 },
      { name: "Обои / краска стен", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Плитка (ванная, кухня)", unit: "м²", consumptionPerM2: 0.3 },
      { name: "Плиточный клей", unit: "мешок 25кг", consumptionPerM2: 0.05 },
      { name: "Стяжка ЦПС", unit: "мешок 25кг", consumptionPerM2: 0.4 },
      { name: "Электрика (кабель, автоматы)", unit: "компл", consumptionPerM2: 0.06 },
      { name: "Натяжной потолок", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Двери межкомнатные", unit: "шт", consumptionPerM2: 0.04 },
      { name: "Расходники", unit: "компл", consumptionPerM2: 0.02 },
    ],
    works: [
      { name: "Штукатурка стен", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Шпаклёвка", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Укладка ламината", unit: "м²", consumptionPerM2: 0.7 },
      { name: "Укладка плитки", unit: "м²", consumptionPerM2: 0.3 },
      { name: "Стяжка пола", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Электромонтаж", unit: "точка", consumptionPerM2: 0.3 },
      { name: "Натяжной потолок (монтаж)", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Установка дверей", unit: "шт", consumptionPerM2: 0.04 },
    ],
  },
  {
    id: "capital",
    label: "Капитальный",
    description: "Полный демонтаж, замена всех коммуникаций, перепланировка, тёплые полы, дизайнерская отделка.",
    icon: "🏗️",
    durationDaysPerM2: 1.2,
    materials: [
      { name: "Штукатурка гипсовая", unit: "мешок 30кг", consumptionPerM2: 0.5 },
      { name: "Шпаклёвка финишная", unit: "мешок 25кг", consumptionPerM2: 0.12 },
      { name: "Грунтовка", unit: "л", consumptionPerM2: 0.6 },
      { name: "Керамогранит / плитка", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Плиточный клей", unit: "мешок 25кг", consumptionPerM2: 0.1 },
      { name: "Ламинат / паркетная доска", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Подложка", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Стяжка с тёплым полом", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Гипсокартон (перегородки)", unit: "лист", consumptionPerM2: 0.15 },
      { name: "Электрика полная замена", unit: "компл", consumptionPerM2: 0.08 },
      { name: "Сантехника (трубы, фитинги)", unit: "компл", consumptionPerM2: 0.05 },
      { name: "Натяжной потолок", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Двери", unit: "шт", consumptionPerM2: 0.04 },
      { name: "Краска / декоративная штукатурка", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Демонтажные работы (вывоз)", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Расходники", unit: "компл", consumptionPerM2: 0.025 },
    ],
    works: [
      { name: "Демонтаж старой отделки", unit: "м²", consumptionPerM2: 3.5 },
      { name: "Штукатурка стен", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Шпаклёвка + покраска", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Стяжка с тёплым полом", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Укладка напольного покрытия", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Укладка плитки", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Электромонтаж", unit: "точка", consumptionPerM2: 0.4 },
      { name: "Сантехмонтаж", unit: "точка", consumptionPerM2: 0.08 },
      { name: "Монтаж ГКЛ перегородок", unit: "м²", consumptionPerM2: 0.15 },
      { name: "Натяжной потолок", unit: "м²", consumptionPerM2: 1.0 },
      { name: "Установка дверей", unit: "шт", consumptionPerM2: 0.04 },
    ],
  },
];

const ROOM_PRESETS = [
  { label: "Студия 25 м²", area: 25 },
  { label: "1-комнатная 35 м²", area: 35 },
  { label: "2-комнатная 55 м²", area: 55 },
  { label: "3-комнатная 75 м²", area: 75 },
  { label: "Дом 120 м²", area: 120 },
];

function formatPrice(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

function formatPriceRange(n: number): [string, string] {
  return [formatPrice(n * 0.85), formatPrice(n * 1.15)];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RenovationCostCalculator() {
  const [area, setArea] = useState(55);
  const [typeId, setTypeId] = useState("standard");
  const [withWork, setWithWork] = useState(true);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const scopeKey = `${PRICE_SCOPES.renovation}:${typeId}`;

  useEffect(() => {
    setCustomPrices(getUserPrices(scopeKey));
  }, [scopeKey]);

  const type = RENOVATION_TYPES.find((t) => t.id === typeId)!;

  // Persist custom prices
  useEffect(() => {
    if (Object.keys(customPrices).length > 0) {
      setUserPrices(scopeKey, customPrices);
    }
  }, [customPrices, scopeKey]);

  const priceFor = (key: string): number => customPrices[key] ?? 0;

  const handleResetPrices = () => {
    resetScope(scopeKey);
    setCustomPrices({});
  };

  const result = useMemo(() => {
    const materialLines = type.materials.map((m) => {
      const qty = Math.ceil(area * m.consumptionPerM2 * 10) / 10;
      const price = priceFor(m.name);
      const cost = Math.round(qty * price);
      return { ...m, qty, cost, price };
    });

    const workLines = withWork
      ? type.works.map((w) => {
          const qty = Math.ceil(area * w.consumptionPerM2 * 10) / 10;
          const price = priceFor(`work:${w.name}`);
          const cost = Math.round(qty * price);
          return { ...w, qty, cost, price };
        })
      : [];

    const materialTotal = materialLines.reduce((s, l) => s + l.cost, 0);
    const workTotal = workLines.reduce((s, l) => s + l.cost, 0);
    const total = materialTotal + workTotal;
    const perM2 = total > 0 ? Math.round(total / area) : 0;
    const durationDays = Math.ceil(area * type.durationDaysPerM2);
    const hasAnyPrice = total > 0;

    return { materialLines, workLines, materialTotal, workTotal, total, perM2, durationDays, hasAnyPrice };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, type, withWork, customPrices]);

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
                  {formatPriceRange(result.total)[0]} — {formatPriceRange(result.total)[1]} ₽
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
                  {formatPrice(result.perM2)} ₽/м²
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
                  title={`Материалы: ${formatPrice(result.materialTotal)} ₽`}
                />
                <div
                  className="bg-emerald-400 dark:bg-emerald-500"
                  style={{ width: `${(result.workTotal / result.total) * 100}%` }}
                  title={`Работы: ${formatPrice(result.workTotal)} ₽`}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Материалы: {formatPrice(result.materialTotal)} ₽
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Работы: {formatPrice(result.workTotal)} ₽
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
                  {line.cost > 0 ? `${formatPrice(line.cost)} ₽` : "—"}
                </span>
              </div>
            ))}
            {result.materialTotal > 0 && (
              <div className="flex items-center justify-between text-sm font-semibold pt-2 text-slate-900 dark:text-slate-100">
                <span>Итого материалы</span>
                <span>{formatPrice(result.materialTotal)} ₽</span>
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
                    {line.cost > 0 ? `${formatPrice(line.cost)} ₽` : "—"}
                  </span>
                </div>
              ))}
              {result.workTotal > 0 && (
                <div className="flex items-center justify-between text-sm font-semibold pt-2 text-slate-900 dark:text-slate-100">
                  <span>Итого работы</span>
                  <span>{formatPrice(result.workTotal)} ₽</span>
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

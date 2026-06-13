"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { CalculatorResult } from "@/lib/calculators/types";
import { CALCULATOR_UI_TEXT } from "../uiText";
import { ACCURACY_MODE_LABELS } from "../../../../engine/accuracy";
import { pluralizeRu, pluralizePackageUnit } from "@/lib/format/pluralize";
import { formatWeightParts } from "@/lib/format/weight";
import { InsulationMaterialList } from "../InsulationMaterialList";
import SaveToProjectButton from "../SaveToProjectButton";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import { getScenarioForCalculator } from "@/lib/renovation-hub/context";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getPrices, setPrice, resetScope, PRICE_SCOPES } from "@/lib/userPrices";
import { getMaterialPriceTotal, getRelevantPriceCount } from "@/lib/pricing/materialPriceBasis";
import {
  copyMaterialsAsText,
  formatCurrency,
  formatMaterialQty,
  formatTotalMetric,
  getVisibleTotals,
  isResultEmpty,
  KEY_FACTOR_LABELS,
  pickFeaturedTotal,
  pickSecondaryTotal,
  pluralizeUnit,
  qtyForMaterial,
  type MaterialPrices,
} from "./shared";
import { MaterialList, TotalsBlock, ScenarioBlock } from "./ResultsDisplay";
import { PracticalNotes } from "./Panels";
import { ResultMetricCard, PriceEstimate } from "./PriceEstimate";
function EstimatePrintSheet({
  calculatorTitle,
  result,
  priceTotal,
  accuracyLabel,
}: {
  calculatorTitle?: string;
  result: CalculatorResult;
  priceTotal: number;
  accuracyLabel: string;
}) {
  const groups: Record<string, CalculatorResult["materials"]> = {};
  for (const m of result.materials) {
    const cat = m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }

  const siteHost = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const visibleTotals = getVisibleTotals(result.totals);

  return (
    <div className="estimate-print-sheet hidden print:block text-black">
      <header className="mb-3 border-b border-neutral-400 pb-2">
        <p className="mb-0.5 text-[9pt] text-neutral-600">
          {SITE_NAME} — {siteHost}
        </p>
        <h1 className="m-0 text-[13pt] font-bold leading-tight text-black">
          {calculatorTitle ?? "Расчёт материалов"}
        </h1>
        <p className="mt-1 mb-0 text-[9pt] text-neutral-600">
          Дата: {new Date().toLocaleDateString("ru-RU")} · Режим: {accuracyLabel}
        </p>
      </header>

      {result.warnings.length > 0 && (
        <section className="mb-3 rounded border border-amber-700 p-2 text-[9pt] print:break-inside-avoid">
          <p className="mb-1 mt-0 font-bold">Важно</p>
          <ul className="mb-0 mt-0 pl-4">
            {result.warnings.map((w, i) => (
              <li key={i} className="mb-0.5">
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="print:break-inside-auto">
        <h2 className="m-0 mb-2 text-[11pt] font-bold text-black">Материалы к закупке</h2>
        <table className="ep-materials w-full border-collapse text-[9pt]">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-1 pr-2 text-left font-semibold text-black">Наименование</th>
              <th className="w-[30%] py-1 pl-2 text-right font-semibold text-black">Количество</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).flatMap(([groupName, items]) => [
              <tr key={`${groupName}__h`}>
                <td
                  colSpan={2}
                  className="ep-print-cat pt-2 pb-0.5 text-[8pt] font-bold uppercase tracking-wide text-neutral-800"
                >
                  {groupName}
                </td>
              </tr>,
              ...items.map((m, i) => {
                const rawQty = qtyForMaterial(m);
                const useGrams = m.unit === "кг" && rawQty > 0 && rawQty < 1;
                const [displayVal, displayUnit] = useGrams
                  ? formatWeightParts(rawQty)
                  : [formatMaterialQty(rawQty, m.unit), pluralizeUnit(rawQty, m.unit)];
                return (
                  <tr key={`${groupName}__${i}`} className="border-b border-neutral-300">
                    <td className="ep-print-td-name py-1 pr-2 align-top text-black">
                      <span className="font-medium">{m.name}</span>
                      {m.packageInfo ? (
                        <div className="mt-0.5 text-[8pt] text-neutral-600">
                          {m.packageInfo.count}{" "}
                          {pluralizePackageUnit(m.packageInfo.count, m.packageInfo.packageUnit)} ×{" "}
                          {m.packageInfo.size} {m.unit}
                        </div>
                      ) : null}
                    </td>
                    <td className="ep-print-td-qty whitespace-nowrap py-1 pl-2 text-right align-top tabular-nums text-black">
                      {displayVal} {displayUnit}
                    </td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
      </section>

      {visibleTotals.length > 0 && (
        <section className="mt-4 print:break-inside-avoid">
          <h2 className="m-0 mb-2 text-[11pt] font-bold text-black">Параметры расчёта</h2>
          <table className="ep-totals w-full border-collapse text-[9pt]">
            <tbody>
              {visibleTotals.map(([key, val]) => {
                const { label, value: formattedValue, unit } = formatTotalMetric(key, val);
                return (
                  <tr key={key} className="border-b border-neutral-300">
                    <td className="py-1 pr-2 text-black">{label}</td>
                    <td className="py-1 pl-2 text-right font-medium tabular-nums text-black">
                      {formattedValue}
                      {unit ? ` ${unit}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {priceTotal > 0 && (
        <p className="mt-3 mb-0 text-[10pt] font-bold text-black print:break-inside-avoid">
          Ориентировочная стоимость материалов: {formatCurrency(priceTotal)} ₽
        </p>
      )}

      <footer className="mt-4 border-t border-neutral-400 pt-2 text-[8pt] text-neutral-600 print:break-inside-avoid">
        Количества приведены с учётом запаса и округления под закупку. Уточняйте по условиям объекта и маркам материалов.
      </footer>
    </div>
  );
}

export type ResultBlockProjectSave = {
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
};

export function ResultBlock({
  result,
  shareState,
  onShare,
  calculatorSlug,
  projectSave,
  calculatorTitle,
  reviewSlot,
}: {
  result: CalculatorResult;
  shareState: "idle" | "copied";
  onShare: () => void;
  calculatorSlug?: string;
  /** Если задано — в блоке действий показывается «В проект» (смета в localStorage). */
  projectSave?: ResultBlockProjectSave;
  /** Короткое название калькулятора для печати/PDF. */
  calculatorTitle?: string;
  /** Блок Михалыча сразу после сводки, перед списком материалов. */
  reviewSlot?: ReactNode;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const priceScope = calculatorSlug ? `materials:${calculatorSlug}` : PRICE_SCOPES.materials;
  const [prices, setPrices] = useState<MaterialPrices>({});

  useEffect(() => {
    let cancelled = false;
    void getPrices(priceScope).then((storedPrices) => {
      if (!cancelled) setPrices(storedPrices);
    });
    return () => {
      cancelled = true;
    };
  }, [priceScope]);

  const priceTotal = useMemo(() => getMaterialPriceTotal(result.materials, prices), [result.materials, prices]);
  const filledPriceCount = useMemo(() => getRelevantPriceCount(result.materials, prices), [result.materials, prices]);
  const featuredTotal = useMemo(() => pickFeaturedTotal(result.totals), [result.totals]);
  const secondaryTotal = useMemo(
    () => pickSecondaryTotal(result.totals, featuredTotal?.key),
    [result.totals, featuredTotal?.key]
  );
  const categoryCount = useMemo(
    () => new Set(result.materials.map((m) => m.category ?? CALCULATOR_UI_TEXT.defaultMaterialCategory)).size,
    [result.materials]
  );
  const primaryMaterial = result.materials[0];
  const primaryQty = primaryMaterial ? qtyForMaterial(primaryMaterial) : 0;
  const primaryDisplay = primaryMaterial
    ? formatMaterialQty(primaryQty, primaryMaterial.unit)
    : "—";
  const accuracyLabel = result.accuracyMode
    ? ACCURACY_MODE_LABELS[result.accuracyMode]
    : result.accuracyExplanation?.modeLabel ?? "Расчёт";
  const accuracyMultiplier = result.accuracyExplanation?.combinedMultiplier;

  const handlePriceChange = (key: string, value: number) => {
    void setPrice(priceScope, key, value);
    setPrices((prev) => {
      const next = { ...prev };
      if (value > 0) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const handleResetAllPrices = () => {
    void resetScope(priceScope);
    setPrices({});
  };

  const handleCopyMaterials = async () => {
    const ok = await copyMaterialsAsText(result.materials);
    setCopyState(ok ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), 2500);
  };

  if (isResultEmpty(result)) {
    return (
      <div className="card p-6 text-center space-y-3">
        <div className="text-3xl">📐</div>
        <p className="text-slate-700 dark:text-slate-200 font-medium">Недостаточно данных для расчёта</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Проверьте, что размеры помещения и параметры материалов заполнены корректно (больше нуля).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 slide-up">
      {result.warnings.length > 0 && (
        <div className="print:hidden bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1 dark:bg-amber-950/30 dark:border-amber-900/60">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
              <span className="shrink-0">⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Режим точности — компактная расшифровка */}
      {result.accuracyExplanation && result.accuracyExplanation.appliedModifiers.length > 0 && (
        <details className="group print:hidden">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {result.accuracyExplanation.modeLabel}
            </span>
            {result.accuracyExplanation.combinedMultiplier !== 1 && (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                &times;{result.accuracyExplanation.combinedMultiplier.toFixed(2)}
              </span>
            )}
            <span>{CALCULATOR_UI_TEXT.howCalculated}</span>
            <span className="group-open:rotate-180 transition-transform ml-auto">▼</span>
          </summary>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mt-1 space-y-2 border border-slate-200 dark:border-slate-700">
            {/* Поправки — компактной строкой */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {result.accuracyExplanation.appliedModifiers.map((mod, i) => (
                <span key={i} className="text-[11px] text-slate-500 dark:text-slate-400">
                  {mod.label} <span className="font-semibold text-slate-700 dark:text-slate-200">+{Math.round((mod.value - 1) * 100)}%</span>
                </span>
              ))}
            </div>

            {/* Факторы расчёта — если есть */}
            {result.scenarios?.REC?.key_factors && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                {Object.entries(result.scenarios.REC.key_factors)
                  .filter(([k]) => k !== "field_multiplier" && k !== "accuracy_multiplier")
                  .map(([key, value]) => (
                    <span key={key} className="text-[11px] text-slate-400 dark:text-slate-400">
                      {KEY_FACTOR_LABELS[key] ?? key}: <span className="font-mono">{(value as number).toFixed(2)}</span>
                    </span>
                  ))
                }
              </div>
            )}
          </div>
        </details>
      )}

      {/* Карточка результатов (на печати — компактный EstimatePrintSheet ниже) */}
      <div className="result-card print:hidden overflow-hidden p-0">
        <div className="border-b border-accent-100 bg-gradient-to-br from-white via-accent-50/70 to-violet-50 px-4 py-5 sm:px-5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-600 text-xl text-white shadow-lg shadow-accent-500/20" aria-hidden>✓</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-300">Расчёт готов</p>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700"
                    title={accuracyMultiplier && accuracyMultiplier !== 1 ? `Коэффициент точности ×${accuracyMultiplier.toFixed(2)}` : "Стандартный расчёт"}
                  >
                    <span className="text-accent-600 dark:text-accent-400">✦</span>
                    {accuracyLabel}
                    {accuracyMultiplier && accuracyMultiplier !== 1 && (
                      <span className="text-slate-400 dark:text-slate-500">×{accuracyMultiplier.toFixed(2)}</span>
                    )}
                  </span>
                </div>
                <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{CALCULATOR_UI_TEXT.resultsTitle}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Материалы сгруппированы для закупки, стоимость считается по вашим ценам.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {result.summaryCards && result.summaryCards.length > 0 ? (
              // Кастомные карточки от калькулятора (например в утеплителе:
              // «К покупке N упаковок» / «Стоимость» / «На задачу»).
              result.summaryCards.slice(0, 3).map((card, i) => (
                <ResultMetricCard
                  key={`summary-${i}`}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  unit={card.unit}
                  hint={card.hint}
                  tone={card.tone ?? "violet"}
                />
              ))
            ) : (
              <>
                <ResultMetricCard
                  icon="📦"
                  label="Всего материалов"
                  value={String(result.materials.length)}
                  unit={pluralizeRu(result.materials.length, ["позиция", "позиции", "позиций"])}
                  hint={`${categoryCount} ${pluralizeRu(categoryCount, ["раздел", "раздела", "разделов"])}`}
                  tone="violet"
                />
                {featuredTotal && (
                  <ResultMetricCard
                    icon="📐"
                    label={featuredTotal.label}
                    value={featuredTotal.value}
                    unit={featuredTotal.unit}
                    hint="ключевой параметр"
                    tone="emerald"
                  />
                )}
                {secondaryTotal ? (
                  <ResultMetricCard
                    icon="⚖"
                    label={secondaryTotal.label}
                    value={secondaryTotal.value}
                    unit={secondaryTotal.unit}
                    hint="расчётный итог"
                    tone="slate"
                  />
                ) : (
                  <ResultMetricCard
                    icon="🧾"
                    label="Позиций к закупке"
                    value={String(result.materials.length)}
                    unit={pluralizeRu(result.materials.length, ["позиция", "позиции", "позиций"])}
                    hint="готово к покупке"
                    tone="slate"
                  />
                )}
              </>
            )}
          </div>
        </div>


        {reviewSlot && (
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-700">{reviewSlot}</div>
        )}

        {/* Список материалов — на всю ширину; оценка стоимости идёт ОТДЕЛЬНЫМ
            блоком ниже (раньше висела сбоку и отвлекала от главного — списка
            к покупке). Так понятнее и на десктопе, и на смартфоне. */}
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{CALCULATOR_UI_TEXT.materialsListTitle}</h4>
            {primaryMaterial && (
              <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:max-w-[18rem]">
                Основное: {primaryDisplay} {pluralizeUnit(primaryQty, primaryMaterial.unit)}
              </span>
            )}
          </div>
          {calculatorSlug === "uteplenie" ? (
            <InsulationMaterialList
              materials={result.materials}
              banner={result.materialListBanner}
            />
          ) : (
            <MaterialList materials={result.materials} />
          )}

          <div className="mt-4">
            <PriceEstimate
              materials={result.materials}
              calculatorSlug={calculatorSlug}
              prices={prices}
              total={priceTotal}
              filledCount={filledPriceCount}
              onPriceChange={handlePriceChange}
              onResetAll={handleResetAllPrices}
            />
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3 text-sm text-violet-800 sm:p-4 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-200">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-base dark:bg-violet-900/40" aria-hidden>🔒</span>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">
                {projectSave
                  ? "Добавьте расчёт в «Мой ремонт» — соберёте сводную смету и список закупки по объекту."
                  : "Сохраняйте расчёты и возвращайтесь к ним позже."}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-violet-700/80 dark:text-violet-300/80">
                Данные не передаются третьим лицам и хранятся только у вас, локально в браузере.
              </p>
              {projectSave && (
                <Link
                  href="/proekty/"
                  className="mt-2 inline-block text-xs font-semibold text-violet-800 underline hover:text-violet-950 dark:text-violet-200 dark:hover:text-white no-underline hover:underline"
                >
                  Открыть «Мой ремонт» →
                </Link>
              )}
            </div>
          </div>
          {projectSave && (() => {
            const scenarioId = getScenarioForCalculator(calculatorSlug);
            if (!scenarioId) return null;
            const showTile =
              calculatorSlug === "plitka" ||
              calculatorSlug === "vannaya-komnata" ||
              calculatorSlug === "klej-dlya-plitki";
            return (
              <RenovationHubStrip
                scenarioId={scenarioId}
                packId={scenarioId === "apartment" ? null : scenarioId}
                showTileLayout={showTile}
                compact
                className="mt-3"
              />
            );
          })()}
        </div>

        {/* Кнопки действий — полоса под информационной плашкой */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-5 dark:border-slate-700" data-print-hide>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyMaterials}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              title={CALCULATOR_UI_TEXT.copyForMessengerTitle}
            >
              <span aria-hidden>{copyState === "copied" ? "✓" : copyState === "failed" ? "✕" : "📋"}</span>
              {copyState === "copied"
                ? CALCULATOR_UI_TEXT.copied
                : copyState === "failed"
                ? "Ошибка"
                : CALCULATOR_UI_TEXT.copy}
            </button>
            <button
              onClick={onShare}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              title={CALCULATOR_UI_TEXT.shareLinkTitle}
            >
              <span aria-hidden>{shareState === "copied" ? "✓" : "🔗"}</span>
              {shareState === "copied" ? CALCULATOR_UI_TEXT.copied : CALCULATOR_UI_TEXT.share}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              title={CALCULATOR_UI_TEXT.printTitle}
            >
              <span aria-hidden>🖨</span> {CALCULATOR_UI_TEXT.print}
            </button>
          </div>
          {projectSave && (
            <div className="w-full sm:ml-auto sm:w-auto">
              <SaveToProjectButton
                calcId={projectSave.calcId}
                calcTitle={projectSave.calcTitle}
                slug={projectSave.slug}
                categorySlug={projectSave.categorySlug}
                calendarScenarioId={getScenarioForCalculator(calculatorSlug)}
                materials={result.materials.map((m) => ({
                  name: m.name,
                  quantity: m.purchaseQty ?? m.withReserve ?? m.quantity,
                  unit: m.unit,
                  category: m.category,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      <EstimatePrintSheet
        calculatorTitle={calculatorTitle}
        result={result}
        priceTotal={priceTotal}
        accuracyLabel={accuracyLabel}
      />

      <div className="print:hidden">
        {result.scenarios && <ScenarioBlock result={result} />}

        <TotalsBlock totals={result.totals} />

        {result.practicalNotes && result.practicalNotes.length > 0 && (
          <PracticalNotes notes={result.practicalNotes} />
        )}
      </div>
    </div>
  );
}

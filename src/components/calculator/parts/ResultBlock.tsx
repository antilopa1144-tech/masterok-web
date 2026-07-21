"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import type { CalculatorResult } from "@/lib/calculators/types";
import { CALCULATOR_UI_TEXT } from "../uiText";
import { ACCURACY_MODE_LABELS } from "../../../../engine/accuracy";
import { pluralizeRu, pluralizePackageUnit } from "@/lib/format/pluralize";
import { formatWeightParts } from "@/lib/format/weight";
import { InsulationMaterialList } from "../InsulationMaterialList";
import SaveToProjectButton from "../SaveToProjectButton";
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
                      {m.subtitle ? (
                        <div className="mt-0.5 text-[8pt] leading-snug text-neutral-600">
                          {m.subtitle}
                        </div>
                      ) : null}
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
  const primaryPackage = primaryMaterial?.packageInfo;
  const primaryQty = primaryPackage?.count ?? (primaryMaterial ? qtyForMaterial(primaryMaterial) : 0);
  const primaryDisplay = primaryMaterial
    ? formatMaterialQty(primaryQty, primaryPackage ? primaryPackage.packageUnit : primaryMaterial.unit)
    : "—";
  const primaryUnit = primaryMaterial
    ? primaryPackage
      ? pluralizePackageUnit(primaryQty, primaryPackage.packageUnit)
      : pluralizeUnit(primaryQty, primaryMaterial.unit)
    : "";
  const primaryPurchaseHint = useMemo(() => {
    if (!primaryMaterial) return undefined;

    const exactQty = primaryMaterial.quantity;
    const exactText = `${formatMaterialQty(exactQty, primaryMaterial.unit)} ${pluralizeUnit(exactQty, primaryMaterial.unit)}`;
    const parts = [`расчётная потребность ${exactText}`];

    if (
      primaryMaterial.withReserve != null
      && Math.abs(primaryMaterial.withReserve - exactQty) > 0.005
    ) {
      const reserveText = `${formatMaterialQty(primaryMaterial.withReserve, primaryMaterial.unit)} ${pluralizeUnit(primaryMaterial.withReserve, primaryMaterial.unit)}`;
      if (reserveText !== exactText) parts.push(`с запасом ${reserveText}`);
    }

    if (primaryMaterial.packageInfo) {
      const { count, packageUnit, size } = primaryMaterial.packageInfo;
      parts.unshift(
        `${count} ${pluralizePackageUnit(count, packageUnit)} × ${size} ${primaryMaterial.unit}`,
      );
    }

    return parts.join(" · ");
  }, [primaryMaterial]);
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
    <div className="space-y-3 slide-up">
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Результат</h2>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" title={`Режим расчёта: ${accuracyLabel}`}>
              {accuracyMultiplier && accuracyMultiplier > 1
                ? `Запас +${Math.round((accuracyMultiplier - 1) * 100)}%`
                : accuracyLabel}
            </span>
          </div>

          {result.summaryCards && result.summaryCards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {result.summaryCards.slice(0, 3).map((card, index) => (
                <ResultMetricCard key={`summary-${index}`} icon={card.icon} label={card.label} value={card.value} unit={card.unit} hint={card.hint} tone={card.tone ?? "violet"} />
              ))}
            </div>
          ) : primaryMaterial ? (
            <>
              <div className="flex items-center gap-4 rounded-xl border border-accent-200 bg-accent-50/70 p-4 dark:border-accent-800/50 dark:bg-accent-950/20">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-accent-700 shadow-sm dark:bg-slate-900" aria-hidden>🛒</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">К покупке</p>
                  <p className="mt-0.5 text-3xl font-extrabold leading-none tabular-nums text-accent-700 dark:text-accent-400">
                    {primaryDisplay} <span className="text-base font-bold">{primaryUnit}</span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{primaryMaterial.name} · {primaryPurchaseHint}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 py-3 dark:divide-slate-700 dark:border-slate-700">
                <div className="px-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{featuredTotal?.label ?? "Позиций"}</p>
                  <p className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{featuredTotal ? `${featuredTotal.value} ${featuredTotal.unit}` : result.materials.length}</p>
                </div>
                <div className="px-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{secondaryTotal?.label ?? "Разделов"}</p>
                  <p className="mt-1 font-bold tabular-nums text-slate-950 dark:text-white">{secondaryTotal ? `${secondaryTotal.value} ${secondaryTotal.unit}` : categoryCount}</p>
                </div>
              </div>
            </>
          ) : null}
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
                Основное: {primaryDisplay} {primaryUnit}
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

        <div className="grid gap-2 border-t border-slate-200 p-4 sm:grid-cols-2 dark:border-slate-700" data-print-hide>
          {projectSave && (
            <div className="[&>div]:w-full [&_button]:w-full">
              <SaveToProjectButton
                calcId={projectSave.calcId}
                calcTitle={projectSave.calcTitle}
                slug={projectSave.slug}
                categorySlug={projectSave.categorySlug}
                calendarScenarioId={getScenarioForCalculator(calculatorSlug)}
                materials={result.materials.map((m) => ({
                  name: m.name,
                  subtitle: m.subtitle,
                  quantity: m.purchaseQty ?? m.withReserve ?? m.quantity,
                  unit: m.unit,
                  category: m.category,
                }))}
              />
            </div>
          )}
          <button onClick={onShare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" title={CALCULATOR_UI_TEXT.shareLinkTitle}>
            <span aria-hidden>{shareState === "copied" ? "✓" : "↗"}</span>{shareState === "copied" ? CALCULATOR_UI_TEXT.copied : CALCULATOR_UI_TEXT.share}
          </button>
          <details className="group sm:col-span-2">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Ещё действия <span className="transition-transform group-open:rotate-180">⌄</span></summary>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={handleCopyMaterials} className="min-h-10 rounded-xl border border-slate-200 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">{copyState === "copied" ? "✓ Скопировано" : copyState === "failed" ? "Ошибка" : "Копировать список"}</button>
              <button onClick={() => window.print()} className="min-h-10 rounded-xl border border-slate-200 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Печать / PDF</button>
            </div>
          </details>
        </div>
      </div>

      <EstimatePrintSheet
        calculatorTitle={calculatorTitle}
        result={result}
        priceTotal={priceTotal}
        accuracyLabel={accuracyLabel}
      />

      {(result.scenarios || getVisibleTotals(result.totals).length > 0 || (result.practicalNotes?.length ?? 0) > 0 || (result.accuracyExplanation?.appliedModifiers.length ?? 0) > 0) && (
        <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white print:hidden dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70">
            Почему получился такой результат
            <span className="text-lg font-normal text-slate-400 transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700">
            {result.accuracyExplanation && result.accuracyExplanation.appliedModifiers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.accuracyExplanation.appliedModifiers.map((modifier, index) => (
                  <span key={index} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{modifier.label}: +{Math.round((modifier.value - 1) * 100)}%</span>
                ))}
                {result.scenarios?.REC?.key_factors && Object.entries(result.scenarios.REC.key_factors)
                  .filter(([key]) => key !== "field_multiplier" && key !== "accuracy_multiplier")
                  .map(([key, value]) => <span key={key} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">{KEY_FACTOR_LABELS[key] ?? key}: {(value as number).toFixed(2)}</span>)}
              </div>
            )}
            {result.scenarios && <ScenarioBlock result={result} />}
            <TotalsBlock totals={result.totals} />
            {result.practicalNotes && result.practicalNotes.length > 0 && <PracticalNotes notes={result.practicalNotes} />}
          </div>
        </details>
      )}
    </div>
  );
}

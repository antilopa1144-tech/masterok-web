"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CompactToolWorkspaceNav from "@/components/tools/CompactToolWorkspaceNav";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { getPrices as getUserPrices, setPrices as setUserPrices, resetScope, PRICE_SCOPES } from "@/lib/userPrices";
import {
  calculateRenovationCost,
  formatRenovationPrice,
  formatRenovationPriceRange,
  getRenovationType,
  RENOVATION_TYPES,
  ROOM_PRESETS,
} from "@/lib/tools/renovation-cost";
import {
  buildRoomMasterHrefFromRenovationCost,
  readRenovationCostRoomTransfer,
  RENOVATION_COST_TOOL_SLUG,
  ROOM_MASTER_TOOL_SLUG,
} from "@/lib/tools/room-master-to-renovation-cost";
import { trackToolModeChange, trackToolRelatedClick } from "@/lib/analytics";

type RenovationCostStage = "parameters" | "prices" | "result";
const RENOVATION_COST_STAGES = [
  { value: "parameters", shortLabel: "Параметры", label: "Площадь и тип" },
  { value: "prices", shortLabel: "Цены", label: "Материалы и работы" },
  { value: "result", shortLabel: "Итог", label: "Смета и сроки" },
] satisfies Array<{ value: RenovationCostStage; shortLabel: string; label: string }>;

// ── Component ────────────────────────────────────────────────────────────────

export default function RenovationCostCalculator() {
  const searchParams = useSearchParams();
  const [activeStage, setActiveStage] = useState<RenovationCostStage>("parameters");
  const [areaInput, setAreaInput] = useState("55");
  const [typeId, setTypeId] = useState("standard");
  const [withWork, setWithWork] = useState(true);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const workspaceTopRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const scopeKey = `${PRICE_SCOPES.renovation}:${typeId}`;
  const roomTransfer = useMemo(
    () => readRenovationCostRoomTransfer(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (roomTransfer) setAreaInput(String(roomTransfer.areaM2));
  }, [roomTransfer]);

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
  const area = Number(areaInput.replace(",", "."));
  const areaError = areaInput.trim() === ""
    ? "Введите площадь квартиры."
    : !Number.isFinite(area) || area < 5 || area > 500
      ? "Допустимая площадь: от 5 до 500 м²."
      : null;
  const hasInvalidPrice = Object.values(customPrices).some(
    (value) => !Number.isFinite(value) || value < 0,
  );

  // Persist custom prices
  useEffect(() => {
    if (Object.keys(customPrices).length > 0 && !hasInvalidPrice) {
      void setUserPrices(scopeKey, customPrices);
    }
  }, [customPrices, hasInvalidPrice, scopeKey]);

  const handleResetPrices = () => {
    markStarted("material_packaging");
    trackToolModeChange(RENOVATION_COST_TOOL_SLUG, "price:reset");
    void resetScope(scopeKey);
    setCustomPrices({});
  };

  const result = useMemo(
    () => calculateRenovationCost({ area: areaError ? 0 : area, typeId, withWork, prices: customPrices }),
    [area, areaError, typeId, withWork, customPrices],
  );
  const { markStarted, selectMode } = useToolAnalytics(
    RENOVATION_COST_TOOL_SLUG,
    resultRef,
    !areaError && !hasInvalidPrice && result.hasAnyPrice,
  );

  const changeArea = (value: string) => {
    markStarted("surface_size");
    setAreaInput(value);
  };

  const chooseAreaPreset = (value: number) => {
    markStarted("preset");
    trackToolModeChange(RENOVATION_COST_TOOL_SLUG, `area-preset:${value}`);
    setAreaInput(String(value));
  };

  const chooseType = (id: string) => {
    if (id === typeId) return;
    selectMode(`type:${id}`);
    setTypeId(id);
  };

  const toggleWork = (enabled: boolean) => {
    selectMode(`work:${enabled ? "on" : "off"}`);
    setWithWork(enabled);
  };

  const changePrice = (key: string, rawValue: string, kind: "material" | "work") => {
    markStarted("material_packaging");
    const previous = customPrices[key] ?? 0;
    const next = Number(rawValue) || 0;
    if (previous <= 0 && next > 0) {
      trackToolModeChange(RENOVATION_COST_TOOL_SLUG, `price:${kind}:set`);
    } else if (previous > 0 && next <= 0) {
      trackToolModeChange(RENOVATION_COST_TOOL_SLUG, `price:${kind}:cleared`);
    }
    setCustomPrices((prices) => ({ ...prices, [key]: next }));
  };

  const changeStage = useCallback((stage: RenovationCostStage) => {
    if (stage === activeStage) return;
    if (areaError && stage !== "parameters") return;
    if (hasInvalidPrice && stage === "result") return;
    selectMode(`stage:${stage}`);
    setActiveStage(stage);
    window.requestAnimationFrame(() => workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [activeStage, areaError, hasInvalidPrice, selectMode]);

  const totalRange = !areaError && !hasInvalidPrice && result.hasAnyPrice
    ? formatRenovationPriceRange(result.total)
    : null;

  return (
    <div ref={workspaceTopRef} className="max-w-6xl space-y-4 scroll-mt-24">
      {roomTransfer && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200" data-testid="renovation-cost-transfer-banner">
          Из «Моего ремонта» перенесена только площадь пола одного помещения: <strong>{roomTransfer.areaM2.toLocaleString("ru-RU")} м²</strong>. Тип ремонта, участие мастеров и цены выберите здесь; количества ниже остаются укрупнённой сметой и не заменяют полученную закупочную ведомость.
        </div>
      )}
      <div className="xl:hidden">
        <CompactToolWorkspaceNav activeStage={activeStage} ariaLabel="Этапы сметы ремонта" stages={RENOVATION_COST_STAGES} onChange={changeStage} metrics={[
          { label: "Площадь", value: areaError ? "Исправьте" : `${area} м²` },
          { label: "Материалы", value: !areaError && result.materialTotal > 0 ? `${formatRenovationPrice(result.materialTotal)} ₽` : "—" },
          { label: "Работы", value: !withWork ? "Не включены" : !areaError && result.workTotal > 0 ? `${formatRenovationPrice(result.workTotal)} ₽` : "—" },
          { label: "Итого", value: areaError ? "Нет расчёта" : hasInvalidPrice ? "Исправьте цены" : result.hasAnyPrice ? `${formatRenovationPrice(result.total)} ₽` : "Введите цены", accent: true },
        ]} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <section className={`card min-w-0 space-y-4 p-4 sm:space-y-5 sm:p-5 xl:sticky xl:top-20 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto ${activeStage === "parameters" ? "block" : "hidden xl:block"}`}>
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">Шаг 1</p><h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Параметры ремонта</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Площадь, уровень отделки и участие мастеров.</p></div>
          <div>
            <label htmlFor="renovation-area" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{roomTransfer ? "Площадь помещения, м²" : "Площадь квартиры, м²"}</label>
            <input id="renovation-area" type="number" inputMode="decimal" min={5} max={500} value={areaInput} onChange={(e) => changeArea(e.target.value)} aria-invalid={areaError ? true : undefined} aria-describedby={areaError ? "renovation-area-error" : undefined} className="input-field w-32 text-lg" />
            {areaError && <p id="renovation-area-error" role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{areaError}</p>}
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">{ROOM_PRESETS.map((preset) => <button type="button" key={preset.area} onClick={() => chooseAreaPreset(preset.area)} className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition-colors ${!areaError && area === preset.area ? "border-accent-300 bg-accent-50 font-medium text-accent-700 dark:bg-accent-900/20 dark:text-accent-300" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"}`}>{preset.label}</button>)}</div>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Тип ремонта</legend><div className="grid grid-cols-3 gap-2 xl:grid-cols-1">{RENOVATION_TYPES.map((renovationType) => <button type="button" key={renovationType.id} aria-pressed={typeId === renovationType.id} onClick={() => chooseType(renovationType.id)} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-center transition-all sm:block sm:p-3 sm:text-left xl:flex xl:flex-row xl:items-center xl:justify-start xl:gap-3 ${typeId === renovationType.id ? "border-accent-400 bg-accent-50 shadow-sm dark:bg-accent-900/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}><span className="text-xl sm:text-2xl" aria-hidden="true">{renovationType.icon}</span><span><span className="block text-[11px] font-semibold text-slate-900 dark:text-slate-100 sm:text-sm">{renovationType.label}</span><span className="mt-0.5 hidden text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:block">{renovationType.description}</span></span></button>)}</div></fieldset>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><input type="checkbox" checked={withWork} onChange={(e) => toggleWork(e.target.checked)} className="size-5 rounded border-slate-300 text-accent-500 focus:ring-accent-500" /><span className="text-sm text-slate-700 dark:text-slate-300">Включить стоимость работ</span></label>
          <button type="button" onClick={() => changeStage("prices")} disabled={Boolean(areaError)} className="btn-primary min-h-12 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50 xl:hidden">Указать цены →</button>
        </section>

        <section className={`card min-w-0 overflow-x-hidden xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto ${activeStage === "prices" ? "block" : "hidden xl:block"}`}>
          {areaError ? (
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Расчёт приостановлен</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Исправьте площадь</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Объёмы и цены появятся после значения от 5 до 500 м².</p>
            </div>
          ) : <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">Шаг 2</p><h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Цены и объёмы</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Введите известные цены за единицу — частичный итог обновится сразу.</p></div>{Object.values(customPrices).some((value) => value !== 0) && <button type="button" onClick={handleResetPrices} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700">Сбросить цены</button>}</div>
          {hasInvalidPrice && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">Цена не может быть отрицательной. Исправьте отмеченное поле.</p>}
          <details open className="group border-b border-slate-100 dark:border-slate-800"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden sm:px-5"><span><span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Материалы</span><span className="text-[10px] text-slate-400">{result.materialLines.length} позиций · {result.materialTotal > 0 ? `${formatRenovationPrice(result.materialTotal)} ₽` : "цены не заполнены"}</span></span><span aria-hidden="true" className="text-lg text-slate-400 transition-transform group-open:rotate-45">＋</span></summary><div className="px-4 pb-4 sm:px-5 sm:pb-5"><div className="mb-3 grid grid-cols-[minmax(0,1fr)_76px_88px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span>Материал и объём</span><span className="text-right">Цена ед.</span><span className="text-right">Сумма</span></div><div>{result.materialLines.map((line) => <div key={line.name} className="grid grid-cols-[minmax(0,1fr)_76px_88px] items-center gap-2 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800"><div className="min-w-0"><p className="break-words text-sm font-medium text-slate-700 dark:text-slate-200">{line.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{line.qty} {line.unit}</p></div><label><span className="sr-only">Цена за единицу: {line.name}</span><input type="number" inputMode="numeric" min={0} value={customPrices[line.name] || ""} placeholder="₽" onChange={(e) => changePrice(line.name, e.target.value, "material")} aria-invalid={customPrices[line.name] < 0 ? true : undefined} className={`min-h-10 w-full rounded-lg border px-2 text-right text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:text-slate-200 ${customPrices[line.name] < 0 ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20" : line.price > 0 ? "border-accent-300 bg-accent-50/50 dark:border-accent-600 dark:bg-accent-900/10" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`} /></label><span className="text-right text-xs font-semibold text-slate-900 dark:text-slate-100">{line.cost > 0 ? `${formatRenovationPrice(line.cost)} ₽` : "—"}</span></div>)}</div>{result.materialTotal > 0 && <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:text-white"><span>Материалы</span><span>{formatRenovationPrice(result.materialTotal)} ₽</span></div>}</div></details>
          {withWork && result.workLines.length > 0 && <details className="group border-b border-slate-100 dark:border-slate-800"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden sm:px-5"><span><span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Работы</span><span className="text-[10px] text-slate-400">{result.workLines.length} позиций · {result.workTotal > 0 ? `${formatRenovationPrice(result.workTotal)} ₽` : "откройте и заполните при необходимости"}</span></span><span aria-hidden="true" className="text-lg text-slate-400 transition-transform group-open:rotate-45">＋</span></summary><div className="px-4 pb-4 sm:px-5 sm:pb-5"><div className="mb-3 grid grid-cols-[minmax(0,1fr)_76px_88px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span>Работа и объём</span><span className="text-right">Цена ед.</span><span className="text-right">Сумма</span></div><div>{result.workLines.map((line) => <div key={line.name} className="grid grid-cols-[minmax(0,1fr)_76px_88px] items-center gap-2 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800"><div className="min-w-0"><p className="break-words text-sm font-medium text-slate-700 dark:text-slate-200">{line.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{line.qty} {line.unit}</p></div><label><span className="sr-only">Цена за работу: {line.name}</span><input type="number" inputMode="numeric" min={0} value={customPrices[`work:${line.name}`] || ""} placeholder="₽" onChange={(e) => changePrice(`work:${line.name}`, e.target.value, "work")} aria-invalid={customPrices[`work:${line.name}`] < 0 ? true : undefined} className={`min-h-10 w-full rounded-lg border px-2 text-right text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:text-slate-200 ${customPrices[`work:${line.name}`] < 0 ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20" : line.price > 0 ? "border-accent-300 bg-accent-50/50 dark:border-accent-600 dark:bg-accent-900/10" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`} /></label><span className="text-right text-xs font-semibold text-slate-900 dark:text-slate-100">{line.cost > 0 ? `${formatRenovationPrice(line.cost)} ₽` : "—"}</span></div>)}</div>{result.workTotal > 0 && <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-950 dark:border-slate-700 dark:text-white"><span>Работы</span><span>{formatRenovationPrice(result.workTotal)} ₽</span></div>}</div></details>}
          <div className="grid gap-2 border-t border-slate-100 p-4 dark:border-slate-800 sm:grid-cols-2 sm:p-5 xl:hidden"><button type="button" onClick={() => changeStage("parameters")} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">← Параметры</button><button type="button" onClick={() => changeStage("result")} disabled={hasInvalidPrice} className="btn-primary min-h-12 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50">Посмотреть смету →</button></div>
          </>}
        </section>

        <section ref={resultRef} className={`card min-w-0 overflow-hidden xl:sticky xl:top-20 ${activeStage === "result" ? "block" : "hidden xl:block"}`}>
          {areaError || hasInvalidPrice ? (
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Смета приостановлена</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Исправьте отмеченные поля</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Итог появится только для корректной площади и неотрицательных цен.</p>
            </div>
          ) : <>
          <div className="border-b border-accent-200 bg-accent-50 p-4 dark:border-accent-800/40 dark:bg-accent-900/20 sm:p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">Паспорт сметы</p><h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{type.icon} {type.label}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{area} м² · {withWork ? "материалы и работы" : "только материалы"} · примерно {result.durationDays} дней</p></div>
          <div className="p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-300">По введённым ценам</p>{totalRange ? <><p className="mt-2 text-2xl font-bold leading-tight text-slate-950 dark:text-white">{totalRange[0]} — {totalRange[1]} ₽</p><p className="mt-1 text-xs text-slate-500">Ориентир ±15% · {formatRenovationPrice(result.perM2)} ₽/м²</p></> : <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Укажите хотя бы одну цену на втором шаге — здесь появится частичный итог.</div>}
            {withWork && result.hasAnyPrice && result.total > 0 && <div className="mt-5"><div className="flex h-3 overflow-hidden rounded-full"><div className="bg-blue-400 dark:bg-blue-500" style={{ width: `${(result.materialTotal / result.total) * 100}%` }} /><div className="bg-emerald-400 dark:bg-emerald-500" style={{ width: `${(result.workTotal / result.total) * 100}%` }} /></div><div className="mt-2 space-y-1 text-xs text-slate-500"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-400" />Материалы</span><strong className="text-slate-700 dark:text-slate-200">{formatRenovationPrice(result.materialTotal)} ₽</strong></div><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" />Работы</span><strong className="text-slate-700 dark:text-slate-200">{formatRenovationPrice(result.workTotal)} ₽</strong></div></div></div>}
            <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xl font-bold text-slate-950 dark:text-white">{area} м²</p><p className="text-[10px] text-slate-500">Площадь</p></div><div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xl font-bold text-slate-950 dark:text-white">~{result.durationDays}</p><p className="text-[10px] text-slate-500">Дней работы</p></div></div>
            <button type="button" onClick={() => changeStage("prices")} className="mt-5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 xl:hidden">← Изменить цены</button>
          </div>
          </>}
        </section>
      </div>

      {!areaError && (
        <Link
          href={buildRoomMasterHrefFromRenovationCost()}
          onClick={() => trackToolRelatedClick(RENOVATION_COST_TOOL_SLUG, ROOM_MASTER_TOOL_SLUG)}
          className="flex min-h-12 items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 no-underline hover:border-orange-400 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-200"
          data-testid="room-master-link"
        >
          Собрать точную закупку для одной комнаты <span aria-hidden>→</span>
        </Link>
      )}
      <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-400">* Цены вводите сами — так смета остаётся честной для вашего региона и поставщиков. Итог показан в диапазоне ±15%. Расходы материалов рассчитаны по типовым нормативам на м² пола; для точного расчёта отдельных материалов используйте профильные калькуляторы.</p>
    </div>
  );
}

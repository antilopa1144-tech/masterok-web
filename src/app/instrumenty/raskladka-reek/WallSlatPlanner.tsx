"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import CompactToolWorkspaceNav from "@/components/tools/CompactToolWorkspaceNav";
import { ToolMetric, ToolNotes, ToolNumberInput, ToolPresetButton } from "@/components/tools/VisualToolPrimitives";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { calculateWallSlatLayout, type SlatSizingMode } from "@/lib/tools/wall-slat-layout";

const PRESETS = [{ label: "Узкие 20 / 20", width: 20, gap: 20 }, { label: "Классика 30 / 20", width: 30, gap: 20 }, { label: "Широкие 40 / 30", width: 40, gap: 30 }] as const;
type SlatWorkspaceStage = "parameters" | "layout" | "result";
const SLAT_WORKSPACE_STAGES = [
  { value: "parameters", shortLabel: "Параметры", label: "Стена и рейка" },
  { value: "layout", shortLabel: "Схема", label: "Ритм и поля" },
  { value: "result", shortLabel: "Результат", label: "Итог к покупке" },
] satisfies Array<{ value: SlatWorkspaceStage; shortLabel: string; label: string }>;

function SlatWallSvg({ result }: { result: ReturnType<typeof calculateWallSlatLayout> }) {
  const { wallWidthMm: width, wallHeightMm: height } = result.input;
  const unit = Math.min(width, height);
  const padX = unit * .15;
  const padTop = unit * .16;
  const padBottom = unit * .2;
  return (
    <svg viewBox={`${-padX} ${-padTop} ${width + padX * 2} ${height + padTop + padBottom}`} className="h-auto w-full" role="img" aria-label={`Стена с ${result.slatCount} декоративными рейками`}>
      <defs><linearGradient id="slat-wall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#faf7f2" /><stop offset="1" stopColor="#e7e5e4" /></linearGradient><linearGradient id="slat-wood" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#78350f" /><stop offset=".35" stopColor="#b45309" /><stop offset=".75" stopColor="#92400e" /><stop offset="1" stopColor="#451a03" /></linearGradient><filter id="slat-shadow"><feDropShadow dx={unit / 100} dy={unit / 90} stdDeviation={unit / 110} floodColor="#0f172a" floodOpacity=".28" /></filter></defs>
      <rect x={-padX} y={-padTop} width={width + padX * 2} height={height + padTop + padBottom} rx={unit / 25} fill="#f4eee5" />
      <polygon points={`${-padX},${height + padBottom * .55} 0,${height} ${width},${height} ${width + padX},${height + padBottom * .55}`} fill="#c8b69d" />
      <rect width={width} height={height} fill="url(#slat-wall)" stroke="#78716c" strokeWidth={unit / 300} />
      {result.placements.map((slat, index) => <g key={slat.id} filter="url(#slat-shadow)"><rect x={slat.xMm} width={slat.widthMm} height={height} rx={Math.min(3, slat.widthMm / 8)} fill="url(#slat-wood)" /><path d={`M ${slat.xMm + slat.widthMm * .35} 0 V ${height}`} stroke="#fbbf24" strokeOpacity=".18" strokeWidth={Math.max(1, slat.widthMm / 18)} />{index % 5 === 0 && <path d={`M ${slat.xMm + slat.widthMm * .7} 0 C ${slat.xMm} ${height * .3}, ${slat.xMm + slat.widthMm} ${height * .65}, ${slat.xMm + slat.widthMm * .35} ${height}`} fill="none" stroke="#451a03" strokeOpacity=".22" strokeWidth={Math.max(1, slat.widthMm / 15)} />}</g>)}
      <rect y={height - unit * .035} width={width} height={unit * .035} fill="#e7ded1" stroke="#a8a29e" strokeWidth={unit / 400} />
      <text x={width / 2} y={-padTop * .42} textAnchor="middle" fill="#57534e" fontSize={Math.max(55, unit / 28)} fontWeight="650">{width.toLocaleString("ru-RU")} мм · поля по {result.edgeGapMm} мм</text>
    </svg>
  );
}

export default function WallSlatPlanner() {
  const [activeStage, setActiveStage] = useState<SlatWorkspaceStage>("layout");
  const [wallWidth, setWallWidth] = useState(3000);
  const [wallHeight, setWallHeight] = useState(2700);
  const [slatWidth, setSlatWidth] = useState(30);
  const [gap, setGap] = useState(20);
  const [count, setCount] = useState(40);
  const [mode, setMode] = useState<SlatSizingMode>("by-gap");
  const [stockLength, setStockLength] = useState(3000);
  const [reserve, setReserve] = useState(5);
  const workspaceTopRef = useRef<HTMLDivElement>(null); const parametersRef = useRef<HTMLDivElement>(null); const layoutRef = useRef<HTMLDivElement>(null); const resultRef = useRef<HTMLDivElement>(null);
  const { markStarted, selectMode } = useToolAnalytics("raskladka-reek", resultRef);
  const result = useMemo(() => calculateWallSlatLayout({ wallWidthMm: wallWidth, wallHeightMm: wallHeight, slatWidthMm: slatWidth, desiredGapMm: gap, desiredCount: count, mode, stockLengthMm: stockLength, reservePercent: reserve }), [count, gap, mode, reserve, slatWidth, stockLength, wallHeight, wallWidth]);
  const projectMaterials = useMemo(() => [{ name: `Декоративная рейка ${result.input.slatWidthMm} мм`, quantity: result.purchasePieces, unit: `шт. по ${result.input.stockLengthMm / 1000} м`, category: "Отделка стен" }], [result]);
  const start = () => markStarted("material_size");
  const changeStage = useCallback((stage: SlatWorkspaceStage) => {
    setActiveStage(stage);
    window.requestAnimationFrame(() => workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);
  return <div ref={workspaceTopRef} className="space-y-4 scroll-mt-24 xl:grid xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)_minmax(280px,0.85fr)] xl:items-start xl:gap-4 xl:space-y-0">
    <div className="xl:col-span-3">
    <CompactToolWorkspaceNav activeStage={activeStage} ariaLabel="Этапы раскладки реек" stages={SLAT_WORKSPACE_STAGES} onChange={changeStage} metrics={[
      { label: "Рейки", value: `${result.slatCount} шт.` },
      { label: "Зазор", value: `${result.actualGapMm} мм` },
      { label: "Чистая длина", value: `${result.exactLinearM} м` },
      { label: "Купить", value: `${result.purchasePieces} шт.`, accent: true },
    ]} />
    </div>

    <div ref={parametersRef} className={`card scroll-mt-24 space-y-4 border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6 xl:col-start-1 xl:row-start-2 xl:block xl:sticky xl:top-20 ${activeStage === "parameters" ? "block" : "hidden"}`}>
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Шаг 1</p><h2 className="mt-1 text-xl font-bold text-stone-950 dark:text-white">Параметры раскладки</h2><p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Стена, формат рейки и способ задать ритм.</p></div>
      <details open className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-semibold text-stone-950 dark:text-white">Размер стены</span><span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{wallWidth.toLocaleString("ru-RU")} × {wallHeight.toLocaleString("ru-RU")} мм</span></span><span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span></summary><div className="grid gap-4 border-t border-stone-100 px-4 pb-4 pt-3 sm:grid-cols-2 dark:border-slate-800"><ToolNumberInput label="Ширина стены" value={wallWidth} unit="мм" min={300} max={30000} step={10} onChange={(v) => { start(); setWallWidth(v); }} /><ToolNumberInput label="Высота стены" value={wallHeight} unit="мм" min={300} max={10000} step={10} onChange={(v) => { start(); setWallHeight(v); }} /></div></details>
      <details className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-semibold text-stone-950 dark:text-white">Рейка и длина</span><span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">Лицевая часть {slatWidth} мм · хлыст {(stockLength / 1000).toLocaleString("ru-RU")} м</span></span><span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span></summary><div className="space-y-3 border-t border-stone-100 px-4 pb-4 pt-3 dark:border-slate-800"><div className="grid gap-4 sm:grid-cols-2"><ToolNumberInput label="Ширина лицевой части рейки" value={slatWidth} unit="мм" min={5} max={500} onChange={(v) => { start(); setSlatWidth(v); }} /><ToolNumberInput label="Длина покупной рейки" value={stockLength} unit="мм" min={300} max={12000} step={100} onChange={(v) => { start(); setStockLength(v); }} /></div><div className="flex flex-wrap gap-2">{PRESETS.map((preset) => <ToolPresetButton key={preset.label} active={slatWidth === preset.width && gap === preset.gap} onClick={() => { markStarted("preset"); setSlatWidth(preset.width); setGap(preset.gap); setMode("by-gap"); }}>{preset.label}</ToolPresetButton>)}</div></div></details>
      <details className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-semibold text-stone-950 dark:text-white">Ритм и запас</span><span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{mode === "by-gap" ? `Зазор ${gap} мм` : `${count} реек`} · запас {reserve}%</span></span><span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span></summary><div className="space-y-4 border-t border-stone-100 px-4 pb-4 pt-3 dark:border-slate-800"><label><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Что зафиксировать</span><span className="grid grid-cols-2 gap-2">{(["by-gap", "by-count"] as const).map((value) => <button type="button" key={value} onClick={() => { selectMode(value); setMode(value); }} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${mode === value ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "by-gap" ? "Заданный зазор" : "Количество"}</button>)}</span></label><div className="grid gap-4 sm:grid-cols-2">{mode === "by-gap" ? <ToolNumberInput label="Зазор между рейками" value={gap} unit="мм" min={0} max={1000} onChange={(v) => { start(); setGap(v); }} /> : <ToolNumberInput label="Количество реек" value={count} unit="шт." min={1} max={500} onChange={(v) => { start(); setCount(v); }} />}<ToolNumberInput label="Закрытый запас" value={reserve} unit="%" min={0} max={30} onChange={(v) => { start(); setReserve(v); }} /></div></div></details>
      <button type="button" onClick={() => changeStage("layout")} className="btn-primary min-h-12 w-full justify-center text-sm sm:w-auto xl:hidden">Посмотреть схему →</button>
    </div>

    <div ref={layoutRef} className={`card scroll-mt-24 space-y-4 border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6 xl:col-start-2 xl:row-start-2 xl:block ${activeStage === "layout" ? "block" : "hidden"}`}><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Шаг 2 · живая схема</p><h2 className="mt-1 text-xl font-bold text-stone-950 dark:text-white">Рейки на стене</h2><p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{result.slatCount} реек · шаг {Math.round(result.input.slatWidthMm + result.actualGapMm)} мм · равные поля по {result.edgeGapMm} мм</p></div><div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-stone-100 p-1 shadow-inner dark:border-slate-700 dark:bg-slate-950 sm:p-3"><SlatWallSvg result={result} /></div><div className="grid gap-2 sm:grid-cols-2 xl:hidden"><button type="button" onClick={() => changeStage("parameters")} className="min-h-12 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">← Изменить параметры</button><button type="button" onClick={() => changeStage("result")} className="btn-primary min-h-12 w-full justify-center text-sm">Посмотреть результат →</button></div></div>

    <div ref={resultRef} className={`card scroll-mt-24 border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6 xl:col-start-3 xl:row-start-2 xl:block xl:sticky xl:top-20 ${activeStage === "result" ? "block" : "hidden"}`}><div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-900/50 dark:from-amber-950/20 dark:to-orange-950/10"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">Паспорт раскладки</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-stone-950 dark:text-white">Декоративные рейки</h2><p className="mt-1 text-xs text-stone-600 dark:text-slate-400">Стена {wallWidth.toLocaleString("ru-RU")} × {wallHeight.toLocaleString("ru-RU")} мм · рейка {slatWidth} мм · поле {result.edgeGapMm} мм</p></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Края выровнены</span></div></div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Реек к покупке</p><p className="mt-1 text-4xl font-bold text-slate-950 dark:text-white">{result.purchasePieces}</p><p className="mt-1 text-xs text-slate-500">{result.baseStockPieces} в раскладку + {result.reservePieces} закрытых в запас · длина {result.input.stockLengthMm / 1000} м</p></div><div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4 xl:grid-cols-2"><ToolMetric value={`${result.actualGapMm} мм`} label="Фактический зазор" /><ToolMetric value={`${result.edgeGapMm} мм`} label="Поле по краям" /><ToolMetric value={`${result.exactLinearM} м`} label="Чистая длина реек" tone="amber" /><ToolMetric value={`${result.offcutLinearM} м`} label="Остаток открытых реек" /></div><ToolNotes warnings={result.warnings} notes={result.notes} /><div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800"><SaveToProjectButton calcId="instrument-raskladka-reek" calcTitle="Калькулятор реек на стену" slug="paneli-dlya-sten" categorySlug="steny" materials={projectMaterials} calendarScenarioId="room" /></div><button type="button" onClick={() => changeStage("layout")} className="mt-4 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 xl:hidden">← Вернуться к схеме</button></div>
  </div>;
}

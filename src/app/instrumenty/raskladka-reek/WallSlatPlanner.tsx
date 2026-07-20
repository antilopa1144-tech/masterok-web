"use client";

import { useMemo, useRef, useState } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import ToolSectionNav from "@/components/tools/ToolSectionNav";
import { ToolMetric, ToolNotes, ToolNumberInput, ToolPresetButton } from "@/components/tools/VisualToolPrimitives";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { calculateWallSlatLayout, type SlatSizingMode } from "@/lib/tools/wall-slat-layout";

const PRESETS = [{ label: "Узкие 20 / 20", width: 20, gap: 20 }, { label: "Классика 30 / 20", width: 30, gap: 20 }, { label: "Широкие 40 / 30", width: 40, gap: 30 }] as const;

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
  const [wallWidth, setWallWidth] = useState(3000);
  const [wallHeight, setWallHeight] = useState(2700);
  const [slatWidth, setSlatWidth] = useState(30);
  const [gap, setGap] = useState(20);
  const [count, setCount] = useState(40);
  const [mode, setMode] = useState<SlatSizingMode>("by-gap");
  const [stockLength, setStockLength] = useState(3000);
  const [reserve, setReserve] = useState(5);
  const parametersRef = useRef<HTMLDivElement>(null); const layoutRef = useRef<HTMLDivElement>(null); const resultRef = useRef<HTMLDivElement>(null);
  const { hasStarted, markStarted, selectMode } = useToolAnalytics("raskladka-reek", resultRef);
  const result = useMemo(() => calculateWallSlatLayout({ wallWidthMm: wallWidth, wallHeightMm: wallHeight, slatWidthMm: slatWidth, desiredGapMm: gap, desiredCount: count, mode, stockLengthMm: stockLength, reservePercent: reserve }), [count, gap, mode, reserve, slatWidth, stockLength, wallHeight, wallWidth]);
  const projectMaterials = useMemo(() => [{ name: `Декоративная рейка ${result.input.slatWidthMm} мм`, quantity: result.purchasePieces, unit: `шт. по ${result.input.stockLengthMm / 1000} м`, category: "Отделка стен" }], [result]);
  const scroll = (ref: { current: HTMLElement | null }) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const start = () => markStarted("material_size");
  return <div className="max-w-5xl space-y-6">
    <div ref={parametersRef} className="card scroll-mt-24 space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Стена и рейка</h2><p className="mt-1 text-xs text-slate-500">Инструмент автоматически делает одинаковые поля по краям.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{result.slatCount} реек · шаг {Math.round(result.input.slatWidthMm + result.actualGapMm)} мм</span></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ToolNumberInput label="Ширина стены" value={wallWidth} unit="мм" min={300} max={30000} step={10} onChange={(v) => { start(); setWallWidth(v); }} /><ToolNumberInput label="Высота стены" value={wallHeight} unit="мм" min={300} max={10000} step={10} onChange={(v) => { start(); setWallHeight(v); }} /><ToolNumberInput label="Ширина лицевой части рейки" value={slatWidth} unit="мм" min={5} max={500} onChange={(v) => { start(); setSlatWidth(v); }} /><ToolNumberInput label="Длина покупной рейки" value={stockLength} unit="мм" min={300} max={12000} step={100} onChange={(v) => { start(); setStockLength(v); }} /></div>
      <div className="flex flex-wrap gap-2">{PRESETS.map((preset) => <ToolPresetButton key={preset.label} active={slatWidth === preset.width && gap === preset.gap} onClick={() => { markStarted("preset"); setSlatWidth(preset.width); setGap(preset.gap); setMode("by-gap"); }}>{preset.label}</ToolPresetButton>)}</div>
      <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800"><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Что зафиксировать</span><span className="grid grid-cols-2 gap-2">{(["by-gap", "by-count"] as const).map((value) => <button type="button" key={value} onClick={() => { selectMode(value); setMode(value); }} className={`rounded-xl border px-3 py-2 text-sm font-medium ${mode === value ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "by-gap" ? "Заданный зазор" : "Заданное количество"}</button>)}</span></label>{mode === "by-gap" ? <ToolNumberInput label="Зазор между рейками" value={gap} unit="мм" min={0} max={1000} onChange={(v) => { start(); setGap(v); }} /> : <ToolNumberInput label="Количество реек" value={count} unit="шт." min={1} max={500} onChange={(v) => { start(); setCount(v); }} />}<ToolNumberInput label="Закрытый запас" value={reserve} unit="%" min={0} max={30} onChange={(v) => { start(); setReserve(v); }} /></div>
    </div>
    <ToolSectionNav visible={hasStarted} onParameters={() => scroll(parametersRef)} onLayout={() => scroll(layoutRef)} onResult={() => scroll(resultRef)} />
    <div ref={layoutRef} className="card scroll-mt-24 p-4 sm:p-6"><div className="mb-4"><h2 className="font-semibold text-slate-900 dark:text-slate-100">Как рейки будут выглядеть на стене</h2><p className="mt-1 text-xs text-slate-500">Рисунок построен в масштабе; пустые поля слева и справа одинаковые.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><SlatWallSvg result={result} /></div></div>
    <div ref={resultRef} className="card scroll-mt-24 p-5 sm:p-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Купить реек</p><p className="mt-1 text-4xl font-bold text-slate-950 dark:text-white">{result.purchasePieces}</p><p className="mt-1 text-xs text-slate-500">{result.baseStockPieces} в раскладку + {result.reservePieces} закрытых в запас · длина {result.input.stockLengthMm / 1000} м</p></div><div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4"><ToolMetric value={`${result.actualGapMm} мм`} label="Фактический зазор" /><ToolMetric value={`${result.edgeGapMm} мм`} label="Поле по краям" /><ToolMetric value={`${result.exactLinearM} м`} label="Чистая длина реек" tone="amber" /><ToolMetric value={`${result.offcutLinearM} м`} label="Остаток открытых реек" /></div><ToolNotes warnings={result.warnings} notes={result.notes} /><div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800"><SaveToProjectButton calcId="instrument-raskladka-reek" calcTitle="Раскладка декоративных реек" slug="paneli-dlya-sten" categorySlug="steny" materials={projectMaterials} calendarScenarioId="room" /></div></div>
  </div>;
}

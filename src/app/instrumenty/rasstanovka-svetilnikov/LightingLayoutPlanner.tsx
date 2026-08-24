"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import CompactToolWorkspaceNav from "@/components/tools/CompactToolWorkspaceNav";
import { ToolMetric, ToolNotes, ToolNumberInput, ToolPresetButton } from "@/components/tools/VisualToolPrimitives";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { calculateLightingLayout, type LightingPattern } from "@/lib/tools/lighting-layout";

const PRESETS = [
  { label: "Комната 3 × 4 м", width: 3000, length: 4000, columns: 2, rows: 3 },
  { label: "Кухня 3 × 3 м", width: 3000, length: 3000, columns: 3, rows: 3 },
  { label: "Гостиная 4 × 6 м", width: 4000, length: 6000, columns: 3, rows: 4 },
] as const;
type LightingWorkspaceStage = "parameters" | "layout" | "result";
const LIGHTING_WORKSPACE_STAGES = [
  { value: "parameters", shortLabel: "Параметры", label: "Потолок и сетка" },
  { value: "layout", shortLabel: "Схема", label: "Точки на плане" },
  { value: "result", shortLabel: "Результат", label: "Размеры разметки" },
] satisfies Array<{ value: LightingWorkspaceStage; shortLabel: string; label: string }>;

function CeilingSvg({ result }: { result: ReturnType<typeof calculateLightingLayout> }) {
  const { roomWidthMm: width, roomLengthMm: height } = result.input;
  const unit = Math.min(width, height);
  const pad = unit * 0.16;
  const label = Math.max(70, unit / 30);
  return (
    <svg viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} className="mx-auto h-auto w-full sm:h-[680px] sm:w-auto sm:max-w-full" role="img" aria-label={`План потолка с ${result.count} светильниками`}>
      <defs>
        <linearGradient id="light-ceiling" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8fafc" /><stop offset="1" stopColor="#e0f2fe" /></linearGradient>
        <radialGradient id="light-glow"><stop stopColor="#fef9c3" stopOpacity=".95" /><stop offset=".45" stopColor="#fde68a" stopOpacity=".45" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
        <filter id="ceiling-shadow"><feDropShadow dx="0" dy={unit / 80} stdDeviation={unit / 65} floodColor="#0f172a" floodOpacity=".2" /></filter>
      </defs>
      <rect x={-pad} y={-pad} width={width + pad * 2} height={height + pad * 2} rx={unit / 25} fill="#eef6f8" />
      <rect width={width} height={height} rx={unit / 80} fill="url(#light-ceiling)" stroke="#64748b" strokeWidth={unit / 260} filter="url(#ceiling-shadow)" />
      <path d={`M ${width * .08} ${height * .16} H ${width * .38} V ${height * .33} H ${width * .08} Z`} fill="#cbd5e1" opacity=".32" />
      <path d={`M ${width * .63} ${height * .7} H ${width * .92} V ${height * .9} H ${width * .63} Z`} fill="#bae6fd" opacity=".25" />
      {result.points.map((point, index) => (
        <g key={point.id}>
          <circle cx={point.xMm} cy={point.yMm} r={unit / 8} fill="url(#light-glow)" />
          <circle cx={point.xMm} cy={point.yMm} r={unit / 43} fill="#fff" stroke="#0369a1" strokeWidth={unit / 320} />
          <circle cx={point.xMm} cy={point.yMm} r={unit / 85} fill="#facc15" />
          <text x={point.xMm} y={point.yMm + unit / 17} textAnchor="middle" fill="#475569" fontSize={label * .55} fontWeight="700">{index + 1}</text>
        </g>
      ))}
      <text x={width / 2} y={-pad * .43} textAnchor="middle" fill="#475569" fontSize={label} fontWeight="650">{width.toLocaleString("ru-RU")} мм</text>
      <text x={-pad * .46} y={height / 2} textAnchor="middle" transform={`rotate(-90 ${-pad * .46} ${height / 2})`} fill="#475569" fontSize={label} fontWeight="650">{height.toLocaleString("ru-RU")} мм</text>
    </svg>
  );
}

export default function LightingLayoutPlanner() {
  const [activeStage, setActiveStage] = useState<LightingWorkspaceStage>("layout");
  const [width, setWidth] = useState(4000);
  const [length, setLength] = useState(6000);
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(4);
  const [offsetX, setOffsetX] = useState(600);
  const [offsetY, setOffsetY] = useState(600);
  const [pattern, setPattern] = useState<LightingPattern>("grid");
  const workspaceTopRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { markStarted, selectMode } = useToolAnalytics("rasstanovka-svetilnikov", resultRef);
  const result = useMemo(() => calculateLightingLayout({ roomWidthMm: width, roomLengthMm: length, columns, rows, wallOffsetXmm: offsetX, wallOffsetYmm: offsetY, pattern }), [columns, length, offsetX, offsetY, pattern, rows, width]);
  const start = () => markStarted("surface_size");
  const changeStage = useCallback((stage: LightingWorkspaceStage) => {
    setActiveStage(stage);
    window.requestAnimationFrame(() => workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  return (
    <div ref={workspaceTopRef} className="max-w-5xl space-y-4 scroll-mt-24">
      <CompactToolWorkspaceNav activeStage={activeStage} ariaLabel="Этапы расстановки светильников" stages={LIGHTING_WORKSPACE_STAGES} onChange={changeStage} metrics={[
        { label: "Площадь", value: `${result.roomAreaM2} м²` },
        { label: "Точки", value: `${result.count} шт.` },
        { label: "Шаг X", value: `${result.spacingXmm} мм` },
        { label: "Шаг Y", value: `${result.spacingYmm} мм`, accent: true },
      ]} />
      <div ref={parametersRef} hidden={activeStage !== "parameters"} className="card scroll-mt-24 space-y-4 border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Шаг 1</p><h2 className="mt-1 text-xl font-bold text-stone-950 dark:text-white">Параметры потолка</h2><p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Размер по чистовой границе, сетка и отступы от стен.</p></div>
        <details open className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-semibold text-stone-950 dark:text-white">Размер потолка</span><span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{width.toLocaleString("ru-RU")} × {length.toLocaleString("ru-RU")} мм · {result.roomAreaM2} м²</span></span><span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span></summary><div className="grid gap-4 border-t border-stone-100 px-4 pb-4 pt-3 sm:grid-cols-2 dark:border-slate-800"><ToolNumberInput label="Ширина потолка" value={width} unit="мм" min={500} max={30000} step={10} onChange={(v) => { start(); setWidth(v); }} /><ToolNumberInput label="Длина потолка" value={length} unit="мм" min={500} max={30000} step={10} onChange={(v) => { start(); setLength(v); }} /></div></details>
        <details className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-semibold text-stone-950 dark:text-white">Сетка светильников</span><span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{columns} × {rows} · {result.count} точек · {pattern === "grid" ? "ровно" : "шахматно"}</span></span><span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span></summary><div className="space-y-3 border-t border-stone-100 px-4 pb-4 pt-3 dark:border-slate-800"><div className="grid gap-4 sm:grid-cols-2"><ToolNumberInput label="Колонок" value={columns} unit="шт." min={1} max={20} onChange={(v) => { start(); setColumns(v); }} /><ToolNumberInput label="Рядов" value={rows} unit="шт." min={1} max={20} onChange={(v) => { start(); setRows(v); }} /></div><label><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Рисунок</span><span className="grid grid-cols-2 gap-2">{(["grid", "staggered"] as const).map((value) => <button key={value} type="button" aria-pressed={pattern === value} onClick={() => { selectMode(value); setPattern(value); }} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${pattern === value ? "border-sky-400 bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "grid" ? "Ровная сетка" : "Шахматно"}</button>)}</span></label><div className="flex flex-wrap gap-2">{PRESETS.map((preset) => <ToolPresetButton key={preset.label} onClick={() => { markStarted("preset"); setWidth(preset.width); setLength(preset.length); setColumns(preset.columns); setRows(preset.rows); }}>{preset.label}</ToolPresetButton>)}</div></div></details>
        <details className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-semibold text-stone-950 dark:text-white">Отступы от стен</span><span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{offsetX} мм по бокам · {offsetY} мм от торцов</span></span><span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span></summary><div className="grid gap-4 border-t border-stone-100 px-4 pb-4 pt-3 sm:grid-cols-2 dark:border-slate-800"><ToolNumberInput label="Отступ слева и справа" value={offsetX} unit="мм" min={0} max={10000} step={10} onChange={(v) => { start(); setOffsetX(v); }} /><ToolNumberInput label="Отступ от торцевых стен" value={offsetY} unit="мм" min={0} max={10000} step={10} onChange={(v) => { start(); setOffsetY(v); }} /></div></details>
        <button type="button" onClick={() => changeStage("layout")} className="btn-primary min-h-12 w-full justify-center text-sm sm:w-auto">Посмотреть схему →</button>
      </div>
      <div ref={layoutRef} hidden={activeStage !== "layout"} className="card scroll-mt-24 space-y-4 border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Шаг 2 · живая схема</p><h2 className="mt-1 text-xl font-bold text-stone-950 dark:text-white">План потолка</h2><p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{result.count} точек · шаг {result.spacingXmm} × {result.spacingYmm} мм · номера можно переносить в монтажный план</p></div><div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-slate-50 p-1 shadow-inner dark:border-slate-700 dark:bg-slate-950 sm:p-3"><CeilingSvg result={result} /></div><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => changeStage("parameters")} className="min-h-12 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">← Изменить параметры</button><button type="button" onClick={() => changeStage("result")} className="btn-primary min-h-12 w-full justify-center text-sm">Размеры разметки →</button></div></div>
      <div ref={resultRef} hidden={activeStage !== "result"} className="card scroll-mt-24 border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6"><div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-amber-50 p-4 dark:border-sky-900/50 dark:from-sky-950/20 dark:to-amber-950/10"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800 dark:text-sky-300">Паспорт разметки</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-stone-950 dark:text-white">Светильники на потолке</h2><p className="mt-1 text-xs text-stone-600 dark:text-slate-400">Потолок {width.toLocaleString("ru-RU")} × {length.toLocaleString("ru-RU")} мм · сетка {columns} × {rows}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Точки выровнены</span></div></div><div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800/60 dark:bg-sky-900/20"><p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Светильников</p><p className="mt-1 text-4xl font-bold text-slate-950 dark:text-white">{result.count}</p><p className="mt-1 text-xs text-slate-500">{columns} колонок × {rows} рядов · {pattern === "grid" ? "ровная сетка" : "шахматная схема"}</p></div><div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4"><ToolMetric value={`${result.spacingXmm} мм`} label="Между центрами по ширине" tone="sky" /><ToolMetric value={`${result.spacingYmm} мм`} label="Между центрами по длине" /><ToolMetric value={`${result.input.wallOffsetXmm} мм`} label="Отступ по бокам" /><ToolMetric value={`${result.input.wallOffsetYmm} мм`} label="Отступ от торцов" /></div><ToolNotes warnings={result.warnings} notes={result.notes} /><button type="button" onClick={() => changeStage("layout")} className="mt-5 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">← Вернуться к плану</button></div>
    </div>
  );
}

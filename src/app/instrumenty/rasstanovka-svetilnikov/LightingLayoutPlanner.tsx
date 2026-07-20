"use client";

import { useMemo, useRef, useState } from "react";
import ToolSectionNav from "@/components/tools/ToolSectionNav";
import { ToolMetric, ToolNotes, ToolNumberInput, ToolPresetButton } from "@/components/tools/VisualToolPrimitives";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { calculateLightingLayout, type LightingPattern } from "@/lib/tools/lighting-layout";

const PRESETS = [
  { label: "Комната 3 × 4 м", width: 3000, length: 4000, columns: 2, rows: 3 },
  { label: "Кухня 3 × 3 м", width: 3000, length: 3000, columns: 3, rows: 3 },
  { label: "Гостиная 4 × 6 м", width: 4000, length: 6000, columns: 3, rows: 4 },
] as const;

function CeilingSvg({ result }: { result: ReturnType<typeof calculateLightingLayout> }) {
  const { roomWidthMm: width, roomLengthMm: height } = result.input;
  const unit = Math.min(width, height);
  const pad = unit * 0.16;
  const label = Math.max(70, unit / 30);
  return (
    <svg viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} className="h-auto w-full" role="img" aria-label={`План потолка с ${result.count} светильниками`}>
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
  const [width, setWidth] = useState(4000);
  const [length, setLength] = useState(6000);
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(4);
  const [offsetX, setOffsetX] = useState(600);
  const [offsetY, setOffsetY] = useState(600);
  const [pattern, setPattern] = useState<LightingPattern>("grid");
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { hasStarted, markStarted, selectMode } = useToolAnalytics("rasstanovka-svetilnikov", resultRef);
  const result = useMemo(() => calculateLightingLayout({ roomWidthMm: width, roomLengthMm: length, columns, rows, wallOffsetXmm: offsetX, wallOffsetYmm: offsetY, pattern }), [columns, length, offsetX, offsetY, pattern, rows, width]);
  const start = () => markStarted("surface_size");
  const scroll = (ref: { current: HTMLElement | null }) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="max-w-5xl space-y-6">
      <div ref={parametersRef} className="card scroll-mt-24 space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Параметры потолка</h2><p className="mt-1 text-xs text-slate-500">Введите размеры по чистовой границе и нужное число рядов.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">{result.roomAreaM2} м² · {result.count} точек</span></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ToolNumberInput label="Ширина потолка" value={width} unit="мм" min={500} max={30000} step={10} onChange={(v) => { start(); setWidth(v); }} />
          <ToolNumberInput label="Длина потолка" value={length} unit="мм" min={500} max={30000} step={10} onChange={(v) => { start(); setLength(v); }} />
          <ToolNumberInput label="Колонок" value={columns} unit="шт." min={1} max={20} onChange={(v) => { start(); setColumns(v); }} />
          <ToolNumberInput label="Рядов" value={rows} unit="шт." min={1} max={20} onChange={(v) => { start(); setRows(v); }} />
        </div>
        <div className="flex flex-wrap gap-2">{PRESETS.map((preset) => <ToolPresetButton key={preset.label} onClick={() => { markStarted("preset"); setWidth(preset.width); setLength(preset.length); setColumns(preset.columns); setRows(preset.rows); }}>{preset.label}</ToolPresetButton>)}</div>
        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <ToolNumberInput label="Отступ слева и справа" value={offsetX} unit="мм" min={0} max={10000} step={10} onChange={(v) => { start(); setOffsetX(v); }} />
          <ToolNumberInput label="Отступ от торцевых стен" value={offsetY} unit="мм" min={0} max={10000} step={10} onChange={(v) => { start(); setOffsetY(v); }} />
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Рисунок</span><span className="grid grid-cols-2 gap-2">{(["grid", "staggered"] as const).map((value) => <button key={value} type="button" aria-pressed={pattern === value} onClick={() => { selectMode(value); setPattern(value); }} className={`rounded-xl border px-3 py-2 text-sm font-medium ${pattern === value ? "border-sky-400 bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "grid" ? "Ровная сетка" : "Шахматно"}</button>)}</span></label>
        </div>
      </div>
      <ToolSectionNav visible={hasStarted} onParameters={() => scroll(parametersRef)} onLayout={() => scroll(layoutRef)} onResult={() => scroll(resultRef)} />
      <div ref={layoutRef} className="card scroll-mt-24 p-4 sm:p-6"><div className="mb-4"><h2 className="font-semibold text-slate-900 dark:text-slate-100">План потолка</h2><p className="mt-1 text-xs text-slate-500">Точки и размеры пересчитываются сразу; номера удобно переносить в монтажный план.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700"><CeilingSvg result={result} /></div></div>
      <div ref={resultRef} className="card scroll-mt-24 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Размеры разметки</h2>
        <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4"><ToolMetric value={result.count} label="Светильников" tone="sky" /><ToolMetric value={`${result.spacingXmm} мм`} label="Между центрами по ширине" /><ToolMetric value={`${result.spacingYmm} мм`} label="Между центрами по длине" /><ToolMetric value={`${result.input.wallOffsetXmm} × ${result.input.wallOffsetYmm}`} label="Отступы от стен, мм" /></div>
        <ToolNotes warnings={result.warnings} notes={result.notes} />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import ToolSectionNav from "@/components/tools/ToolSectionNav";
import { ToolMetric, ToolNotes, ToolNumberInput, ToolPresetButton } from "@/components/tools/VisualToolPrimitives";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { calculateDeckLayout, type DeckOrientation, type DeckStagger } from "@/lib/tools/deck-layout";

const BOARD_PRESETS = [{ label: "ДПК 150 × 3000", width: 150, length: 3000, gap: 5 }, { label: "Лиственница 120 × 3000", width: 120, length: 3000, gap: 6 }, { label: "Доска 140 × 4000", width: 140, length: 4000, gap: 6 }] as const;
const WOOD = ["#9a5b24", "#a9672d", "#8c4f20", "#b77735", "#7b431c", "#a35f27"];

function DeckSvg({ result }: { result: ReturnType<typeof calculateDeckLayout> }) {
  const width = result.input.orientation === "along-length" ? result.runLengthMm : result.crossWidthMm;
  const height = result.input.orientation === "along-length" ? result.crossWidthMm : result.runLengthMm;
  const unit = Math.min(width, height); const pad = unit * .15;
  return <svg viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} className="h-auto w-full" role="img" aria-label={`План настила из ${result.rows} рядов доски`}>
    <defs><pattern id="deck-ground" width={unit / 10} height={unit / 10} patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="#d9ead3" /><circle cx={unit / 30} cy={unit / 25} r={unit / 90} fill="#86a878" opacity=".55" /></pattern><filter id="deck-shadow"><feDropShadow dx="0" dy={unit / 70} stdDeviation={unit / 80} floodColor="#0f172a" floodOpacity=".25" /></filter></defs>
    <rect x={-pad} y={-pad} width={width + pad * 2} height={height + pad * 2} rx={unit / 24} fill="url(#deck-ground)" />
    <g filter="url(#deck-shadow)"><rect width={width} height={height} fill="#5b4636" stroke="#334155" strokeWidth={unit / 260} />
      {result.placements.map((piece) => {
        const x = result.input.orientation === "along-length" ? piece.xMm : piece.yMm;
        const y = result.input.orientation === "along-length" ? piece.yMm : piece.xMm;
        const w = result.input.orientation === "along-length" ? piece.lengthMm : piece.widthMm;
        const h = result.input.orientation === "along-length" ? piece.widthMm : piece.lengthMm;
        return <g key={piece.id}><rect x={x} y={y} width={w} height={h} fill={WOOD[(piece.sourceBoard - 1) % WOOD.length]} stroke="#4a2c15" strokeWidth={Math.max(1, unit / 650)} /><path d={result.input.orientation === "along-length" ? `M ${x} ${y + h * .35} H ${x + w} M ${x} ${y + h * .72} H ${x + w}` : `M ${x + w * .35} ${y} V ${y + h} M ${x + w * .72} ${y} V ${y + h}`} stroke="#f6d09a" strokeOpacity=".2" strokeWidth={Math.max(1, unit / 900)} />{piece.cut && Math.min(w, h) > unit / 30 && <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff7ed" fontSize={Math.max(18, unit / 55)} fontWeight="750">Д{piece.sourceBoard}</text>}</g>;
      })}
    </g>
    <text x={width / 2} y={-pad * .4} textAnchor="middle" fill="#334155" fontSize={Math.max(50, unit / 28)} fontWeight="650">{width.toLocaleString("ru-RU")} × {height.toLocaleString("ru-RU")} мм</text>
  </svg>;
}

function StockMap({ result }: { result: ReturnType<typeof calculateDeckLayout> }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result.stock.slice(0, 6).map((board) => <div key={board.index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="mb-2 flex justify-between text-xs"><strong>Доска {board.index}</strong><span className="text-slate-500">остаток {Math.round(board.offcutMm)} мм</span></div><svg viewBox={`0 0 ${result.input.boardLengthMm} 120`} className="h-12 w-full rounded bg-amber-50 dark:bg-slate-900">{board.pieces.map((piece, index) => <g key={piece.pieceId}><rect x={piece.xMm} y="0" width={piece.lengthMm} height="120" fill={WOOD[index % WOOD.length]} stroke="#fff" strokeWidth="3" /><text x={piece.xMm + piece.lengthMm / 2} y="62" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="35" fontWeight="700">{Math.round(piece.lengthMm)}</text></g>)}</svg></div>)}</div>;
}

export default function DeckLayoutPlanner() {
  const [deckLength, setDeckLength] = useState(5000); const [deckWidth, setDeckWidth] = useState(3000); const [boardLength, setBoardLength] = useState(3000); const [boardWidth, setBoardWidth] = useState(150); const [gap, setGap] = useState(5); const [orientation, setOrientation] = useState<DeckOrientation>("along-length"); const [stagger, setStagger] = useState<DeckStagger>("half"); const [kerf, setKerf] = useState(3); const [reserve, setReserve] = useState(10);
  const parametersRef = useRef<HTMLDivElement>(null); const layoutRef = useRef<HTMLDivElement>(null); const resultRef = useRef<HTMLDivElement>(null);
  const { hasStarted, markStarted, selectMode } = useToolAnalytics("raskladka-terrasnoy-doski", resultRef);
  const result = useMemo(() => calculateDeckLayout({ deckLengthMm: deckLength, deckWidthMm: deckWidth, boardLengthMm: boardLength, boardWidthMm: boardWidth, gapMm: gap, orientation, stagger, sawKerfMm: kerf, reservePercent: reserve }), [boardLength, boardWidth, deckLength, deckWidth, gap, kerf, orientation, reserve, stagger]);
  const materials = useMemo(() => [{ name: `Террасная доска ${result.input.boardWidthMm} × ${result.input.boardLengthMm} мм`, quantity: result.purchaseBoards, unit: "шт.", category: "Терраса" }], [result]);
  const start = () => markStarted("material_size"); const scroll = (ref: { current: HTMLElement | null }) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <div className="max-w-5xl space-y-6">
    <div ref={parametersRef} className="card scroll-mt-24 space-y-5 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Настил и доска</h2><p className="mt-1 text-xs text-slate-500">Обрезки автоматически переходят в следующие ряды.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{result.deckAreaM2} м² · {result.rows} рядов</span></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ToolNumberInput label="Длина настила" value={deckLength} unit="мм" min={500} max={30000} step={10} onChange={(v) => { start(); setDeckLength(v); }} /><ToolNumberInput label="Ширина настила" value={deckWidth} unit="мм" min={500} max={30000} step={10} onChange={(v) => { start(); setDeckWidth(v); }} /><ToolNumberInput label="Длина доски" value={boardLength} unit="мм" min={500} max={12000} step={100} onChange={(v) => { start(); setBoardLength(v); }} /><ToolNumberInput label="Рабочая ширина доски" value={boardWidth} unit="мм" min={40} max={400} onChange={(v) => { start(); setBoardWidth(v); }} /></div>
      <div className="flex flex-wrap gap-2">{BOARD_PRESETS.map((preset) => <ToolPresetButton key={preset.label} active={boardLength === preset.length && boardWidth === preset.width} onClick={() => { markStarted("preset"); setBoardLength(preset.length); setBoardWidth(preset.width); setGap(preset.gap); }}>{preset.label}</ToolPresetButton>)}</div>
      <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800"><ToolNumberInput label="Зазор между досками" value={gap} unit="мм" min={0} max={30} step={0.5} onChange={(v) => { start(); setGap(v); }} /><ToolNumberInput label="Ширина пропила" value={kerf} unit="мм" min={0} max={10} step={0.5} onChange={(v) => { start(); setKerf(v); }} /><ToolNumberInput label="Закрытый запас" value={reserve} unit="%" min={0} max={30} onChange={(v) => { start(); setReserve(v); }} /><label><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Стыки рядов</span><select value={stagger} onChange={(e) => { selectMode(e.target.value); setStagger(e.target.value as DeckStagger); }} className="input-field w-full"><option value="half">Со смещением ½</option><option value="aligned">В одну линию</option></select></label></div>
      <div className="grid grid-cols-2 gap-2">{(["along-length", "along-width"] as const).map((value) => <button type="button" key={value} onClick={() => { selectMode(value); setOrientation(value); }} className={`rounded-xl border px-3 py-2 text-sm font-medium ${orientation === value ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "along-length" ? "Доски вдоль длины" : "Доски вдоль ширины"}</button>)}</div>
    </div>
    <ToolSectionNav visible={hasStarted} onParameters={() => scroll(parametersRef)} onLayout={() => scroll(layoutRef)} onResult={() => scroll(resultRef)} />
    <div ref={layoutRef} className="card scroll-mt-24 space-y-5 p-4 sm:p-6"><div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Как доски лягут на террасу</h2><p className="mt-1 text-xs text-slate-500">Цвет и метка «Д1» связывают кусок настила с покупной доской в карте раскроя.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><DeckSvg result={result} /></div><div className="border-t border-slate-100 pt-5 dark:border-slate-800"><h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Первые доски раскроя</h3><StockMap result={result} />{result.stock.length > 6 && <p className="mt-3 text-xs text-slate-500">Показаны первые 6 из {result.stock.length}; итог учитывает все доски.</p>}</div></div>
    <div ref={resultRef} className="card scroll-mt-24 p-5 sm:p-6"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/60 dark:bg-emerald-900/20"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Купить досок</p><p className="mt-1 text-4xl font-bold text-slate-950 dark:text-white">{result.purchaseBoards}</p><p className="mt-1 text-xs text-slate-500">{result.baseBoards} в раскрой + {result.reserveBoards} закрытых в запас</p></div><div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4"><ToolMetric value={`${result.exactLinearM} м`} label="Чистая длина настила" tone="emerald" /><ToolMetric value={`${result.offcutLinearM} м`} label="Открытые остатки" /><ToolMetric value={`${result.wastePercent}%`} label="Остаток раскроя" /><ToolMetric value={`${result.lastRowWidthMm} мм`} label="Ширина крайнего ряда" /></div><ToolNotes warnings={result.warnings} notes={result.notes} /><div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800"><Link href="/kalkulyatory/fasad/kalkulyator-terrasnoy-doski/" className="btn-primary text-sm no-underline">Лаги и крепёж →</Link><SaveToProjectButton calcId="instrument-raskladka-terrasnoy-doski" calcTitle="Раскладка террасной доски" slug="kalkulyator-terrasnoy-doski" categorySlug="fasad" materials={materials} /></div></div>
  </div>;
}

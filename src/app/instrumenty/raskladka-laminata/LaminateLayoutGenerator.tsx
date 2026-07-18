"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useCallback } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import ToolSectionNav from "@/components/tools/ToolSectionNav";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import {
  trackToolExport,
  trackToolPresetSelect,
  trackToolRelatedClick,
} from "@/lib/analytics";
import {
  calculateLaminateLayout,
  LAMINATE_MODE_OPTIONS,
  LAMINATE_SIZE_PRESETS,
  ROOM_SIZE_PRESETS,
  type LaminateMode,
  type LaminateLayoutResult,
} from "@/lib/tools/laminate-layout";
import { calcHref } from "@/lib/tools/config";

// ── SVG scene ────────────────────────────────────────────────────────────────

function laminateModeLabel(mode: LaminateMode): string {
  return LAMINATE_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? "Раскладка";
}

function LaminateDimensions({ width, height, surfaceW, surfaceH }: { width: number; height: number; surfaceW: number; surfaceH: number }) {
  return (
    <g fill="#475569" stroke="#64748b" strokeWidth="0.7">
      <line x1="0" y1="-12" x2={width} y2="-12" />
      <line x1="0" y1="-16" x2="0" y2="-8" />
      <line x1={width} y1="-16" x2={width} y2="-8" />
      <rect x={width * 0.36} y="-19" width={width * 0.28} height="13" rx="5" fill="#f8fafc" stroke="none" />
      <text x={width / 2} y="-12" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="650" stroke="none">{surfaceW.toLocaleString("ru-RU")} мм</text>
      <line x1="-12" y1="0" x2="-12" y2={height} />
      <line x1="-16" y1="0" x2="-8" y2="0" />
      <line x1="-16" y1={height} x2="-8" y2={height} />
      <text x="-22" y={height / 2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 -22 ${height / 2})`} fontSize="8" fontWeight="650" stroke="none">{surfaceH.toLocaleString("ru-RU")} мм</text>
    </g>
  );
}

function LaminateSceneBase({ width, height, result }: { width: number; height: number; result: LaminateLayoutResult }) {
  return (
    <>
      <rect x="-34" y="-52" width={width + 68} height={height + 84} rx="12" fill="url(#lam-scene-bg)" />
      <text x="0" y="-34" fill="#0f172a" fontSize="13" fontWeight="750">Вид пола сверху</text>
      <text x="0" y="-22" fill="#64748b" fontSize="7.5">{laminateModeLabel(result.mode)} · доска {result.boardW}×{result.boardH} мм</text>
      <LaminateDimensions width={width} height={height} surfaceW={result.surfaceW} surfaceH={result.surfaceH} />
      <rect x="-8" y="-8" width={width + 16} height={height + 16} rx="10" fill="#c7b8a2" stroke="#927e63" strokeWidth="1" filter="url(#lam-room-shadow)" />
      <rect width={width} height={height} fill="#8b7356" stroke="#594a38" strokeWidth="1.4" />
    </>
  );
}

// ── Deck SVG (прямые ряды со смещением) ─────────────────────────────────────

function DeckSVG({ result }: { result: LaminateLayoutResult }) {
  const rows = result.rows;
  if (!rows) return null;
  const scale = Math.min(600 / Math.max(result.surfaceW, 1), 450 / Math.max(result.surfaceH, 1), 1);
  const svgW = result.surfaceW * scale;
  const svgH = result.surfaceH * scale;
  const padX = 34;
  const padTop = 52;
  const padBottom = 32;
  const clipId = "laminate-deck-surface-clip";

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label={`Ламинат в комнате: ${laminateModeLabel(result.mode).toLowerCase()}`}
    >
      <defs>
        <linearGradient id="lam-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="1" stopColor="#f5eadb" /></linearGradient>
        <linearGradient id="lam-wood-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c99452" /><stop offset="0.45" stopColor="#e5bc7a" /><stop offset="1" stopColor="#ad7439" /></linearGradient>
        <linearGradient id="lam-wood-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a96e36" /><stop offset="0.55" stopColor="#d9a866" /><stop offset="1" stopColor="#8d572d" /></linearGradient>
        <linearGradient id="lam-wood-c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d6a766" /><stop offset="0.5" stopColor="#f0ce92" /><stop offset="1" stopColor="#b57c40" /></linearGradient>
        <pattern id="lam-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#9a3412" strokeWidth="1.2" opacity="0.55" /></pattern>
        <clipPath id={clipId}><rect width={svgW} height={svgH} /></clipPath>
        <filter id="lam-room-shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.22" /></filter>
      </defs>
      <LaminateSceneBase width={svgW} height={svgH} result={result} />
      <g clipPath={`url(#${clipId})`}>
        {rows.flatMap((row, ri) =>
          row.map((board, ci) => {
            const x = board.x * scale + 0.45;
            const y = board.y * scale + 0.45;
            const width = Math.max(board.widthMm * scale - 0.9, 0.45);
            const height = Math.max(board.heightMm * scale - 0.9, 0.45);
            return (
              <g key={`${ri}-${ci}`}>
                <rect x={x} y={y} width={width} height={height} rx="1.1" fill={`url(#lam-wood-${["a", "b", "c"][(ri + ci) % 3]})`} stroke={board.type === "cut" ? "#9a3412" : "#6b4423"} strokeWidth={board.type === "cut" ? 0.9 : 0.42} />
                <path d={`M ${x + width * 0.12} ${y + height * 0.36} C ${x + width * 0.34} ${y + height * 0.14}, ${x + width * 0.6} ${y + height * 0.7}, ${x + width * 0.9} ${y + height * 0.38}`} fill="none" stroke="#6b4423" strokeWidth="0.35" opacity="0.38" />
                {board.type === "cut" && <rect x={x} y={y} width={width} height={height} rx="1.1" fill="url(#lam-cut-hatch)" />}
                {board.type === "cut" && width > 42 && height > 14 && <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fill="#7c2d12" fontSize="6.2" fontWeight="750">{Math.round(board.widthMm)} мм</text>}
              </g>
            );
          }),
        )}
      </g>
      <g transform={`translate(${Math.max(8, svgW - 96)} ${svgH + 18})`}><line x1="0" y1="0" x2="70" y2="0" stroke="#92400e" strokeWidth="1.2" /><path d="M 70 0 l -6 -3 v 6 z" fill="#92400e" /><text x="35" y="10" textAnchor="middle" fill="#64748b" fontSize="6.5">длинная сторона</text></g>
    </svg>
  );
}

// ── Herringbone SVG (доски под ±45°) ────────────────────────────────────────

function HerringboneSVG({ result }: { result: LaminateLayoutResult }) {
  const boards = result.herringbone;
  if (!boards) return null;
  const scale = Math.min(600 / Math.max(result.surfaceW, 1), 450 / Math.max(result.surfaceH, 1), 1);
  const svgW = result.surfaceW * scale;
  const svgH = result.surfaceH * scale;
  const clipId = "laminate-herringbone-surface-clip";
  const padX = 34;
  const padTop = 52;
  const padBottom = 32;
  const patternStep = Math.max(42, Math.min(170, result.boardW * scale / Math.SQRT2));
  const edgeBand = Math.max(8, Math.min(patternStep * 0.18, Math.min(svgW, svgH) * 0.12));

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label="Ламинат в комнате: ёлочка под 45 градусов"
    >
      <defs>
        <linearGradient id="lam-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="1" stopColor="#f5eadb" /></linearGradient>
        <linearGradient id="lam-herr-wood-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#bd8142" /><stop offset="0.5" stopColor="#e7bd79" /><stop offset="1" stopColor="#96602f" /></linearGradient>
        <linearGradient id="lam-herr-wood-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d5a15d" /><stop offset="0.55" stopColor="#f0cf94" /><stop offset="1" stopColor="#aa7037" /></linearGradient>
        <pattern id="lam-herr-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#9a3412" strokeWidth="1.2" opacity="0.55" /></pattern>
        <pattern id="lam-herr-floor-pattern" width={patternStep * 2} height={patternStep * 2} patternUnits="userSpaceOnUse">
          <rect width={patternStep * 2} height={patternStep * 2} fill="url(#lam-herr-wood-a)" />
          <path d={`M 0 ${patternStep} L ${patternStep} 0 L ${patternStep * 2} ${patternStep} M 0 ${patternStep * 2} L ${patternStep} ${patternStep} L ${patternStep * 2} ${patternStep * 2}`} fill="none" stroke="#6b4423" strokeWidth="1.25" />
          <path d={`M ${patternStep * 0.25} ${patternStep * 0.75} l ${patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 0.68} ${patternStep * 0.32} l ${patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 1.15} ${patternStep * 0.15} l ${-patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 1.58} ${patternStep * 0.58} l ${-patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 0.25} ${patternStep * 1.75} l ${patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 1.58} ${patternStep * 1.58} l ${-patternStep * 0.18} ${patternStep * 0.18}`} fill="none" stroke="#7c4a24" strokeWidth="0.75" opacity="0.75" />
          <path d={`M 0 ${patternStep * 0.9} C ${patternStep * 0.38} ${patternStep * 0.7}, ${patternStep * 0.6} ${patternStep * 0.35}, ${patternStep} ${patternStep * 0.1} M ${patternStep} ${patternStep * 0.1} C ${patternStep * 1.35} ${patternStep * 0.38}, ${patternStep * 1.62} ${patternStep * 0.7}, ${patternStep * 2} ${patternStep * 0.9}`} fill="none" stroke="#f6d79e" strokeWidth="0.6" opacity="0.45" />
        </pattern>
        <clipPath id={clipId}><rect x={0} y={0} width={svgW} height={svgH} /></clipPath>
        <filter id="lam-room-shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.22" /></filter>
      </defs>
      <LaminateSceneBase width={svgW} height={svgH} result={result} />
      <g clipPath={`url(#${clipId})`}>
        <rect width={svgW} height={svgH} fill="url(#lam-herr-floor-pattern)" />
        <path d={`M 0 0 H ${svgW} V ${svgH} H 0 Z M ${edgeBand} ${edgeBand} V ${svgH - edgeBand} H ${svgW - edgeBand} V ${edgeBand} Z`} fill="url(#lam-herr-cut-hatch)" fillRule="evenodd" opacity="0.8" />
        <rect x={edgeBand} y={edgeBand} width={Math.max(0, svgW - edgeBand * 2)} height={Math.max(0, svgH - edgeBand * 2)} fill="none" stroke="#9a3412" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.7" />
      </g>
    </svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function LaminateLayoutGenerator() {
  const [surfaceW, setSurfaceW] = useState(3000);
  const [surfaceH, setSurfaceH] = useState(4000);
  const [boardW, setBoardW] = useState(1285);
  const [boardH, setBoardH] = useState(192);
  const [mode, setMode] = useState<LaminateMode>("deck-third");
  const svgRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { hasStarted, markStarted, selectMode } = useToolAnalytics(
    "raskladka-laminata",
    resultRef,
  );

  const scrollTo = useCallback((ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const result = useMemo(
    () => calculateLaminateLayout(surfaceW, surfaceH, boardW, boardH, mode),
    [surfaceW, surfaceH, boardW, boardH, mode],
  );

  const surfaceAreaM2 = useMemo(
    () => Math.round(((surfaceW * surfaceH) / 1_000_000) * 100) / 100,
    [surfaceW, surfaceH],
  );

  const handleExportPNG = useCallback(() => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    trackToolExport("raskladka-laminata", "png");
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = "#fffbeb";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = "laminate-layout.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
  }, []);

  const layoutMaterials = useMemo(
    () => [
      { name: "Ламинат к закупке (с запасом)", quantity: result.purchaseBoards, unit: "шт", category: "Ламинат" },
      { name: "Площадь пола", quantity: surfaceAreaM2, unit: "м²", category: "Ламинат" },
    ],
    [result.purchaseBoards, surfaceAreaM2],
  );

  const laminatCalcHref = calcHref({ slug: "laminat", categorySlug: "poly" });

  return (
    <div className="max-w-3xl space-y-6">
      <RenovationHubStrip scenarioId="room" compact />
      <div ref={parametersRef} className="card scroll-mt-24 p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Параметры раскладки</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Схема и итог обновляются сразу после изменения значения.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {surfaceAreaM2} м²
          </span>
        </div>
        {/* Размер помещения */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">1</span>
            Размер помещения
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:max-w-sm">
            <input aria-label="Ширина помещения в миллиметрах" type="number" inputMode="numeric" min={300} max={30000} value={surfaceW} onChange={(e) => { markStarted("surface_size"); setSurfaceW(Number(e.target.value) || 300); }} className="input-field min-w-0 w-full" />
            <span className="text-slate-400">×</span>
            <input aria-label="Длина помещения в миллиметрах" type="number" inputMode="numeric" min={300} max={30000} value={surfaceH} onChange={(e) => { markStarted("surface_size"); setSurfaceH(Number(e.target.value) || 300); }} className="input-field min-w-0 w-full" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {ROOM_SIZE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                aria-pressed={surfaceW === p.w && surfaceH === p.h}
                onClick={() => { markStarted("preset"); trackToolPresetSelect("raskladka-laminata", "surface", p.label); setSurfaceW(p.w); setSurfaceH(p.h); }}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  surfaceW === p.w && surfaceH === p.h
                    ? "border-accent-300 bg-accent-50 text-accent-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Размер доски */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">2</span>
            Размер доски (длина × ширина)
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:max-w-sm">
            <input aria-label="Длина доски в миллиметрах" type="number" inputMode="numeric" min={100} max={3000} value={boardW} onChange={(e) => { markStarted("material_size"); setBoardW(Number(e.target.value) || 100); }} className="input-field min-w-0 w-full" />
            <span className="text-slate-400">×</span>
            <input aria-label="Ширина доски в миллиметрах" type="number" inputMode="numeric" min={40} max={500} value={boardH} onChange={(e) => { markStarted("material_size"); setBoardH(Number(e.target.value) || 40); }} className="input-field min-w-0 w-full" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {LAMINATE_SIZE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                aria-pressed={boardW === p.w && boardH === p.h}
                onClick={() => { markStarted("preset"); trackToolPresetSelect("raskladka-laminata", "material", p.label); setBoardW(p.w); setBoardH(p.h); }}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  boardW === p.w && boardH === p.h
                    ? "border-accent-300 bg-accent-50 text-accent-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Способ укладки */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">3</span>
            Способ укладки
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LAMINATE_MODE_OPTIONS.map((m) => (
              <button
                type="button"
                key={m.value}
                aria-pressed={mode === m.value}
                onClick={() => { selectMode(m.value); setMode(m.value); }}
                className={`text-left p-3 rounded-xl border transition-all ${
                  mode === m.value
                    ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.label}</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ToolSectionNav
        visible={hasStarted}
        onParameters={() => scrollTo(parametersRef)}
        onLayout={() => scrollTo(layoutRef)}
        onResult={() => scrollTo(resultRef)}
      />

      {/* Визуализация */}
      <div ref={layoutRef} className="card scroll-mt-24 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Как ламинат ляжет в комнате</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Видны рисунок пола, смещение рядов, направление досок и подрезки.</p></div>
          <button
            type="button"
            onClick={handleExportPNG}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-accent-300 hover:text-accent-700 transition-colors"
          >
            Скачать PNG
          </button>
        </div>

        <div ref={svgRef}>
          {result.herringbone ? <HerringboneSVG result={result} /> : <DeckSVG result={result} />}
        </div>

        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3 dark:bg-slate-900 dark:text-slate-300">
          {mode === "herringbone" ? (
            <>
              <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-amber-900 bg-gradient-to-r from-amber-700 via-amber-300 to-amber-800" /><span>Рисунок ёлочки</span></div>
              <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-orange-800 bg-[repeating-linear-gradient(45deg,#fed7aa,#fed7aa_3px,#c2410c_3px,#c2410c_4px)]" /><span>Периметр подрезки</span></div>
              <div className="text-slate-500">Схема показывает направление; закупка считается по площади с запасом 12%.</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-amber-900 bg-gradient-to-r from-amber-700 via-amber-300 to-amber-800" /><span>{`Целая доска (${result.wholeBoards} шт)`}</span></div>
              {result.cutBoards > 0 && <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-orange-800 bg-[repeating-linear-gradient(45deg,#fed7aa,#fed7aa_3px,#c2410c_3px,#c2410c_4px)]" /><span>{`С подрезкой (${result.cutBoards} шт)`}</span></div>}
              <div className="flex items-center gap-1.5"><span className="relative h-4 w-8 after:absolute after:left-0 after:top-1/2 after:h-0.5 after:w-7 after:bg-amber-800 after:content-['']" /><span>Направление длинной стороны</span></div>
            </>
          )}
        </div>
      </div>

      {/* Результат */}
      <div ref={resultRef} className="card scroll-mt-24 p-5">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Результат
        </h3>
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">К закупке с запасом</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-3xl font-bold text-slate-950 dark:text-white">{result.purchaseBoards} шт</p>
            <p className="pb-1 text-xs text-slate-600 dark:text-slate-300">
              {result.basePurchaseBoards} на схему + {result.purchaseReserveBoards} запас
            </p>
          </div>
        </div>
        {mode === "herringbone" ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.basePurchaseBoards}</p><p className="text-xs text-slate-500">По чистой площади</p></div><div><p className="text-2xl font-bold text-amber-700 dark:text-amber-500">{result.purchaseReserveBoards}</p><p className="text-xs text-slate-500">Запас на ёлочку</p></div><div><p className="text-2xl font-bold text-amber-600">12%</p><p className="text-xs text-slate-500">Запас на подрезку</p></div><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{surfaceAreaM2}</p><p className="text-xs text-slate-500">Площадь пола, м²</p></div></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.totalBoards}</p><p className="text-xs text-slate-500">Элементов по схеме</p></div><div><p className="text-2xl font-bold text-amber-700 dark:text-amber-500">{result.wholeBoards}</p><p className="text-xs text-slate-500">Целых по схеме</p></div><div><p className="text-2xl font-bold text-amber-600">{result.cutBoards}</p><p className="text-xs text-slate-500">С подрезкой</p></div><div><p className="text-2xl font-bold text-red-500">{result.wastePercent.toFixed(1)}%</p><p className="text-xs text-slate-500">Отход материала</p></div></div>}

        {result.notes.length > 0 && (
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4 mt-4">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Перенесём в калькулятор: {surfaceAreaM2} м² пола — посчитаем упаковки ламината, подложку и плинтус с запасом.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={laminatCalcHref} onClick={() => trackToolRelatedClick("raskladka-laminata", "laminat-calculator")} className="btn-primary inline-flex text-sm no-underline">
              Упаковки, подложка, плинтус →
            </Link>
            <SaveToProjectButton
              calcId="instrument-raskladka-laminata"
              calcTitle="Раскладка ламината"
              slug="laminat"
              categorySlug="poly"
              materials={layoutMaterials}
              calendarScenarioId="room"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

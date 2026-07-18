"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  calculateTileLayout,
  computeLayoutSvgBoundsMm,
  LAYOUT_MODE_OPTIONS,
  SURFACE_SIZE_PRESETS,
  TILE_SIZE_PRESETS,
  type LayoutMode,
  type TileLayoutResult,
} from "@/lib/tools/tile-layout";
import {
  buildPlitkaCalculatorHref,
  parseTileLayoutFromSearchParams,
} from "@/lib/tools/tile-layout-to-calc";

// ── SVG Renderer ─────────────────────────────────────────────────────────────

type TileSurfaceView = "wall" | "floor";

function tileModeLabel(mode: LayoutMode): string {
  return LAYOUT_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? "Раскладка";
}

function TileSceneContext({ width, height, surfaceView }: { width: number; height: number; surfaceView: TileSurfaceView }) {
  const padX = 34;
  const padBottom = surfaceView === "wall" ? 50 : 30;
  return surfaceView === "wall" ? (
    <>
      <polygon points={`${-padX},0 0,4 0,${height} ${-padX},${height + padBottom * 0.55}`} fill="#dce7e6" />
      <polygon points={`${width},4 ${width + padX},0 ${width + padX},${height + padBottom * 0.55} ${width},${height}`} fill="#d2dfde" />
      <polygon points={`${-padX},${height + padBottom * 0.55} 0,${height} ${width},${height} ${width + padX},${height + padBottom * 0.55}`} fill="#b9ad9b" />
      <rect y={height - 3} width={width} height="3" fill="#eee7dd" stroke="#9b8e7c" strokeWidth="0.6" />
    </>
  ) : (
    <rect x="-8" y="-8" width={width + 16} height={height + 16} rx="10" fill="#cbd5d1" stroke="#94a3a0" strokeWidth="1" />
  );
}

function TileDimensions({ width, height, surfaceW, surfaceH }: { width: number; height: number; surfaceW: number; surfaceH: number }) {
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

function TileLayoutSVG({ result, groutMm, surfaceView, surfaceW, surfaceH }: { result: TileLayoutResult; groutMm: number; surfaceView: TileSurfaceView; surfaceW: number; surfaceH: number }) {
  const bounds = computeLayoutSvgBoundsMm(result.tileGrid, groutMm);
  const scale = Math.min(
    600 / Math.max(bounds.widthMm, 1),
    400 / Math.max(bounds.heightMm, 1),
    1,
  );

  const svgW = bounds.widthMm * scale;
  const svgH = bounds.heightMm * scale;

  let yOffset = 0;
  const padX = 34;
  const padTop = 48;
  const padBottom = surfaceView === "wall" ? 50 : 30;
  const clipId = "tile-straight-surface-clip";

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label={`${surfaceView === "wall" ? "Плитка на стене" : "Плитка на полу"}: ${tileModeLabel(result.mode).toLowerCase()}`}
    >
      <defs>
        <linearGradient id="tile-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="1" stopColor="#e7f3f1" /></linearGradient>
        <linearGradient id="tile-stone-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdfcf8" /><stop offset="0.55" stopColor="#e9e5dd" /><stop offset="1" stopColor="#d8d2c8" /></linearGradient>
        <linearGradient id="tile-stone-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7faf9" /><stop offset="1" stopColor="#d6e1df" /></linearGradient>
        <pattern id="tile-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#b45309" strokeWidth="1.3" opacity="0.45" /></pattern>
        <pattern id="tile-corner-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#be123c" strokeWidth="1.4" opacity="0.5" /></pattern>
        <clipPath id={clipId}><rect width={svgW} height={svgH} /></clipPath>
        <filter id="tile-surface-shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.2" /></filter>
      </defs>
      <rect x={-padX} y={-padTop} width={svgW + padX * 2} height={svgH + padTop + padBottom} rx="12" fill="url(#tile-scene-bg)" />
      <text x="0" y="-31" fill="#0f172a" fontSize="13" fontWeight="750">{surfaceView === "wall" ? "Вид стены" : "Вид пола сверху"}</text>
      <text x="0" y="-20" fill="#64748b" fontSize="7.5">{tileModeLabel(result.mode)} · шов {groutMm.toLocaleString("ru-RU")} мм</text>
      <TileDimensions width={svgW} height={svgH} surfaceW={surfaceW} surfaceH={surfaceH} />
      <TileSceneContext width={svgW} height={svgH} surfaceView={surfaceView} />
      <rect width={svgW} height={svgH} fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" filter="url(#tile-surface-shadow)" />
      <g clipPath={`url(#${clipId})`}>
        {result.tileGrid.map((row, ri) => {
          let xOffset = 0;
          const rowH = (row[0].heightMm + groutMm) * scale;
          const rowElements = row.map((cell, ci) => {
            const cellW = cell.widthMm * scale;
            const cellH = cell.heightMm * scale;
            const gapS = Math.max(groutMm * scale, 0.6);
            const x = xOffset + gapS / 2;
            const y = yOffset + gapS / 2;
            const cut = cell.type !== "whole";
            xOffset += (cell.widthMm + groutMm) * scale;

            return (
              <g key={`${ri}-${ci}`}>
                <rect x={x} y={y} width={Math.max(cellW - gapS, 0.4)} height={Math.max(cellH - gapS, 0.4)} rx="1.4" fill={(ri + ci) % 2 === 0 ? "url(#tile-stone-a)" : "url(#tile-stone-b)"} stroke={cell.type === "corner" ? "#be123c" : cut ? "#b45309" : "#64748b"} strokeWidth={cut ? 1.1 : 0.45} />
                {cut && <rect x={x} y={y} width={Math.max(cellW - gapS, 0.4)} height={Math.max(cellH - gapS, 0.4)} rx="1.4" fill={cell.type === "corner" ? "url(#tile-corner-hatch)" : "url(#tile-cut-hatch)"} />}
                {cut && cellW > 34 && cellH > 20 && <text x={x + (cellW - gapS) / 2} y={y + (cellH - gapS) / 2} textAnchor="middle" dominantBaseline="middle" fill={cell.type === "corner" ? "#9f1239" : "#92400e"} fontSize="6.5" fontWeight="750">{Math.round(cell.widthMm)}×{Math.round(cell.heightMm)}</text>}
              </g>
            );
          });
          yOffset += rowH;
          return <g key={ri}>{rowElements}</g>;
        })}
      </g>
    </svg>
  );
}

// ── Diagonal SVG Renderer ──────────────────────────────────────────────────

function DiagonalLayoutSVG({ result, surfaceView }: { result: TileLayoutResult; surfaceView: TileSurfaceView }) {
  const d = result.diagonal;
  if (!d) return null;

  const scale = Math.min(600 / Math.max(d.surfaceW, 1), 400 / Math.max(d.surfaceH, 1), 1);
  const svgW = d.surfaceW * scale;
  const svgH = d.surfaceH * scale;
  const half = d.halfDiagonalMm * scale;
  const clipId = "tile-diagonal-surface-clip";
  const padX = 34;
  const padTop = 48;
  const padBottom = surfaceView === "wall" ? 50 : 30;

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label={`${surfaceView === "wall" ? "Диагональная плитка на стене" : "Диагональная плитка на полу"} под 45 градусов`}
    >
      <defs>
        <linearGradient id="tile-diag-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="1" stopColor="#e7f3f1" /></linearGradient>
        <linearGradient id="tile-diag-stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffdf7" /><stop offset="0.6" stopColor="#e8e3da" /><stop offset="1" stopColor="#d4cec3" /></linearGradient>
        <pattern id="tile-diag-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#b45309" strokeWidth="1.3" opacity="0.5" /></pattern>
        <clipPath id={clipId}><rect x={0} y={0} width={svgW} height={svgH} /></clipPath>
        <filter id="tile-diag-shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.2" /></filter>
      </defs>
      <rect x={-padX} y={-padTop} width={svgW + padX * 2} height={svgH + padTop + padBottom} rx="12" fill="url(#tile-diag-scene-bg)" />
      <text x="0" y="-31" fill="#0f172a" fontSize="13" fontWeight="750">{surfaceView === "wall" ? "Вид стены" : "Вид пола сверху"}</text>
      <text x="0" y="-20" fill="#64748b" fontSize="7.5">Диагональная раскладка · 45°</text>
      <TileDimensions width={svgW} height={svgH} surfaceW={Math.round(d.surfaceW)} surfaceH={Math.round(d.surfaceH)} />
      <TileSceneContext width={svgW} height={svgH} surfaceView={surfaceView} />
      <rect width={svgW} height={svgH} fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" filter="url(#tile-diag-shadow)" />
      <g clipPath={`url(#${clipId})`}>
        {d.cells.map((cell, i) => {
          const cx = cell.cx * scale;
          const cy = cell.cy * scale;
          // Ромб = квадрат, повёрнутый на 45°: 4 вершины по осям.
          const pts = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
          return (
            <g key={i}>
              <polygon
                points={pts}
                fill="url(#tile-diag-stone)"
                stroke={cell.type === "edge" ? "#b45309" : "#64748b"}
                strokeWidth={cell.type === "edge" ? 1.1 : Math.max(half * 0.012, 0.45)}
              />
              {cell.type === "edge" && <polygon points={pts} fill="url(#tile-diag-cut-hatch)" />}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function TileLayoutGenerator() {
  const searchParams = useSearchParams();
  const [surfaceW, setSurfaceW] = useState(1700);
  const [surfaceH, setSurfaceH] = useState(2500);
  const [tileW, setTileW] = useState(300);
  const [tileH, setTileH] = useState(600);
  const [groutMm, setGroutMm] = useState(2);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("straight");
  const [surfaceView, setSurfaceView] = useState<TileSurfaceView>("wall");
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { hasStarted, markStarted, selectMode } = useToolAnalytics(
    "raskladka-plitki",
    resultRef,
  );

  const scrollTo = useCallback((ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const parsed = parseTileLayoutFromSearchParams(searchParams);
    if (!parsed?.surfaceW || !parsed.surfaceH) return;
    setSurfaceW(parsed.surfaceW);
    setSurfaceH(parsed.surfaceH);
    if (parsed.tileW) setTileW(parsed.tileW);
    if (parsed.tileH) setTileH(parsed.tileH);
    if (parsed.groutMm) setGroutMm(parsed.groutMm);
    if (parsed.layoutMode) setLayoutMode(parsed.layoutMode);
  }, [searchParams]);

  const handleExportPNG = useCallback(() => {
    const svgEl = svgContainerRef.current?.querySelector("svg");
    if (!svgEl) return;
    trackToolExport("raskladka-plitki", "png");
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = "tile-layout.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
  }, []);

  const result = useMemo(
    () => calculateTileLayout(surfaceW, surfaceH, tileW, tileH, groutMm, layoutMode),
    [surfaceW, surfaceH, tileW, tileH, groutMm, layoutMode],
  );

  const plitkaCalcHref = useMemo(
    () =>
      buildPlitkaCalculatorHref(
        {
          surfaceW,
          surfaceH,
          tileW,
          tileH,
          groutMm,
          layoutMode,
        },
        { tilesTotal: result.purchaseTiles },
      ),
    [surfaceW, surfaceH, tileW, tileH, groutMm, layoutMode, result.purchaseTiles],
  );

  const surfaceAreaM2 = useMemo(
    () => Math.round(((surfaceW * surfaceH) / 1_000_000) * 100) / 100,
    [surfaceW, surfaceH],
  );

  const layoutMaterials = useMemo(
    () => [
      {
        name: "Плитка к закупке (с запасом)",
        quantity: result.purchaseTiles,
        unit: "шт",
        category: "Плитка",
      },
      {
        name: "Площадь поверхности",
        quantity: surfaceAreaM2,
        unit: "м²",
        category: "Плитка",
      },
    ],
    [result.purchaseTiles, surfaceAreaM2],
  );

  return (
    <div className="max-w-3xl space-y-6">
      <RenovationHubStrip scenarioId="bathroom" showTileLayout compact />
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
        {/* Surface size */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">1</span>
            Размер поверхности
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:max-w-sm">
            <input aria-label="Ширина поверхности в миллиметрах" type="number" inputMode="numeric" min={100} max={20000} value={surfaceW} onChange={(e) => { markStarted("surface_size"); setSurfaceW(Number(e.target.value) || 100); }} className="input-field min-w-0 w-full" />
            <span className="text-slate-400">×</span>
            <input aria-label="Высота поверхности в миллиметрах" type="number" inputMode="numeric" min={100} max={20000} value={surfaceH} onChange={(e) => { markStarted("surface_size"); setSurfaceH(Number(e.target.value) || 100); }} className="input-field min-w-0 w-full" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {SURFACE_SIZE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                aria-pressed={surfaceW === p.w && surfaceH === p.h}
                onClick={() => { markStarted("preset"); trackToolPresetSelect("raskladka-plitki", "surface", p.label); setSurfaceW(p.w); setSurfaceH(p.h); setSurfaceView(p.label.toLocaleLowerCase("ru-RU").includes("пол") ? "floor" : "wall"); }}
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

        {/* Tile size */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">2</span>
            Размер плитки
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:max-w-sm">
            <input aria-label="Ширина плитки в миллиметрах" type="number" inputMode="numeric" min={10} max={2000} value={tileW} onChange={(e) => { markStarted("material_size"); setTileW(Number(e.target.value) || 10); }} className="input-field min-w-0 w-full" />
            <span className="text-slate-400">×</span>
            <input aria-label="Высота плитки в миллиметрах" type="number" inputMode="numeric" min={10} max={2000} value={tileH} onChange={(e) => { markStarted("material_size"); setTileH(Number(e.target.value) || 10); }} className="input-field min-w-0 w-full" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {TILE_SIZE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                aria-pressed={tileW === p.w && tileH === p.h}
                onClick={() => { markStarted("preset"); trackToolPresetSelect("raskladka-plitki", "material", p.label); setTileW(p.w); setTileH(p.h); }}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  tileW === p.w && tileH === p.h
                    ? "border-accent-300 bg-accent-50 text-accent-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout mode */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">3</span>
            Способ укладки
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LAYOUT_MODE_OPTIONS.map((m) => (
              <button
                type="button"
                key={m.value}
                aria-pressed={layoutMode === m.value}
                onClick={() => { selectMode(m.value); setLayoutMode(m.value); }}
                className={`text-left p-3 rounded-xl border transition-all ${
                  layoutMode === m.value
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

        {/* Grout */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">4</span>
            Ширина шва: {groutMm} мм
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={groutMm}
            onChange={(e) => { markStarted("joint_width"); setGroutMm(Number(e.target.value)); }}
            className="w-full accent-accent-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0 мм</span>
            <span>10 мм</span>
          </div>
        </div>
      </div>

      <ToolSectionNav
        visible={hasStarted}
        onParameters={() => scrollTo(parametersRef)}
        onLayout={() => scrollTo(layoutRef)}
        onResult={() => scrollTo(resultRef)}
      />

      {/* Visual layout */}
      <div ref={layoutRef} className="card scroll-mt-24 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Как плитка ляжет на поверхность</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Видны швы, краевые доборы и размеры подрезки.</p></div>
          <button
            type="button"
            onClick={handleExportPNG}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-accent-300 hover:text-accent-700 transition-colors"
          >
            Скачать PNG
          </button>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Вид поверхности">
          {(["wall", "floor"] as const).map((value) => <button type="button" key={value} aria-pressed={surfaceView === value} onClick={() => setSurfaceView(value)} className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${surfaceView === value ? "bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300" : "text-slate-500"}`}>{value === "wall" ? "Стена" : "Пол"}</button>)}
        </div>

        <div ref={svgContainerRef}>
          {result.diagonal ? (
            <DiagonalLayoutSVG result={result} surfaceView={surfaceView} />
          ) : (
            <TileLayoutSVG result={result} groutMm={groutMm} surfaceView={surfaceView} surfaceW={surfaceW} surfaceH={surfaceH} />
          )}
        </div>

        {/* Legend */}
        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3 dark:bg-slate-900 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="size-5 rounded border border-slate-500 bg-gradient-to-br from-stone-50 to-stone-300" />
            Целая плитка ({result.wholeTiles} шт)
          </div>
          {result.cutTiles > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-5 rounded border border-amber-700 bg-[repeating-linear-gradient(45deg,#fef3c7,#fef3c7_3px,#f59e0b_3px,#f59e0b_4px)]" />
              {result.diagonal ? "Краевой добор" : "Подрезка"} ({result.cutTiles} шт)
            </div>
          )}
          {result.tileGrid.some((row) => row.some((c) => c.type === "corner")) && (
            <div className="flex items-center gap-1.5">
              <span className="size-5 rounded border border-rose-700 bg-rose-100" />
              Угловая подрезка
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div ref={resultRef} className="card scroll-mt-24 p-5">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Результат
        </h3>
        <div className="mb-5 rounded-xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-800/60 dark:bg-accent-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-300">
            {result.purchaseReserveTiles > 0 ? "К закупке с запасом" : "Минимум для этой раскладки"}
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-3xl font-bold text-slate-950 dark:text-white">{result.purchaseTiles} шт</p>
            <p className="pb-1 text-xs text-slate-600 dark:text-slate-300">
              {result.purchaseReserveTiles > 0
                ? `${result.basePurchaseTiles} на схему + ${result.purchaseReserveTiles} запас`
                : "с повторным использованием подходящих подрезок"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.totalTiles}</p>
            <p className="text-xs text-slate-500">Плиток по схеме</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{result.wholeTiles}</p>
            <p className="text-xs text-slate-500">Целых</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{result.cutTiles}</p>
            <p className="text-xs text-slate-500">С подрезкой</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{result.wastePercent.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">Отход материала</p>
          </div>
        </div>

        {result.notes.length > 0 && (
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4 mt-3">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {result.cutRight > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            Подрезка справа: {result.cutRight} мм ({(result.cutRight / tileW * 100).toFixed(0)}% от плитки)
          </p>
        )}
        {result.cutBottom > 0 && (
          <p className="text-xs text-slate-400">
            Подрезка снизу: {result.cutBottom} мм ({(result.cutBottom / tileH * 100).toFixed(0)}% от плитки)
          </p>
        )}

        {(result.cutRight > 0 && result.cutRight < tileW * 0.3) && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 mt-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Подрезка справа меньше 30% плитки ({result.cutRight} мм). Сместите стартовую линию от центра — подрезка слева и справа станет симметричнее.
            </p>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Перенесём в калькулятор: {surfaceAreaM2} м², плитка {tileW}×{tileH} мм, шов {groutMm} мм и схему укладки —
            сразу посчитаем клей, затирку и упаковки.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={plitkaCalcHref} onClick={() => trackToolRelatedClick("raskladka-plitki", "plitka-calculator")} className="btn-primary inline-flex text-sm no-underline">
              Клей, затирка и упаковки →
            </Link>
            <SaveToProjectButton
              calcId="instrument-raskladka-plitki"
              calcTitle="Раскладка плитки"
              slug="plitka"
              categorySlug="poly"
              materials={layoutMaterials}
              calendarScenarioId="bathroom"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

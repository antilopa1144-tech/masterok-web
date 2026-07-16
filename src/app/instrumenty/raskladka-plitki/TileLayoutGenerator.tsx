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

function TileLayoutSVG({ result, groutMm }: { result: TileLayoutResult; groutMm: number }) {
  const bounds = computeLayoutSvgBoundsMm(result.tileGrid, groutMm);
  const scale = Math.min(
    600 / Math.max(bounds.widthMm, 1),
    400 / Math.max(bounds.heightMm, 1),
    1,
  );

  const svgW = bounds.widthMm * scale;
  const svgH = bounds.heightMm * scale;

  const COLORS = {
    whole: "#3B82F6",
    cut: "#F59E0B",
    corner: "#EF4444",
    grout: "#E2E8F0",
  };

  let yOffset = 0;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-[600px] border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800"
      style={{ aspectRatio: `${svgW} / ${svgH}` }}
      role="img"
      aria-label="Схема раскладки плитки"
    >
      {result.tileGrid.map((row, ri) => {
        let xOffset = 0;
        const rowH = (row[0].heightMm + groutMm) * scale;
        const rowElements = row.map((cell, ci) => {
          const cellW = cell.widthMm * scale;
          const cellH = cell.heightMm * scale;
          const gapS = groutMm * scale;
          const x = xOffset + gapS / 2;
          const y = yOffset + gapS / 2;
          xOffset += (cell.widthMm + groutMm) * scale;

          return (
            <rect
              key={`${ri}-${ci}`}
              x={x}
              y={y}
              width={cellW}
              height={cellH}
              rx={1}
              fill={COLORS[cell.type]}
              opacity={0.85}
            />
          );
        });
        yOffset += rowH;
        return <g key={ri}>{rowElements}</g>;
      })}
    </svg>
  );
}

// ── Diagonal SVG Renderer ──────────────────────────────────────────────────

function DiagonalLayoutSVG({ result }: { result: TileLayoutResult }) {
  const d = result.diagonal;
  if (!d) return null;

  const scale = Math.min(600 / Math.max(d.surfaceW, 1), 400 / Math.max(d.surfaceH, 1), 1);
  const svgW = d.surfaceW * scale;
  const svgH = d.surfaceH * scale;
  const half = d.halfDiagonalMm * scale;
  const clipId = "diag-clip";

  const COLORS = { whole: "#3B82F6", edge: "#F59E0B" };

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-[600px] border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800"
      style={{ aspectRatio: `${svgW} / ${svgH}` }}
      role="img"
      aria-label="Схема диагональной раскладки плитки под 45°"
    >
      {/* Клип по границам поверхности — краевые ромбы обрезаются ровно по стене. */}
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={svgW} height={svgH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {d.cells.map((cell, i) => {
          const cx = cell.cx * scale;
          const cy = cell.cy * scale;
          // Ромб = квадрат, повёрнутый на 45°: 4 вершины по осям.
          const pts = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
          return (
            <polygon
              key={i}
              points={pts}
              fill={COLORS[cell.type]}
              opacity={0.85}
              stroke="#E2E8F0"
              strokeWidth={Math.max(half * 0.02, 0.5)}
            />
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
                onClick={() => { markStarted("preset"); trackToolPresetSelect("raskladka-plitki", "surface", p.label); setSurfaceW(p.w); setSurfaceH(p.h); }}
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Раскладка
            {layoutMode === "diagonal" && (
              <span className="ml-2 normal-case font-normal text-amber-600 dark:text-amber-400">
                (под 45°)
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={handleExportPNG}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-accent-300 hover:text-accent-700 transition-colors"
          >
            📥 Скачать PNG
          </button>
        </div>

        <div ref={svgContainerRef}>
          {result.diagonal ? (
            <DiagonalLayoutSVG result={result} />
          ) : (
            <TileLayoutSVG result={result} groutMm={groutMm} />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500 opacity-85" />
            Целая плитка ({result.wholeTiles} шт)
          </div>
          {result.cutTiles > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 opacity-85" />
              {result.diagonal ? "Краевой добор" : "Подрезка"} ({result.cutTiles} шт)
            </div>
          )}
          {result.tileGrid.some((row) => row.some((c) => c.type === "corner")) && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500 opacity-85" />
              Угол
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

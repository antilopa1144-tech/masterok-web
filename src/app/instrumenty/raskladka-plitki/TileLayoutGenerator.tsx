"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useCallback } from "react";
import {
  calculateTileLayout,
  computeLayoutSvgBoundsMm,
  LAYOUT_MODE_OPTIONS,
  SURFACE_SIZE_PRESETS,
  TILE_SIZE_PRESETS,
  type LayoutMode,
  type TileLayoutResult,
} from "@/lib/tools/tile-layout";

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

// ── Main Component ───────────────────────────────────────────────────────────

export default function TileLayoutGenerator() {
  const [surfaceW, setSurfaceW] = useState(1700);
  const [surfaceH, setSurfaceH] = useState(2500);
  const [tileW, setTileW] = useState(300);
  const [tileH, setTileH] = useState(600);
  const [groutMm, setGroutMm] = useState(2);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("straight");
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleExportPNG = useCallback(() => {
    const svgEl = svgContainerRef.current?.querySelector("svg");
    if (!svgEl) return;
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

  const purchaseTotal =
    result.totalTiles + (result.purchaseReserveTiles > 0 ? result.purchaseReserveTiles : 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card p-6 space-y-5">
        {/* Surface size */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Размер поверхности (мм)
          </label>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" min={100} max={20000} value={surfaceW} onChange={(e) => setSurfaceW(Number(e.target.value) || 100)} className="input-field w-28" />
            <span className="text-slate-400">×</span>
            <input type="number" inputMode="numeric" min={100} max={20000} value={surfaceH} onChange={(e) => setSurfaceH(Number(e.target.value) || 100)} className="input-field w-28" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {SURFACE_SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setSurfaceW(p.w); setSurfaceH(p.h); }}
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Размер плитки (мм)
          </label>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" min={10} max={2000} value={tileW} onChange={(e) => setTileW(Number(e.target.value) || 10)} className="input-field w-24" />
            <span className="text-slate-400">×</span>
            <input type="number" inputMode="numeric" min={10} max={2000} value={tileH} onChange={(e) => setTileH(Number(e.target.value) || 10)} className="input-field w-24" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {TILE_SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setTileW(p.w); setTileH(p.h); }}
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Способ укладки
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LAYOUT_MODE_OPTIONS.map((m) => (
              <button
                key={m.value}
                onClick={() => setLayoutMode(m.value)}
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Ширина шва: {groutMm} мм
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={groutMm}
            onChange={(e) => setGroutMm(Number(e.target.value))}
            className="w-full accent-accent-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0 мм</span>
            <span>10 мм</span>
          </div>
        </div>
      </div>

      {/* Visual layout */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Раскладка
            {layoutMode === "diagonal" && (
              <span className="ml-2 normal-case font-normal text-amber-600 dark:text-amber-400">
                (схема — прямая сетка)
              </span>
            )}
          </h3>
          <button
            onClick={handleExportPNG}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-accent-300 hover:text-accent-700 transition-colors"
          >
            📥 Скачать PNG
          </button>
        </div>

        <div ref={svgContainerRef}>
          <TileLayoutSVG result={result} groutMm={groutMm} />
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
              Подрезка ({result.cutTiles} шт)
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
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Результат
        </h3>
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

        {result.purchaseReserveTiles > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 mt-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              К закупке с запасом на диагональ: {purchaseTotal} шт
            </p>
            <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-1">
              По схеме {result.totalTiles} + {result.purchaseReserveTiles} на подрезку под 45° и бой
            </p>
          </div>
        )}

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

        <p className="text-xs text-slate-400 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
          Клей, затирка и упаковки — в{" "}
          <Link
            href="/kalkulyatory/poly/plitka/"
            className="text-accent-600 hover:text-accent-700 underline"
          >
            калькуляторе плитки
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

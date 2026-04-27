"use client";

import { useState, useMemo, useRef, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type LayoutMode = "straight" | "offset-half" | "offset-third" | "diagonal";

interface TileResult {
  wholeTiles: number;
  cutTiles: number;
  totalTiles: number;
  wastePercent: number;
  rows: number;
  cols: number;
  cutRight: number; // mm of last column cut
  cutBottom: number; // mm of last row cut
  tileGrid: TileCell[][];
  mode: LayoutMode;
}

interface TileCell {
  type: "whole" | "cut" | "corner";
  widthMm: number;
  heightMm: number;
  offsetMm?: number; // horizontal offset for staggered layouts
}

const LAYOUT_MODES: { value: LayoutMode; label: string; desc: string }[] = [
  { value: "straight", label: "Прямая", desc: "Классическая раскладка без смещения" },
  { value: "offset-half", label: "Со смещением 1/2", desc: "Кирпичная кладка, каждый ряд сдвинут на половину" },
  { value: "offset-third", label: "Со смещением 1/3", desc: "Каждый ряд сдвинут на треть плитки" },
  { value: "diagonal", label: "Диагональная", desc: "Укладка под 45°, больше подрезки" },
];

const TILE_PRESETS = [
  { label: "20×20", w: 200, h: 200 },
  { label: "30×30", w: 300, h: 300 },
  { label: "30×60", w: 300, h: 600 },
  { label: "40×40", w: 400, h: 400 },
  { label: "60×60", w: 600, h: 600 },
  { label: "60×120", w: 600, h: 1200 },
];

const SURFACE_PRESETS = [
  { label: "Ванная стена 1.7×2.5м", w: 1700, h: 2500 },
  { label: "Ванная пол 1.7×1.5м", w: 1700, h: 1500 },
  { label: "Кухня фартук 2.4×0.6м", w: 2400, h: 600 },
  { label: "Пол 3×4м", w: 3000, h: 4000 },
  { label: "Стена 4×2.7м", w: 4000, h: 2700 },
];

// ── Calculation ──────────────────────────────────────────────────────────────

function calculateLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
  mode: LayoutMode = "straight",
): TileResult {
  // Diagonal mode: multiply area by ~1.41 for waste, use straight grid as visual
  if (mode === "diagonal") {
    const straight = calculateStraightLayout(surfaceW, surfaceH, tileW, tileH, groutMm);
    const diagonalWaste = Math.min(straight.wastePercent + 15, 35); // diagonal adds ~15% waste
    const extraTiles = Math.ceil(straight.totalTiles * 0.15);
    return {
      ...straight,
      cutTiles: straight.cutTiles + extraTiles,
      totalTiles: straight.totalTiles + extraTiles,
      wastePercent: diagonalWaste,
      mode: "diagonal",
    };
  }

  // Offset modes: calculate with staggered rows
  if (mode === "offset-half" || mode === "offset-third") {
    const offsetFraction = mode === "offset-half" ? 0.5 : 1 / 3;
    return calculateOffsetLayout(surfaceW, surfaceH, tileW, tileH, groutMm, offsetFraction, mode);
  }

  return { ...calculateStraightLayout(surfaceW, surfaceH, tileW, tileH, groutMm), mode: "straight" };
}

function calculateStraightLayout(
  surfaceW: number, surfaceH: number, tileW: number, tileH: number, groutMm: number,
): TileResult {
  const stepW = tileW + groutMm;
  const stepH = tileH + groutMm;

  const wholeCols = Math.floor(surfaceW / stepW);
  const wholeRows = Math.floor(surfaceH / stepH);

  const usedW = wholeCols * stepW;
  const usedH = wholeRows * stepH;

  const remainW = surfaceW - usedW;
  const remainH = surfaceH - usedH;

  const hasRightCut = remainW > groutMm;
  const hasBottomCut = remainH > groutMm;

  const cutRight = hasRightCut ? remainW - groutMm : 0;
  const cutBottom = hasBottomCut ? remainH - groutMm : 0;

  const cols = wholeCols + (hasRightCut ? 1 : 0);
  const rows = wholeRows + (hasBottomCut ? 1 : 0);

  const grid: TileCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TileCell[] = [];
    const isLastRow = hasBottomCut && r === rows - 1;
    const cellH = isLastRow ? cutBottom : tileH;

    for (let c = 0; c < cols; c++) {
      const isLastCol = hasRightCut && c === cols - 1;
      const cellW = isLastCol ? cutRight : tileW;

      let type: TileCell["type"] = "whole";
      if (isLastRow && isLastCol) type = "corner";
      else if (isLastRow || isLastCol) type = "cut";

      row.push({ type, widthMm: cellW, heightMm: cellH });
    }
    grid.push(row);
  }

  const wholeTiles = wholeCols * wholeRows;
  const cutTilesRight = hasRightCut ? wholeRows : 0;
  const cutTilesBottom = hasBottomCut ? wholeCols : 0;
  const cornerTile = hasRightCut && hasBottomCut ? 1 : 0;
  const cutTiles = cutTilesRight + cutTilesBottom + cornerTile;
  const totalTiles = wholeTiles + cutTiles;

  const wholeArea = tileW * tileH;
  let wasteArea = 0;
  if (hasRightCut) wasteArea += cutTilesRight * (wholeArea - cutRight * tileH);
  if (hasBottomCut) wasteArea += cutTilesBottom * (wholeArea - tileW * cutBottom);
  if (cornerTile) wasteArea += wholeArea - cutRight * cutBottom;
  const wastePercent = totalTiles > 0 ? (wasteArea / (totalTiles * wholeArea)) * 100 : 0;

  return { wholeTiles, cutTiles, totalTiles, wastePercent, rows, cols, cutRight, cutBottom, tileGrid: grid, mode: "straight" };
}

function calculateOffsetLayout(
  surfaceW: number, surfaceH: number, tileW: number, tileH: number, groutMm: number,
  offsetFraction: number, mode: LayoutMode,
): TileResult {
  const stepW = tileW + groutMm;
  const stepH = tileH + groutMm;
  const offsetPx = Math.round(tileW * offsetFraction);

  const wholeRows = Math.floor(surfaceH / stepH);
  const hasBottomCut = (surfaceH - wholeRows * stepH) > groutMm;
  const cutBottom = hasBottomCut ? surfaceH - wholeRows * stepH - groutMm : 0;
  const rows = wholeRows + (hasBottomCut ? 1 : 0);

  const grid: TileCell[][] = [];
  let totalWhole = 0;
  let totalCut = 0;

  for (let r = 0; r < rows; r++) {
    const row: TileCell[] = [];
    const isLastRow = hasBottomCut && r === rows - 1;
    const cellH = isLastRow ? cutBottom : tileH;
    const rowOffset = (r % 2 === 1) ? offsetPx : 0;

    // First tile might be cut if offset
    let x = 0;
    if (rowOffset > 0) {
      const firstW = Math.min(offsetPx, surfaceW);
      row.push({ type: "cut", widthMm: firstW, heightMm: cellH, offsetMm: 0 });
      totalCut++;
      x = firstW + groutMm;
    }

    while (x < surfaceW) {
      const remaining = surfaceW - x;
      if (remaining >= tileW) {
        row.push({ type: isLastRow ? "cut" : "whole", widthMm: tileW, heightMm: cellH });
        if (isLastRow) totalCut++; else totalWhole++;
        x += stepW;
      } else if (remaining > groutMm) {
        const cutW = remaining - groutMm;
        row.push({ type: "cut", widthMm: Math.max(1, cutW), heightMm: cellH });
        totalCut++;
        break;
      } else {
        break;
      }
    }
    grid.push(row);
  }

  const totalTiles = totalWhole + totalCut;
  const wholeArea = tileW * tileH;
  let wasteArea = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type !== "whole") {
        wasteArea += wholeArea - cell.widthMm * cell.heightMm;
      }
    }
  }
  const wastePercent = totalTiles > 0 ? (wasteArea / (totalTiles * wholeArea)) * 100 : 0;

  return {
    wholeTiles: totalWhole, cutTiles: totalCut, totalTiles, wastePercent,
    rows, cols: grid[0]?.length ?? 0,
    cutRight: 0, cutBottom,
    tileGrid: grid, mode,
  };
}

// ── SVG Renderer ─────────────────────────────────────────────────────────────

function TileLayoutSVG({ result, tileW, tileH, groutMm }: {
  result: TileResult;
  tileW: number;
  tileH: number;
  groutMm: number;
}) {
  const scale = Math.min(600 / (result.cols * (tileW + groutMm)), 400 / (result.rows * (tileH + groutMm)), 1);

  const svgW = result.tileGrid[0]?.reduce((sum, cell) => sum + (cell.widthMm + groutMm) * scale, 0) ?? 0;
  const svgH = result.tileGrid.reduce((sum, row) => sum + (row[0].heightMm + groutMm) * scale, 0);

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
    () => calculateLayout(surfaceW, surfaceH, tileW, tileH, groutMm, layoutMode),
    [surfaceW, surfaceH, tileW, tileH, groutMm, layoutMode],
  );

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
            {SURFACE_PRESETS.map((p) => (
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
            {TILE_PRESETS.map((p) => (
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
            {LAYOUT_MODES.map((m) => (
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
          </h3>
          <button
            onClick={handleExportPNG}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-accent-300 hover:text-accent-700 transition-colors"
          >
            📥 Скачать PNG
          </button>
        </div>

        <div ref={svgContainerRef}>
          <TileLayoutSVG result={result} tileW={tileW} tileH={tileH} groutMm={groutMm} />
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
          {result.cutRight > 0 && result.cutBottom > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500 opacity-85" />
              Угловая подрезка
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
            <p className="text-xs text-slate-500">Всего плиток</p>
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
            <p className="text-xs text-slate-500">Отход</p>
          </div>
        </div>

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

        {/* Practical tips */}
        {(result.cutRight > 0 && result.cutRight < tileW * 0.3) && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 mt-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Подрезка справа меньше 30% плитки ({result.cutRight} мм). Рассмотрите смещение раскладки от центра — тогда подрезка будет одинаковой с обеих сторон и визуально лучше.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

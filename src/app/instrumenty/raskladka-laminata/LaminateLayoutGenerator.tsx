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

// ── Deck SVG (прямые ряды со смещением) ─────────────────────────────────────

function DeckSVG({ result }: { result: LaminateLayoutResult }) {
  const rows = result.rows;
  if (!rows) return null;
  const scale = Math.min(600 / Math.max(result.surfaceW, 1), 450 / Math.max(result.surfaceH, 1), 1);
  const svgW = result.surfaceW * scale;
  const svgH = result.surfaceH * scale;
  const COLORS = { whole: "#A16207", cut: "#F59E0B" };

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-[600px] border border-slate-200 dark:border-slate-700 rounded-xl bg-amber-50/40 dark:bg-slate-800"
      style={{ aspectRatio: `${svgW} / ${svgH}` }}
      role="img"
      aria-label="Схема раскладки ламината палубой"
    >
      {rows.flatMap((row, ri) =>
        row.map((b, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={b.x * scale + 0.5}
            y={b.y * scale + 0.5}
            width={Math.max(b.widthMm * scale - 1, 0.5)}
            height={Math.max(b.heightMm * scale - 1, 0.5)}
            rx={1}
            fill={COLORS[b.type]}
            opacity={0.85}
            stroke="#FDE68A"
            strokeWidth={0.5}
          />
        )),
      )}
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
  const bw = result.boardW * scale;
  const bh = result.boardH * scale;
  const COLORS = { whole: "#A16207", cut: "#F59E0B" };
  const clipId = "laminate-herr-clip";

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-[600px] border border-slate-200 dark:border-slate-700 rounded-xl bg-amber-50/40 dark:bg-slate-800"
      style={{ aspectRatio: `${svgW} / ${svgH}` }}
      role="img"
      aria-label="Схема раскладки ламината ёлочкой под 45°"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={svgW} height={svgH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {boards.map((b, i) => {
          const cx = b.cx * scale;
          const cy = b.cy * scale;
          return (
            <rect
              key={i}
              x={cx - bw / 2}
              y={cy - bh / 2}
              width={bw}
              height={bh}
              rx={1}
              fill={COLORS[b.type]}
              opacity={0.85}
              stroke="#FDE68A"
              strokeWidth={0.5}
              transform={`rotate(${b.angleDeg} ${cx} ${cy})`}
            />
          );
        })}
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Раскладка
            {mode === "herringbone" && (
              <span className="ml-2 normal-case font-normal text-amber-600 dark:text-amber-400">(ёлочка под 45°)</span>
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

        <div ref={svgRef}>
          {result.herringbone ? <HerringboneSVG result={result} /> : <DeckSVG result={result} />}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: "#A16207", opacity: 0.85 }} />
            Целая доска ({result.wholeBoards} шт)
          </div>
          {result.cutBoards > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 opacity-85" />
              С подрезкой ({result.cutBoards} шт)
            </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.totalBoards}</p>
            <p className="text-xs text-slate-500">Элементов по схеме</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-500">{result.wholeBoards}</p>
            <p className="text-xs text-slate-500">Целых по схеме</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{result.cutBoards}</p>
            <p className="text-xs text-slate-500">С подрезкой</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{result.wastePercent.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">Отход материала</p>
          </div>
        </div>

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

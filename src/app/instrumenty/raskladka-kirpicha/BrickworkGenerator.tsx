"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useCallback } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import {
  calculateBrickwork,
  computeBrickSvgBoundsMm,
  BOND_OPTIONS,
  BRICK_SIZE_PRESETS,
  WALL_SIZE_PRESETS,
  type BondType,
  type BrickLayoutResult,
} from "@/lib/tools/brickwork-layout";
import { calcHref } from "@/lib/tools/config";

// Оттенки кирпича: основной + варианты для баварской кладки.
const BRICK_TONES = ["#B45309", "#92400E", "#C2683A"]; // терракот, тёмный, светлый
const JOINT_COLOR = "#D6D3D1";

function BrickworkSVG({ result, jointMm }: { result: BrickLayoutResult; jointMm: number }) {
  const bounds = computeBrickSvgBoundsMm(result, jointMm);
  const scale = Math.min(620 / Math.max(bounds.widthMm, 1), 440 / Math.max(bounds.heightMm, 1), 1);
  const svgW = bounds.widthMm * scale;
  const svgH = bounds.heightMm * scale;
  const brickH = result.brickHmm * scale;
  const gap = jointMm * scale;

  let y = 0;
  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-[620px] rounded-xl border border-slate-200 dark:border-slate-700"
      style={{ aspectRatio: `${svgW} / ${svgH}`, background: JOINT_COLOR }}
      role="img"
      aria-label={`Схема кирпичной кладки, перевязка: ${result.bond}`}
    >
      {result.rows.map((row, ri) => {
        let x = 0;
        const rowY = y;
        y += brickH + gap;
        return (
          <g key={ri}>
            {row.map((b, ci) => {
              const w = b.widthMm * scale;
              const rectX = x;
              x += w + gap;
              const tone = result.bond === "bavarian" ? BRICK_TONES[b.tone] ?? BRICK_TONES[0] : BRICK_TONES[0];
              return (
                <rect
                  key={ci}
                  x={rectX}
                  y={rowY}
                  width={Math.max(w, 0.5)}
                  height={brickH}
                  rx={1}
                  fill={tone}
                  opacity={b.cut ? 0.6 : 1}
                  stroke={b.face === "header" ? "#78350F" : "none"}
                  strokeWidth={b.face === "header" ? 1 : 0}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function BrickworkGenerator() {
  const [surfaceW, setSurfaceW] = useState(4000);
  const [surfaceH, setSurfaceH] = useState(2700);
  const [brickL, setBrickL] = useState(250);
  const [brickH, setBrickH] = useState(65);
  const [jointMm, setJointMm] = useState(10);
  const [bond, setBond] = useState<BondType>("stretcher");
  const svgRef = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () => calculateBrickwork(surfaceW, surfaceH, brickL, brickH, jointMm, bond),
    [surfaceW, surfaceH, brickL, brickH, jointMm, bond],
  );

  const surfaceAreaM2 = useMemo(
    () => Math.round(((surfaceW * surfaceH) / 1_000_000) * 100) / 100,
    [surfaceW, surfaceH],
  );

  const handleExportPNG = useCallback(() => {
    const svgEl = svgRef.current?.querySelector("svg");
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
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = "brickwork-layout.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
  }, []);

  const materials = useMemo(
    () => [
      { name: "Кирпич к закупке (с запасом)", quantity: result.purchaseBricks, unit: "шт", category: "Кирпич" },
      { name: "Площадь кладки", quantity: surfaceAreaM2, unit: "м²", category: "Кирпич" },
    ],
    [result.purchaseBricks, surfaceAreaM2],
  );

  const kladkaHref = calcHref({ slug: "kladka-kirpicha", categorySlug: "steny" });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card p-6 space-y-5">
        {/* Размер стены */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Размер стены (мм)
          </label>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" min={250} max={30000} value={surfaceW} onChange={(e) => setSurfaceW(Number(e.target.value) || 250)} className="input-field w-28" />
            <span className="text-slate-400">×</span>
            <input type="number" inputMode="numeric" min={65} max={15000} value={surfaceH} onChange={(e) => setSurfaceH(Number(e.target.value) || 65)} className="input-field w-28" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {WALL_SIZE_PRESETS.map((p) => (
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

        {/* Размер кирпича */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Размер кирпича (длина × высота, мм)
          </label>
          <div className="flex flex-wrap gap-2">
            {BRICK_SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setBrickL(p.l); setBrickH(p.h); }}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  brickL === p.l && brickH === p.h
                    ? "border-accent-300 bg-accent-50 text-accent-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Тип перевязки */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Тип перевязки
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BOND_OPTIONS.map((m) => (
              <button
                key={m.value}
                onClick={() => setBond(m.value)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  bond === m.value
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

        {/* Шов */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Толщина шва: {jointMm} мм
          </label>
          <input type="range" min={0} max={20} step={1} value={jointMm} onChange={(e) => setJointMm(Number(e.target.value))} className="w-full accent-accent-500" />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0 мм</span>
            <span>20 мм</span>
          </div>
        </div>
      </div>

      {/* Визуализация */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Схема кладки
          </h3>
          <button
            onClick={handleExportPNG}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-accent-300 hover:text-accent-700 transition-colors"
          >
            📥 Скачать PNG
          </button>
        </div>
        <div ref={svgRef}>
          <BrickworkSVG result={result} jointMm={jointMm} />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: BRICK_TONES[0] }} />
            Целый кирпич ({result.wholeBricks} шт)
          </div>
          {result.cutBricks > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm opacity-60" style={{ background: BRICK_TONES[0] }} />
              Обрезка по краям ({result.cutBricks} шт)
            </div>
          )}
        </div>
      </div>

      {/* Результат */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Результат
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.purchaseBricks}</p>
            <p className="text-xs text-slate-500">Кирпичей к закупке</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: BRICK_TONES[0] }}>{result.totalBricks}</p>
            <p className="text-xs text-slate-500">По схеме</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{surfaceAreaM2} м²</p>
            <p className="text-xs text-slate-500">Площадь кладки</p>
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
            Перенесём в калькулятор кладки: {surfaceAreaM2} м² — посчитаем точное количество кирпича, раствора и кладочной сетки по толщине стены и ГОСТ.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={kladkaHref} className="btn-primary inline-flex text-sm no-underline">
              Кирпич, раствор, сетка →
            </Link>
            <SaveToProjectButton
              calcId="instrument-raskladka-kirpicha"
              calcTitle="Раскладка кирпичной кладки"
              slug="kladka-kirpicha"
              categorySlug="steny"
              materials={materials}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

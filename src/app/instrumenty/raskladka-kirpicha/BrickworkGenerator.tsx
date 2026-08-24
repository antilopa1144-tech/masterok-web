"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useCallback } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import CompactToolWorkspaceNav from "@/components/tools/CompactToolWorkspaceNav";
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
type BrickWorkspaceStage = "parameters" | "layout" | "result";

const BRICK_WORKSPACE_STAGES = [
  { value: "parameters", shortLabel: "Параметры", label: "Стена и кирпич" },
  { value: "layout", shortLabel: "Схема", label: "Вид кладки" },
  { value: "result", shortLabel: "Результат", label: "Итог к покупке" },
] satisfies Array<{ value: BrickWorkspaceStage; shortLabel: string; label: string }>;

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
  const [activeStage, setActiveStage] = useState<BrickWorkspaceStage>("layout");
  const [surfaceW, setSurfaceW] = useState(4000);
  const [surfaceH, setSurfaceH] = useState(2700);
  const [brickL, setBrickL] = useState(250);
  const [brickH, setBrickH] = useState(65);
  const [jointMm, setJointMm] = useState(10);
  const [bond, setBond] = useState<BondType>("stretcher");
  const svgRef = useRef<HTMLDivElement>(null);
  const workspaceTopRef = useRef<HTMLDivElement>(null);

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
  const selectedBond = BOND_OPTIONS.find((option) => option.value === bond) ?? BOND_OPTIONS[0];

  const changeStage = useCallback((stage: BrickWorkspaceStage) => {
    setActiveStage(stage);
    window.requestAnimationFrame(() => workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  return (
    <div ref={workspaceTopRef} className="space-y-4 scroll-mt-24">
      <CompactToolWorkspaceNav
        activeStage={activeStage}
        ariaLabel="Этапы раскладки кирпича"
        stages={BRICK_WORKSPACE_STAGES}
        onChange={changeStage}
        metrics={[
          { label: "Площадь", value: `${surfaceAreaM2.toLocaleString("ru-RU")} м²` },
          { label: "Ряды", value: `${result.rows.length}` },
          { label: "По схеме", value: `${result.totalBricks} шт.` },
          { label: "Купить", value: `${result.purchaseBricks} шт.`, accent: true },
        ]}
      />

      {activeStage === "parameters" && (
        <section aria-labelledby="brick-parameters-title" className="card overflow-hidden border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Шаг 1</p>
            <h2 id="brick-parameters-title" className="mt-1 text-xl font-bold text-stone-950 dark:text-white">Параметры раскладки</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Три коротких блока — геометрия, формат кирпича и рисунок кладки.</p>
          </div>

          <div className="space-y-3">
            <details open className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-sm font-semibold text-stone-950 dark:text-white">Размер стены</span>
                  <span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{surfaceW.toLocaleString("ru-RU")} × {surfaceH.toLocaleString("ru-RU")} мм · {surfaceAreaM2.toLocaleString("ru-RU")} м²</span>
                </span>
                <span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <div className="border-t border-stone-100 px-4 pb-4 pt-3 dark:border-slate-800">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                  <label className="text-xs text-stone-500 dark:text-slate-400">
                    Ширина
                    <input aria-label="Ширина стены в миллиметрах" type="number" inputMode="numeric" min={250} max={30000} value={surfaceW} onChange={(event) => setSurfaceW(Number(event.target.value) || 250)} className="input-field mt-1 w-full" />
                  </label>
                  <span className="pb-3 text-stone-400">×</span>
                  <label className="text-xs text-stone-500 dark:text-slate-400">
                    Высота
                    <input aria-label="Высота стены в миллиметрах" type="number" inputMode="numeric" min={65} max={15000} value={surfaceH} onChange={(event) => setSurfaceH(Number(event.target.value) || 65)} className="input-field mt-1 w-full" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {WALL_SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => { setSurfaceW(preset.w); setSurfaceH(preset.h); }}
                      className={`min-h-10 rounded-xl border px-3 py-2 text-xs transition-colors ${surfaceW === preset.w && surfaceH === preset.h ? "border-orange-400 bg-orange-50 font-semibold text-orange-800 dark:bg-orange-950/20 dark:text-orange-200" : "border-stone-200 text-stone-600 hover:border-stone-300 dark:border-slate-700 dark:text-slate-300"}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-sm font-semibold text-stone-950 dark:text-white">Формат кирпича</span>
                  <span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{brickL} × {brickH} мм</span>
                </span>
                <span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <div className="grid gap-2 border-t border-stone-100 px-4 pb-4 pt-3 sm:grid-cols-2 dark:border-slate-800">
                {BRICK_SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { setBrickL(preset.l); setBrickH(preset.h); }}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${brickL === preset.l && brickH === preset.h ? "border-orange-400 bg-orange-50 font-semibold text-orange-800 dark:bg-orange-950/20 dark:text-orange-200" : "border-stone-200 text-stone-600 hover:border-stone-300 dark:border-slate-700 dark:text-slate-300"}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </details>

            <details className="group rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-sm font-semibold text-stone-950 dark:text-white">Перевязка и шов</span>
                  <span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{selectedBond.label} · шов {jointMm} мм</span>
                </span>
                <span aria-hidden="true" className="text-lg text-stone-400 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <div className="space-y-4 border-t border-stone-100 px-4 pb-4 pt-3 dark:border-slate-800">
                <div className="grid gap-2 sm:grid-cols-2">
                  {BOND_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBond(option.value)}
                      className={`min-h-16 rounded-xl border p-3 text-left transition-colors ${bond === option.value ? "border-orange-400 bg-orange-50 shadow-sm dark:bg-orange-950/20" : "border-stone-200 hover:border-stone-300 dark:border-slate-700"}`}
                    >
                      <span className="text-sm font-semibold text-stone-950 dark:text-white">{option.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-stone-500 dark:text-slate-400">{option.desc}</span>
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-stone-700 dark:text-slate-300">
                  Толщина шва: <strong>{jointMm} мм</strong>
                  <input aria-label="Толщина шва в миллиметрах" type="range" min={0} max={20} step={1} value={jointMm} onChange={(event) => setJointMm(Number(event.target.value))} className="mt-3 w-full accent-orange-600" />
                  <span className="mt-1 flex justify-between text-xs font-normal text-stone-400"><span>0 мм</span><span>20 мм</span></span>
                </label>
              </div>
            </details>
          </div>

          <button type="button" onClick={() => changeStage("layout")} className="btn-primary mt-5 min-h-12 w-full justify-center text-sm sm:w-auto">
            Посмотреть схему →
          </button>
        </section>
      )}

      {activeStage === "layout" && (
        <section aria-labelledby="brick-layout-title" className="card overflow-hidden border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Шаг 2 · живая схема</p>
              <h2 id="brick-layout-title" className="mt-1 text-xl font-bold text-stone-950 dark:text-white">{selectedBond.label}</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Стена {surfaceW.toLocaleString("ru-RU")} × {surfaceH.toLocaleString("ru-RU")} мм · кирпич {brickL} × {brickH} мм</p>
            </div>
            <button type="button" onClick={handleExportPNG} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-orange-300 hover:text-orange-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              Скачать PNG
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-stone-200 bg-stone-100 p-2 shadow-inner dark:border-slate-700 dark:bg-slate-950 sm:p-5" ref={svgRef}>
            <div className="mx-auto flex min-h-56 items-center justify-center sm:min-h-80">
              <BrickworkSVG result={result} jointMm={jointMm} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: BRICK_TONES[0] }} />Целые: {result.wholeBricks} шт.</span>
            {result.cutBricks > 0 && <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm opacity-60" style={{ background: BRICK_TONES[0] }} />Подрезка: {result.cutBricks} шт.</span>}
            <span>Шов: {jointMm} мм</span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => changeStage("parameters")} className="min-h-12 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">← Изменить параметры</button>
            <button type="button" onClick={() => changeStage("result")} className="btn-primary min-h-12 w-full justify-center text-sm">Посмотреть результат →</button>
          </div>
        </section>
      )}

      {activeStage === "result" && (
        <section aria-labelledby="brick-result-title" className="space-y-4">
          <div className="card overflow-hidden border-stone-200 bg-[#fffdf9] p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:border-orange-900/50 dark:from-orange-950/20 dark:to-amber-950/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-800 dark:text-orange-300">Паспорт раскладки</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="brick-result-title" className="text-xl font-bold text-stone-950 dark:text-white">{selectedBond.label}</h2>
                  <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">{surfaceW.toLocaleString("ru-RU")} × {surfaceH.toLocaleString("ru-RU")} мм · {result.rows.length} рядов · шов {jointMm} мм</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Готово к расчёту</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-xs text-stone-500 dark:text-slate-400">Кирпичей к закупке</p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-orange-800 dark:text-orange-300">{result.purchaseBricks} <span className="text-lg">шт.</span></p>
              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">На схеме {result.totalBricks} элементов кладки; закупка считает целые кирпичи, повторное использование подходящих обрезков и запас на бой.</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Площадь", `${surfaceAreaM2.toLocaleString("ru-RU")} м²`],
                ["Ряды", `${result.rows.length}`],
                ["Целые", `${result.wholeBricks} шт.`],
                ["Подрезка", `${result.cutBricks} шт.`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-stone-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">{label}</p>
                  <p className="mt-1 text-lg font-bold text-stone-950 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            {result.notes.length > 0 && (
              <div className="mt-4 rounded-2xl bg-stone-100 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300">Что учтено</p>
                <ul className="mt-2 space-y-1.5 pl-4 text-xs text-stone-600 dark:text-slate-400">
                  {result.notes.map((note) => <li key={note} className="list-disc">{note}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-5 space-y-3 border-t border-stone-100 pt-4 dark:border-slate-800">
              <p className="text-xs leading-relaxed text-stone-500 dark:text-slate-400">Перенесём {surfaceAreaM2.toLocaleString("ru-RU")} м² в калькулятор кладки — там можно уточнить толщину стены и получить кирпич, раствор и кладочную сетку.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href={kladkaHref} className="btn-primary min-h-12 justify-center text-sm no-underline">Кирпич, раствор, сетка →</Link>
                <SaveToProjectButton calcId="instrument-raskladka-kirpicha" calcTitle="Раскладка кирпичной кладки" slug="kladka-kirpicha" categorySlug="steny" materials={materials} />
              </div>
            </div>
          </div>

          <button type="button" onClick={() => changeStage("layout")} className="min-h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">← Вернуться к схеме</button>
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import ToolSectionNav from "@/components/tools/ToolSectionNav";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { trackToolExport, trackToolPresetSelect, trackToolRelatedClick } from "@/lib/analytics";
import { shareOrCopy } from "@/lib/clipboard";
import {
  calculateSheetLayout,
  SHEET_PRESETS,
  type ResolvedSheetOrientation,
  type SheetLayoutResult,
  type SheetMaterial,
  type SheetOrientation,
  type SheetStagger,
  type SheetSurface,
} from "@/lib/tools/sheet-layout";
import { buildDrywallCalculatorHref } from "@/lib/tools/sheet-layout-to-calc";

const SURFACE_PRESETS = [
  { label: "Стена 3 × 2,7 м", width: 3000, height: 2700, surface: "wall" as const },
  { label: "Стена 5 × 2,7 м", width: 5000, height: 2700, surface: "wall" as const },
  { label: "Пол 3 × 4 м", width: 3000, height: 4000, surface: "floor" as const },
] as const;

function NumberInput({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="input-field min-w-0 w-full" />
        <span className="text-xs text-slate-400">{unit}</span>
      </span>
    </label>
  );
}

function SurfaceLayoutSvg({ result, layer }: { result: SheetLayoutResult; layer: number }) {
  const layout = result.layers[layer - 1] ?? result.layers[0];
  const width = result.input.surfaceWidthMm;
  const height = result.input.surfaceHeightMm;
  const stroke = Math.max(width, height) / 700;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={`Раскладка листов, слой ${layer}`}>
      <rect width={width} height={height} fill="#f8fafc" />
      {layout.placements.map((piece) => (
        <g key={piece.id}>
          <rect x={piece.x} y={piece.y} width={piece.widthMm} height={piece.heightMm} fill={piece.whole ? "#0f766e" : "#5eead4"} stroke="#134e4a" strokeWidth={stroke} />
          {piece.widthMm > width * 0.1 && piece.heightMm > height * 0.08 && (
            <text x={piece.x + piece.widthMm / 2} y={piece.y + piece.heightMm / 2} textAnchor="middle" dominantBaseline="middle" fill={piece.whole ? "#ffffff" : "#134e4a"} fontSize={Math.max(26, Math.min(width, height) / 24)} fontWeight={700}>
              {Math.round(piece.widthMm)}×{Math.round(piece.heightMm)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function StockSheetSvg({ result, sheetIndex }: { result: SheetLayoutResult; sheetIndex: number }) {
  const sheet = result.stock[sheetIndex];
  const width = result.orientedSheetWidthMm;
  const height = result.orientedSheetHeightMm;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-auto max-w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" role="img" aria-label={`Карта раскроя листа ${sheet.index}`}>
      {sheet.cuts.map((cut, index) => (
        <rect key={cut.pieceId} x={cut.x} y={cut.y} width={cut.widthMm} height={cut.heightMm} fill={index % 2 === 0 ? "#14b8a6" : "#2dd4bf"} stroke="#134e4a" strokeWidth={Math.max(width, height) / 450} />
      ))}
    </svg>
  );
}

function orientationLabel(surface: SheetSurface, orientation: ResolvedSheetOrientation): string {
  if (surface === "wall") return orientation === "portrait" ? "Вертикально" : "Горизонтально";
  return orientation === "portrait" ? "Вдоль длины" : "Вдоль ширины";
}

export default function SheetLayoutGenerator() {
  const searchParams = useSearchParams();
  const [surfaceWidth, setSurfaceWidth] = useState(5000);
  const [surfaceHeight, setSurfaceHeight] = useState(2700);
  const [sheetWidth, setSheetWidth] = useState(1200);
  const [sheetLength, setSheetLength] = useState(2500);
  const [material, setMaterial] = useState<SheetMaterial>("drywall");
  const [surface, setSurface] = useState<SheetSurface>("wall");
  // Для ГКЛ на стене безопаснее начинать с вертикального монтажа; экономичный
  // авто-вариант остаётся доступен и явно предупреждает о поперечных стыках.
  const [orientation, setOrientation] = useState<SheetOrientation>("portrait");
  const [stagger, setStagger] = useState<SheetStagger>("half");
  const [layers, setLayers] = useState<1 | 2>(1);
  const [jointGap, setJointGap] = useState(0);
  const [reservePercent, setReservePercent] = useState(5);
  const [activeLayer, setActiveLayer] = useState(1);
  const [showAllStock, setShowAllStock] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const hydrated = useRef(false);
  const svgRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { hasStarted, markStarted, selectMode } = useToolAnalytics("raskladka-listov", resultRef);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const positive = (key: string) => {
      const value = Number(searchParams.get(key));
      return Number.isFinite(value) && value > 0 ? value : undefined;
    };
    setSurfaceWidth(positive("surfaceWidthMm") ?? surfaceWidth);
    setSurfaceHeight(positive("surfaceHeightMm") ?? surfaceHeight);
    setSheetWidth(positive("sheetWidthMm") ?? sheetWidth);
    setSheetLength(positive("sheetLengthMm") ?? sheetLength);
    const layerValue = positive("layers");
    if (layerValue === 2) setLayers(2);
    const materialValue = searchParams.get("material");
    if (materialValue === "drywall" || materialValue === "osb" || materialValue === "custom") setMaterial(materialValue);
    const surfaceValue = searchParams.get("surface");
    if (surfaceValue === "wall" || surfaceValue === "floor" || surfaceValue === "ceiling") setSurface(surfaceValue);
    const orientationValue = searchParams.get("orientation");
    if (orientationValue === "auto" || orientationValue === "portrait" || orientationValue === "landscape") setOrientation(orientationValue);
    const staggerValue = searchParams.get("stagger");
    if (staggerValue === "aligned" || staggerValue === "half") setStagger(staggerValue);
    if (searchParams.has("reservePercent")) {
      const reserveValue = Number(searchParams.get("reservePercent"));
      if (Number.isFinite(reserveValue) && reserveValue >= 0) setReservePercent(reserveValue);
    }
    if (searchParams.has("jointGapMm")) {
      const gapValue = Number(searchParams.get("jointGapMm"));
      if (Number.isFinite(gapValue) && gapValue >= 0) setJointGap(gapValue);
    }
  // Initial URL hydration only; state values are intentional defaults.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (activeLayer > layers) setActiveLayer(layers);
  }, [activeLayer, layers]);

  const result = useMemo(() => calculateSheetLayout({
    surfaceWidthMm: surfaceWidth,
    surfaceHeightMm: surfaceHeight,
    sheetWidthMm: sheetWidth,
    sheetLengthMm: sheetLength,
    material,
    surface,
    orientation,
    stagger,
    layers,
    jointGapMm: jointGap,
    reservePercent,
  }), [jointGap, layers, material, orientation, reservePercent, sheetLength, sheetWidth, stagger, surface, surfaceHeight, surfaceWidth]);

  const drywallHref = useMemo(() => buildDrywallCalculatorHref(result.input, result.purchaseSheets), [result]);
  const projectMaterials = useMemo(() => [
    { name: `${material === "drywall" ? "ГКЛ" : material === "osb" ? "ОСП" : "Листовой материал"} к покупке`, quantity: result.purchaseSheets, unit: "листов", category: "Листовые материалы" },
    { name: "Площадь обшивки", quantity: result.coveredAreaM2, unit: "м²", category: "Листовые материалы" },
  ], [material, result.coveredAreaM2, result.purchaseSheets]);

  const scrollTo = useCallback((ref: { current: HTMLElement | null }) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), []);
  const start = useCallback((source: "surface_size" | "material_size" | "preset") => markStarted(source), [markStarted]);

  const applySheetPreset = (preset: (typeof SHEET_PRESETS)[number]) => {
    start("preset");
    trackToolPresetSelect("raskladka-listov", "material", preset.label);
    setMaterial(preset.material);
    setSheetWidth(preset.widthMm);
    setSheetLength(preset.lengthMm);
  };

  const changeMaterial = (value: SheetMaterial) => {
    start("material_size");
    setMaterial(value);
    if (value === "drywall") {
      setSheetWidth(1200);
      setSheetLength(2500);
      setOrientation("portrait");
      setJointGap(0);
    } else if (value === "osb") {
      setSheetWidth(1250);
      setSheetLength(2500);
      setOrientation("auto");
      setJointGap(3);
    }
  };

  const exportPng = useCallback(() => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    trackToolExport("raskladka-listov", "png");
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width * 2;
      canvas.height = image.height * 2;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(2, 2);
      context.fillStyle = "#f8fafc";
      context.fillRect(0, 0, image.width, image.height);
      context.drawImage(image, 0, 0);
      const link = document.createElement("a");
      link.download = `raskladka-listov-sloy-${activeLayer}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  }, [activeLayer]);

  const shareLayout = useCallback(async () => {
    const params = new URLSearchParams({
      surfaceWidthMm: String(result.input.surfaceWidthMm),
      surfaceHeightMm: String(result.input.surfaceHeightMm),
      sheetWidthMm: String(result.input.sheetWidthMm),
      sheetLengthMm: String(result.input.sheetLengthMm),
      material: result.input.material,
      surface: result.input.surface,
      orientation: result.input.orientation,
      stagger: result.input.stagger,
      layers: String(result.input.layers),
      jointGapMm: String(result.input.jointGapMm),
      reservePercent: String(result.input.reservePercent),
    });
    const outcome = await shareOrCopy({ title: "Раскладка листов", text: `${result.purchaseSheets} листов к покупке`, url: `${window.location.origin}${window.location.pathname}?${params}` });
    if (outcome === "copied") {
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2500);
    }
  }, [result]);

  const visibleStock = showAllStock ? result.stock : result.stock.slice(0, 4);

  return (
    <div className="max-w-5xl space-y-6">
      <RenovationHubStrip scenarioId="room" compact />
      <div ref={parametersRef} className="card scroll-mt-24 space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Параметры раскладки</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Сравниваем обе ориентации и повторно используем подходящие обрезки.</p></div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{result.surfaceAreaM2} м² × {layers} {layers === 1 ? "слой" : "слоя"}</span>
        </div>

        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><span className="flex size-6 items-center justify-center rounded-full bg-teal-100 text-xs text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">1</span>Поверхность</div>
          <div className="mb-3 grid grid-cols-3 gap-2 sm:max-w-lg">
            {(["wall", "floor", "ceiling"] as const).map((value) => <button type="button" key={value} aria-pressed={surface === value} onClick={() => { start("surface_size"); setSurface(value); }} className={`rounded-xl border px-2 py-2 text-sm font-medium ${surface === value ? "border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "wall" ? "Стена" : value === "floor" ? "Пол" : "Потолок"}</button>)}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
            <NumberInput label={surface === "wall" ? "Длина стены" : "Ширина поверхности"} value={surfaceWidth} unit="мм" min={300} max={30000} step={10} onChange={(value) => { start("surface_size"); setSurfaceWidth(value); }} />
            <NumberInput label={surface === "wall" ? "Высота стены" : "Длина поверхности"} value={surfaceHeight} unit="мм" min={300} max={30000} step={10} onChange={(value) => { start("surface_size"); setSurfaceHeight(value); }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{SURFACE_PRESETS.map((preset) => <button type="button" key={preset.label} onClick={() => { start("preset"); trackToolPresetSelect("raskladka-listov", "surface", preset.label); setSurfaceWidth(preset.width); setSurfaceHeight(preset.height); setSurface(preset.surface); }} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400">{preset.label}</button>)}</div>
        </section>

        <section className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><span className="flex size-6 items-center justify-center rounded-full bg-teal-100 text-xs text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">2</span>Материал и формат листа</div>
          <div className="mb-3 grid grid-cols-3 gap-2 sm:max-w-lg">{(["drywall", "osb", "custom"] as const).map((value) => <button type="button" key={value} aria-pressed={material === value} onClick={() => changeMaterial(value)} className={`rounded-xl border px-2 py-2 text-sm font-medium ${material === value ? "border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "drywall" ? "ГКЛ" : value === "osb" ? "ОСП" : "Свой лист"}</button>)}</div>
          <div className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2"><NumberInput label="Ширина листа" value={sheetWidth} unit="мм" min={300} max={3000} step={5} onChange={(value) => { start("material_size"); setSheetWidth(value); setMaterial("custom"); }} /><NumberInput label="Длина листа" value={sheetLength} unit="мм" min={600} max={6000} step={5} onChange={(value) => { start("material_size"); setSheetLength(value); setMaterial("custom"); }} /></div>
          <div className="mt-3 flex flex-wrap gap-2">{SHEET_PRESETS.filter((preset) => material === "custom" || preset.material === material).map((preset) => <button type="button" key={preset.id} onClick={() => applySheetPreset(preset)} className={`rounded-lg border px-2.5 py-1 text-xs ${sheetWidth === preset.widthMm && sheetLength === preset.lengthMm ? "border-teal-300 bg-teal-50 font-medium text-teal-700 dark:bg-teal-900/20" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"}`}>{preset.label}</button>)}</div>
        </section>

        <section className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><span className="flex size-6 items-center justify-center rounded-full bg-teal-100 text-xs text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">3</span>Ориентация и стыки</div>
          <div className="grid gap-2 sm:grid-cols-3">{(["auto", "portrait", "landscape"] as const).map((value) => {
            const comparison = value === "auto" ? undefined : result.comparisons.find((item) => item.orientation === value);
            return <button type="button" key={value} aria-pressed={orientation === value} onClick={() => { selectMode(value); setOrientation(value); }} className={`rounded-xl border p-3 text-left ${orientation === value ? "border-teal-400 bg-teal-50 shadow-sm dark:bg-teal-900/20" : "border-slate-200 dark:border-slate-700"}`}><span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value === "auto" ? "Авто — экономнее" : orientationLabel(surface, value)}</span><span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{value === "auto" ? `Выбрано: ${orientationLabel(surface, result.orientation).toLowerCase()}` : `${comparison?.baseSheets ?? 0} листов · отход ${comparison?.wastePercent ?? 0}%`}</span></button>;
          })}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Разбежка рядов</span><select value={stagger} onChange={(event) => { selectMode(event.target.value); setStagger(event.target.value as SheetStagger); }} className="input-field w-full"><option value="half">На ½ листа</option><option value="aligned">Без смещения</option></select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Слоёв обшивки</span><select value={layers} onChange={(event) => { start("material_size"); setLayers(Number(event.target.value) === 2 ? 2 : 1); }} className="input-field w-full"><option value={1}>1 слой</option><option value={2}>2 слоя</option></select></label>
            <NumberInput label="Зазор между листами" value={jointGap} unit="мм" min={0} max={20} step={0.5} onChange={(value) => { start("material_size"); setJointGap(value); }} />
            <NumberInput label="Закрытый запас" value={reservePercent} unit="%" min={0} max={30} step={1} onChange={(value) => { start("material_size"); setReservePercent(value); }} />
          </div>
        </section>
      </div>

      <ToolSectionNav visible={hasStarted} onParameters={() => scrollTo(parametersRef)} onLayout={() => scrollTo(layoutRef)} onResult={() => scrollTo(resultRef)} />

      <div ref={layoutRef} className="card scroll-mt-24 space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Схема поверхности</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Размер внутри детали — ширина × высота куска в миллиметрах.</p></div><button type="button" onClick={exportPng} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400">Скачать PNG</button></div>
        {layers === 2 && <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{[1, 2].map((value) => <button type="button" key={value} onClick={() => setActiveLayer(value)} className={`rounded-lg px-4 py-1.5 text-xs font-medium ${activeLayer === value ? "bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300" : "text-slate-500"}`}>Слой {value}</button>)}</div>}
        <div ref={svgRef} className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><SurfaceLayoutSvg result={result} layer={activeLayer} /></div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-teal-700" /> Целый лист на схеме</span><span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-teal-300" /> Деталь с подрезкой</span></div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800"><h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Карты раскроя листов</h3><p className="mt-1 text-xs text-slate-500">Одинаковые цвета — только для читаемости; подпишите детали по слою и позиции перед монтажом.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visibleStock.map((sheet) => <div key={sheet.index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="mb-2 flex items-center justify-between gap-2 text-xs"><strong className="text-slate-700 dark:text-slate-200">Лист {sheet.index}</strong><span className="text-slate-500">{sheet.cuts.length} деталей</span></div><StockSheetSvg result={result} sheetIndex={sheet.index - 1} /><p className="mt-2 text-[11px] text-slate-500">Остаток {sheet.offcutAreaM2} м²{sheet.largestOffcut && sheet.largestOffcut.areaM2 >= 0.05 ? ` · крупнейший ${sheet.largestOffcut.widthMm}×${sheet.largestOffcut.heightMm}` : ""}</p></div>)}</div>
          {result.stock.length > 4 && <button type="button" onClick={() => setShowAllStock((value) => !value)} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300">{showAllStock ? "Свернуть карты" : `Показать все листы (${result.stock.length})`}</button>}
        </div>
      </div>

      <div ref={resultRef} className="card scroll-mt-24 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Итог к покупке</h2>
        <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800/60 dark:bg-teal-900/20"><p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Купить листов</p><div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1"><p className="text-4xl font-bold text-slate-950 dark:text-white">{result.purchaseSheets}</p><p className="pb-1 text-sm text-slate-600 dark:text-slate-300">{result.baseSheets} в раскрой + {result.reserveSheets} закрытых в запас</p></div></div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.layoutPieces}</p><p className="text-xs text-slate-500">Деталей на схеме</p></div><div><p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{result.wholePlacements}</p><p className="text-xs text-slate-500">Целых листов</p></div><div><p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">{result.cutPieces}</p><p className="text-xs text-slate-500">Деталей с резом</p></div><div><p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{result.wastePercent}%</p><p className="text-xs text-slate-500">Остаток раскроя</p></div></div>
        <div className="mt-5 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 dark:bg-slate-900"><p className="flex justify-between gap-3"><span className="text-slate-500">Поверхность</span><strong>{result.surfaceAreaM2} м²</strong></p><p className="flex justify-between gap-3"><span className="text-slate-500">Обшивка со слоями</span><strong>{result.coveredAreaM2} м²</strong></p><p className="flex justify-between gap-3"><span className="text-slate-500">Материал без зазоров</span><strong>{result.netMaterialAreaM2} м²</strong></p><p className="flex justify-between gap-3"><span className="text-slate-500">Ориентация</span><strong>{orientationLabel(surface, result.orientation)}</strong></p><p className="flex justify-between gap-3"><span className="text-slate-500">Межлистовой зазор</span><strong>{result.input.jointGapMm} мм</strong></p><p className="flex justify-between gap-3"><span className="text-slate-500">Остаток открытых листов</span><strong>{result.offcutAreaM2} м²</strong></p></div>
        {result.warnings.length > 0 && <div className="mt-4 space-y-2">{result.warnings.map((warning) => <p key={warning} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">⚠ {warning}</p>)}</div>}
        <ul className="mt-4 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{result.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Раскладка даёт листы и карту реза. Профиль, крепёж, ленту и шпаклёвку считайте комплектно в калькуляторе ГКЛ.</p><div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{material === "drywall" && surface !== "floor" && <Link href={drywallHref} onClick={() => trackToolRelatedClick("raskladka-listov", "drywall-calculator")} className="btn-primary inline-flex text-sm no-underline">Профиль и крепёж →</Link>}<button type="button" onClick={shareLayout} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300">{shareState === "copied" ? "Ссылка скопирована" : "Поделиться раскладкой"}</button><SaveToProjectButton calcId="instrument-raskladka-listov" calcTitle="Раскладка листов" slug="gipsokarton" categorySlug="steny" materials={projectMaterials} calendarScenarioId="room" /></div></div>
      </div>
    </div>
  );
}

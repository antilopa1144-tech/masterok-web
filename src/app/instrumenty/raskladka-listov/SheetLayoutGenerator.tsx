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

const STOCK_ACCENTS = ["#0f766e", "#0369a1", "#7c3aed", "#b45309", "#be123c", "#047857", "#4338ca", "#a21caf"];
const CUT_FILLS = ["#ccfbf1", "#bae6fd", "#ddd6fe", "#fde68a", "#fecdd3", "#d1fae5"];

function materialLabel(material: SheetMaterial): string {
  if (material === "drywall") return "Гипсокартон";
  if (material === "osb") return "ОСП (ориентированно-стружечная плита)";
  return "Лист";
}

function SurfaceLayoutSvg({ result, layer }: { result: SheetLayoutResult; layer: number }) {
  const layout = result.layers[layer - 1] ?? result.layers[0];
  const width = result.input.surfaceWidthMm;
  const height = result.input.surfaceHeightMm;
  const unit = Math.min(width, height);
  const padX = Math.max(width * 0.055, unit * 0.12);
  const padTop = Math.max(height * 0.17, unit * 0.2);
  const padBottom = result.input.surface === "wall" ? Math.max(height * 0.2, unit * 0.24) : padTop;
  const stroke = Math.max(width, height) / 760;
  const labelSize = Math.max(34, unit / 24);
  const sourceSheetByPiece = new Map(
    result.stock.flatMap((sheet) => sheet.cuts.map((cut) => [cut.pieceId, sheet.index] as const)),
  );
  const title = result.input.surface === "wall"
    ? `Вид стены · слой ${layer}`
    : result.input.surface === "floor"
      ? `Вид пола сверху · слой ${layer}`
      : `Вид потолка снизу · слой ${layer}`;
  const surfaceFill = result.input.surface === "wall" ? "#e7e2d9" : "#d8d4ca";
  const panelFill = result.input.material === "osb"
    ? "url(#sheet-osb-pattern)"
    : result.input.material === "drywall"
      ? "url(#sheet-gkl-gradient)"
      : "url(#sheet-custom-gradient)";

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${width + padX * 2} ${height + padTop + padBottom}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${title}. Показаны монтажные швы и детали из покупных листов`}
    >
      <defs>
        <linearGradient id="sheet-scene-background" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#e7f3f1" />
        </linearGradient>
        <linearGradient id="sheet-gkl-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffef9" />
          <stop offset="0.52" stopColor="#f4f1e9" />
          <stop offset="1" stopColor="#e8e3d8" />
        </linearGradient>
        <linearGradient id="sheet-custom-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <pattern id="sheet-osb-pattern" width={unit / 8} height={unit / 10} patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="100%" height="100%" fill="#d9bd88" />
          <path d={`M 0 ${unit / 30} L ${unit / 10} ${unit / 55} M ${unit / 30} ${unit / 14} L ${unit / 8} ${unit / 11}`} stroke="#9a6f3c" strokeWidth={unit / 95} strokeLinecap="round" opacity="0.55" />
          <path d={`M ${unit / 70} ${unit / 9} L ${unit / 11} ${unit / 8}`} stroke="#f4dfae" strokeWidth={unit / 120} strokeLinecap="round" opacity="0.8" />
        </pattern>
        <pattern id="sheet-cut-hatch" width={unit / 22} height={unit / 22} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2={unit / 22} stroke="#0f766e" strokeWidth={unit / 180} opacity="0.2" />
        </pattern>
        <filter id="sheet-panel-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy={unit / 180} stdDeviation={unit / 130} floodColor="#0f172a" floodOpacity="0.2" />
        </filter>
        <filter id="sheet-wall-shadow" x="-10%" y="-15%" width="120%" height="135%">
          <feDropShadow dx="0" dy={unit / 50} stdDeviation={unit / 38} floodColor="#0f172a" floodOpacity="0.2" />
        </filter>
        <clipPath id="sheet-surface-clip"><rect width={width} height={height} /></clipPath>
      </defs>

      <rect x={-padX} y={-padTop} width={width + padX * 2} height={height + padTop + padBottom} rx={unit / 30} fill="url(#sheet-scene-background)" />
      <text x="0" y={-padTop * 0.54} fill="#0f172a" fontSize={labelSize * 1.08} fontWeight="700">{title}</text>
      <text x="0" y={-padTop * 0.23} fill="#64748b" fontSize={labelSize * 0.68}>{materialLabel(result.input.material)} · {orientationLabel(result.input.surface, result.orientation).toLowerCase()}</text>

      <line x1="0" y1={-padTop * 0.13} x2={width} y2={-padTop * 0.13} stroke="#64748b" strokeWidth={stroke * 0.7} />
      <line x1="0" y1={-padTop * 0.2} x2="0" y2={-padTop * 0.06} stroke="#64748b" strokeWidth={stroke * 0.7} />
      <line x1={width} y1={-padTop * 0.2} x2={width} y2={-padTop * 0.06} stroke="#64748b" strokeWidth={stroke * 0.7} />
      <rect x={width * 0.41} y={-padTop * 0.22} width={width * 0.18} height={labelSize * 1.1} rx={labelSize * 0.4} fill="#f8fafc" />
      <text x={width / 2} y={-padTop * 0.12} textAnchor="middle" dominantBaseline="middle" fill="#475569" fontSize={labelSize * 0.72} fontWeight="600">{width.toLocaleString("ru-RU")} мм</text>

      {result.input.surface === "wall" ? (
        <>
          <polygon points={`${-padX},0 0,${unit * 0.04} 0,${height} ${-padX},${height + padBottom * 0.46}`} fill="#dbe4e3" />
          <polygon points={`${width},${unit * 0.04} ${width + padX},0 ${width + padX},${height + padBottom * 0.46} ${width},${height}`} fill="#d2dddc" />
          <polygon points={`${-padX},${height + padBottom * 0.46} 0,${height} ${width},${height} ${width + padX},${height + padBottom * 0.46}`} fill="#c9bda9" />
          <path d={`M ${-padX} ${height + padBottom * 0.46} L ${width + padX} ${height + padBottom * 0.46}`} stroke="#a89b86" strokeWidth={stroke} />
        </>
      ) : (
        <rect x={-padX * 0.45} y={-padX * 0.35} width={width + padX * 0.9} height={height + padX * 0.7} rx={unit / 28} fill="#cbd5d1" filter="url(#sheet-wall-shadow)" />
      )}

      <rect width={width} height={height} fill={surfaceFill} stroke="#64748b" strokeWidth={stroke * 1.8} filter="url(#sheet-wall-shadow)" />
      <g clipPath="url(#sheet-surface-clip)">
        <path d={`M 0 ${height * 0.18} C ${width * 0.24} ${height * 0.12}, ${width * 0.4} ${height * 0.27}, ${width * 0.64} ${height * 0.18} S ${width * 0.9} ${height * 0.13}, ${width} ${height * 0.22}`} fill="none" stroke="#b6aea2" strokeWidth={stroke * 2} opacity="0.42" />
        {layout.placements.map((piece) => {
          const sourceSheet = sourceSheetByPiece.get(piece.id) ?? 0;
          const accent = STOCK_ACCENTS[(Math.max(1, sourceSheet) - 1) % STOCK_ACCENTS.length];
          const canShowBadge = piece.widthMm > labelSize * 1.8 && piece.heightMm > labelSize * 1.5;
          const canShowSize = piece.widthMm > width * 0.1 && piece.heightMm > height * 0.11;
          return (
            <g key={piece.id} filter="url(#sheet-panel-shadow)">
              <rect x={piece.x} y={piece.y} width={piece.widthMm} height={piece.heightMm} fill={panelFill} stroke={accent} strokeWidth={stroke * 1.55} />
              <rect x={piece.x} y={piece.y} width={piece.widthMm} height={piece.heightMm} fill={accent} opacity={piece.whole ? 0.035 : 0.075} />
              {!piece.whole && <rect x={piece.x} y={piece.y} width={piece.widthMm} height={piece.heightMm} fill="url(#sheet-cut-hatch)" />}
              {canShowBadge && (
                <g>
                  <rect x={piece.x + labelSize * 0.3} y={piece.y + labelSize * 0.3} width={labelSize * 1.34} height={labelSize * 0.86} rx={labelSize * 0.28} fill={accent} />
                  <text x={piece.x + labelSize * 0.97} y={piece.y + labelSize * 0.75} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={labelSize * 0.53} fontWeight="800">Л{sourceSheet}</text>
                </g>
              )}
              {canShowSize && (
                <text x={piece.x + piece.widthMm / 2} y={piece.y + piece.heightMm / 2} textAnchor="middle" dominantBaseline="middle" fill="#334155" fontSize={labelSize * 0.7} fontWeight="650">
                  {Math.round(piece.widthMm)}×{Math.round(piece.heightMm)}
                </text>
              )}
              {canShowSize && !piece.whole && (
                <text x={piece.x + piece.widthMm / 2} y={piece.y + piece.heightMm / 2 + labelSize * 0.82} textAnchor="middle" dominantBaseline="middle" fill={accent} fontSize={labelSize * 0.5} fontWeight="700">подрезка</text>
              )}
            </g>
          );
        })}
      </g>
      {result.input.surface === "wall" && <rect y={height - unit * 0.035} width={width} height={unit * 0.035} fill="#d6cbbc" stroke="#a89b86" strokeWidth={stroke * 0.55} />}

      <line x1={-padX * 0.27} y1="0" x2={-padX * 0.27} y2={height} stroke="#64748b" strokeWidth={stroke * 0.7} />
      <line x1={-padX * 0.36} y1="0" x2={-padX * 0.18} y2="0" stroke="#64748b" strokeWidth={stroke * 0.7} />
      <line x1={-padX * 0.36} y1={height} x2={-padX * 0.18} y2={height} stroke="#64748b" strokeWidth={stroke * 0.7} />
      <text x={-padX * 0.46} y={height / 2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 ${-padX * 0.46} ${height / 2})`} fill="#475569" fontSize={labelSize * 0.68} fontWeight="600">{height.toLocaleString("ru-RU")} мм</text>
    </svg>
  );
}

function StockSheetSvg({ result, sheetIndex }: { result: SheetLayoutResult; sheetIndex: number }) {
  const sheet = result.stock[sheetIndex];
  const width = result.orientedSheetWidthMm;
  const height = result.orientedSheetHeightMm;
  const stroke = Math.max(width, height) / 420;
  const labelSize = Math.max(30, Math.min(width, height) / 13);
  const baseFill = result.input.material === "osb" ? "#d9bd88" : result.input.material === "drywall" ? "#f3f0e8" : "#dbeafe";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-auto max-w-full rounded-lg border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-900" role="img" aria-label={`Карта раскроя листа ${sheet.index}`}>
      <rect width={width} height={height} fill={baseFill} />
      {sheet.cuts.map((cut, index) => {
        const canShowLabel = cut.widthMm > labelSize * 1.8 && cut.heightMm > labelSize * 1.4;
        return (
          <g key={cut.pieceId}>
            <rect x={cut.x} y={cut.y} width={cut.widthMm} height={cut.heightMm} fill={CUT_FILLS[index % CUT_FILLS.length]} stroke={STOCK_ACCENTS[(sheet.index - 1) % STOCK_ACCENTS.length]} strokeWidth={stroke} />
            {canShowLabel && <text x={cut.x + cut.widthMm / 2} y={cut.y + cut.heightMm / 2} textAnchor="middle" dominantBaseline="middle" fill="#334155" fontSize={labelSize} fontWeight="750">{Math.round(cut.widthMm)}×{Math.round(cut.heightMm)}</text>}
          </g>
        );
      })}
      <rect x={stroke / 2} y={stroke / 2} width={width - stroke} height={height - stroke} fill="none" stroke="#334155" strokeWidth={stroke} />
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
    { name: `${material === "drywall" ? "Гипсокартон" : material === "osb" ? "Ориентированно-стружечная плита (ОСП)" : "Листовой материал"} к покупке`, quantity: result.purchaseSheets, unit: "листов", category: "Листовые материалы" },
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
          <div className="mb-3 grid grid-cols-3 gap-2 sm:max-w-lg">{(["drywall", "osb", "custom"] as const).map((value) => <button type="button" key={value} aria-pressed={material === value} onClick={() => changeMaterial(value)} className={`rounded-xl border px-2 py-2 text-sm font-medium ${material === value ? "border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value === "drywall" ? "Гипсокартон" : value === "osb" ? "ОСП-плита" : "Свой лист"}</button>)}</div>
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
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{surface === "wall" ? "Как листы лягут на стену" : surface === "floor" ? "Как листы лягут на пол" : "Как листы лягут на потолок"}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Листы показаны прямо на основании: видны швы, подрезки и размеры деталей.</p></div><button type="button" onClick={exportPng} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400">Скачать PNG</button></div>
        {layers === 2 && <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{[1, 2].map((value) => <button type="button" key={value} onClick={() => setActiveLayer(value)} className={`rounded-lg px-4 py-1.5 text-xs font-medium ${activeLayer === value ? "bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300" : "text-slate-500"}`}>Слой {value}</button>)}</div>}
        <div ref={svgRef} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"><SurfaceLayoutSvg result={result} layer={activeLayer} /></div>
        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3 dark:bg-slate-900 dark:text-slate-300"><span className="flex items-center gap-2"><i className="flex size-6 shrink-0 items-center justify-center rounded-md bg-teal-700 text-[9px] not-italic font-bold text-white">Л1</i> Номер покупного листа</span><span className="flex items-center gap-2"><i className="size-5 shrink-0 rounded border border-teal-700 bg-[repeating-linear-gradient(45deg,#ccfbf1,#ccfbf1_3px,#99f6e4_3px,#99f6e4_4px)]" /> Штриховка — подрезка</span><span className="flex items-center gap-2"><i className="h-0.5 w-5 shrink-0 bg-slate-600" /> Тёмные линии — монтажные швы</span></div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800"><h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Из каких листов вырезать детали</h3><p className="mt-1 text-xs text-slate-500">Метка «Л1» на стене ведёт к карте «Лист 1» ниже. Так видно, где используется целый лист, а где — его остаток.</p>
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
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Раскладка даёт листы и карту реза. Профиль, крепёж, ленту и шпаклёвку считайте комплектно в калькуляторе гипсокартона.</p><div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{material === "drywall" && surface !== "floor" && <Link href={drywallHref} onClick={() => trackToolRelatedClick("raskladka-listov", "drywall-calculator")} className="btn-primary inline-flex text-sm no-underline">Профиль и крепёж →</Link>}<button type="button" onClick={shareLayout} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300">{shareState === "copied" ? "Ссылка скопирована" : "Поделиться раскладкой"}</button><SaveToProjectButton calcId="instrument-raskladka-listov" calcTitle="Раскладка листов" slug="gipsokarton" categorySlug="steny" materials={projectMaterials} calendarScenarioId="room" /></div></div>
      </div>
    </div>
  );
}

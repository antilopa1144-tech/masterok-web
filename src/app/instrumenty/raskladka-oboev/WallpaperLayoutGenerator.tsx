"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import ToolSectionNav from "@/components/tools/ToolSectionNav";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import {
  trackToolExport,
  trackToolPresetSelect,
  trackToolRelatedClick,
} from "@/lib/analytics";
import { shareOrCopy } from "@/lib/clipboard";
import {
  buildRectangleWalls,
  calculateWallpaperLayout,
  WALLPAPER_MATCH_OPTIONS,
  WALLPAPER_ROLL_PRESETS,
  type WallpaperLayoutResult,
  type WallpaperMatchType,
  type WallpaperWallInput,
} from "@/lib/tools/wallpaper-layout";
import {
  buildWallpaperCalculatorHref,
  buildWallpaperLayoutShareHref,
  parseWallpaperLayoutSearchParams,
} from "@/lib/tools/wallpaper-layout-to-calc";

type GeometryMode = "rectangle" | "walls";
type WallpaperPresentationMode = "room" | "walls";
type WallpaperVisualFinish = "botanical-sage" | "art-deco-greige" | "linen-blue" | "terracotta-arches";

const WALLPAPER_VISUAL_FINISHES: Record<WallpaperVisualFinish, {
  label: string;
  description: string;
  textureSrc: string;
  accent: string;
}> = {
  "botanical-sage": {
    label: "Ветви шалфея",
    description: "Светлая ботаника с мягким вертикальным ритмом.",
    textureSrc: "/images/wallpaper-textures/botanical-sage.webp",
    accent: "#78876a",
  },
  "art-deco-greige": {
    label: "Арт-деко",
    description: "Тёплый грейдж с тонкими бронзовыми веерами.",
    textureSrc: "/images/wallpaper-textures/art-deco-greige.webp",
    accent: "#9a7957",
  },
  "linen-blue": {
    label: "Голубой лён",
    description: "Спокойная однотонная фактура с тканевым плетением.",
    textureSrc: "/images/wallpaper-textures/linen-blue.webp",
    accent: "#748f9e",
  },
  "terracotta-arches": {
    label: "Терракота",
    description: "Тёплая современная геометрия с крупным рисунком.",
    textureSrc: "/images/wallpaper-textures/terracotta-arches.webp",
    accent: "#a85f42",
  },
};

const ROOM_PRESETS = [
  { label: "Комната 3 × 4 м", width: 3, length: 4 },
  { label: "Комната 4 × 5 м", width: 4, length: 5 },
  { label: "Спальня 3 × 3,5 м", width: 3, length: 3.5 },
] as const;

async function cloneSvgWithEmbeddedImages(svg: SVGSVGElement): Promise<SVGSVGElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const images = Array.from(clone.querySelectorAll("image"));
  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute("href");
    if (!href || href.startsWith("data:")) return;
    const response = await fetch(href);
    if (!response.ok) throw new Error("Не удалось загрузить фактуру обоев для экспорта");
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    image.setAttribute("href", dataUrl);
  }));
  return clone;
}

function NumberInput({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="input-field min-w-0 w-full"
        />
        <span className="text-xs text-slate-400">{unit}</span>
      </span>
    </label>
  );
}

function WallpaperWallSVG({ result }: { result: WallpaperLayoutResult }) {
  const width = 720;
  const labelWidth = 94;
  const drawingWidth = width - labelWidth - 18;
  const rowHeight = 126;
  const wallHeight = 82;
  const maxWallLength = Math.max(...result.walls.map((wall) => wall.lengthM), 1);
  const height = result.walls.length * rowHeight + 20;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full min-w-[620px]"
      role="img"
      aria-label="Схема полос обоев по стенам"
    >
      <rect width={width} height={height} rx={16} fill="#fffaf3" />
      {result.walls.map((wall, wallIndex) => {
        const y = 24 + wallIndex * rowHeight;
        const scale = drawingWidth / maxWallLength;
        let cursor = labelWidth;
        return (
          <g key={wall.id}>
            <text x={8} y={y + 23} fill="#334155" fontSize={12} fontWeight={700}>{wall.name}</text>
            <text x={8} y={y + 42} fill="#64748b" fontSize={11}>{wall.lengthM.toLocaleString("ru-RU")} м</text>
            {wall.strips.map((strip) => {
              const stripWidth = strip.widthM * scale;
              const x = cursor;
              cursor += stripWidth;
              const fill = strip.patternPhaseCm > 0 ? "#fdba74" : strip.isEdge ? "#fed7aa" : "#fb923c";
              return (
                <g key={strip.id}>
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(stripWidth, 1)}
                    height={wallHeight}
                    fill={fill}
                    stroke="#9a3412"
                    strokeWidth={0.8}
                  />
                  <path
                    d={`M ${x + 3} ${y + 14} Q ${x + stripWidth / 2} ${y + 3 + strip.patternPhaseCm / 4} ${x + stripWidth - 3} ${y + 14}`}
                    fill="none"
                    stroke="#fff7ed"
                    strokeWidth={2}
                    opacity={0.9}
                  />
                  {stripWidth >= 22 && (
                    <text
                      x={x + stripWidth / 2}
                      y={y + wallHeight / 2 + 4}
                      textAnchor="middle"
                      fill="#7c2d12"
                      fontSize={stripWidth >= 34 ? 10 : 8}
                      fontWeight={700}
                    >
                      {strip.indexOnWall + 1}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={labelWidth} y1={y + wallHeight + 8} x2={labelWidth + wall.lengthM * scale} y2={y + wallHeight + 8} stroke="#94a3b8" />
            <text x={labelWidth + wall.lengthM * scale / 2} y={y + wallHeight + 23} textAnchor="middle" fill="#64748b" fontSize={10}>
              {wall.strips.length} полос
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WallpaperRoomSVG({
  result,
  wallIndex,
  finish,
  textureScale,
  showWindow,
  showDoor,
  windowWidthM,
  windowHeightM,
  windowPositionPercent,
  doorWidthM,
  doorHeightM,
  doorPositionPercent,
  testId = "wallpaper-room-preview",
}: {
  result: WallpaperLayoutResult;
  wallIndex: number;
  finish: WallpaperVisualFinish;
  textureScale: number;
  showWindow: boolean;
  showDoor: boolean;
  windowWidthM: number;
  windowHeightM: number;
  windowPositionPercent: number;
  doorWidthM: number;
  doorHeightM: number;
  doorPositionPercent: number;
  testId?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const palette = WALLPAPER_VISUAL_FINISHES[finish];
  const wall = result.walls[Math.min(wallIndex, Math.max(result.walls.length - 1, 0))];
  if (!wall) return null;
  const patternId = `wallpaper-room-pattern-${uid}`;
  const shadowId = `wallpaper-room-shadow-${uid}`;
  const back = { x: 148, y: 54, width: 464, height: 274 };
  const seamStep = back.width / Math.max(wall.strips.length, 1);
  const patternSize = 230 * Math.min(1.8, Math.max(0.6, textureScale / 100));
  const horizontalScale = back.width / Math.max(wall.lengthM, 0.3);
  const verticalScale = back.height / Math.max(result.input.wallHeightM, 1.5);
  const windowWidth = Math.min(back.width * 0.52, Math.max(48, windowWidthM * horizontalScale));
  const windowHeight = Math.min(back.height * 0.62, Math.max(48, windowHeightM * verticalScale));
  const windowX = Math.min(
    back.x + back.width - windowWidth - 12,
    Math.max(back.x + 12, back.x + back.width * (windowPositionPercent / 100) - windowWidth / 2),
  );
  const windowY = back.y + back.height - windowHeight - Math.min(86, 0.82 * verticalScale);
  const doorWidth = Math.min(back.width * 0.34, Math.max(42, doorWidthM * horizontalScale));
  const doorHeight = Math.min(back.height * 0.88, Math.max(118, doorHeightM * verticalScale));
  const doorX = Math.min(
    back.x + back.width - doorWidth - 10,
    Math.max(back.x + 10, back.x + back.width * (doorPositionPercent / 100) - doorWidth / 2),
  );
  const doorY = back.y + back.height - doorHeight;
  const wallTitle = wall.name.length > 18 ? `${wall.name.slice(0, 17)}…` : wall.name;

  return (
    <svg
      data-testid={testId}
      viewBox="0 0 760 430"
      className="h-auto w-full rounded-xl border border-slate-200 bg-[#e9e5df] dark:border-slate-700"
      role="img"
      aria-label={`Объёмная модель комнаты: ${wall.name}, декор ${palette.label.toLowerCase()}`}
    >
      <defs>
        <pattern id={patternId} width={patternSize} height={patternSize} patternUnits="userSpaceOnUse">
          <image href={palette.textureSrc} width={patternSize} height={patternSize} preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1f2937" floodOpacity="0.22" />
        </filter>
        <linearGradient id={`wallpaper-floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d5c1a6" />
          <stop offset="1" stopColor="#a98763" />
        </linearGradient>
        <linearGradient id={`wallpaper-window-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8eef7" />
          <stop offset="1" stopColor="#fff4d4" />
        </linearGradient>
      </defs>

      <rect width="760" height="430" fill="#ece8e2" />
      <polygon points="70,104 148,54 148,328 28,396" fill={`url(#${patternId})`} stroke="#938779" strokeWidth="1.4" />
      <polygon points="612,54 690,104 732,396 612,328" fill={`url(#${patternId})`} stroke="#8e8275" strokeWidth="1.4" />
      <rect x={back.x} y={back.y} width={back.width} height={back.height} fill={`url(#${patternId})`} stroke="#887c70" strokeWidth="1.6" />
      <polygon points="28,396 148,328 612,328 732,396" fill={`url(#wallpaper-floor-${uid})`} stroke="#775f49" strokeWidth="1.4" />
      <polygon points="70,104 148,54 612,54 690,104 648,24 112,24" fill="#f5f1eb" stroke="#c9c0b6" strokeWidth="1" />

      {wall.strips.slice(1).map((strip, index) => {
        const x = back.x + seamStep * (index + 1);
        return (
          <g key={strip.id}>
            <line x1={x} y1={back.y} x2={x} y2={back.y + back.height} stroke={palette.accent} strokeWidth="0.8" opacity="0.54" />
            {strip.patternPhaseCm > 0 && <circle cx={x + 4} cy={back.y + 13} r="2.8" fill="#f97316" opacity="0.78" />}
          </g>
        );
      })}

      <g filter={`url(#${shadowId})`}>
        {showWindow && (
          <g data-testid={`${testId}-window`}>
            <rect x={windowX} y={windowY} width={windowWidth} height={windowHeight} rx="3" fill={`url(#wallpaper-window-${uid})`} stroke="#78838a" strokeWidth="5" />
            <line x1={windowX + windowWidth / 2} y1={windowY + 2} x2={windowX + windowWidth / 2} y2={windowY + windowHeight - 2} stroke="#a3adb3" strokeWidth="3" />
            <line x1={windowX + 2} y1={windowY + windowHeight / 2} x2={windowX + windowWidth - 2} y2={windowY + windowHeight / 2} stroke="#a3adb3" strokeWidth="3" />
          </g>
        )}
        {showDoor && (
          <g data-testid={`${testId}-door`}>
            <rect x={doorX} y={doorY} width={doorWidth} height={doorHeight} rx="2" fill="#9f8266" stroke="#62503e" strokeWidth="3" />
            <rect x={doorX + doorWidth * 0.14} y={doorY + doorHeight * 0.08} width={doorWidth * 0.72} height={doorHeight * 0.34} rx="2" fill="#af9274" stroke="#775e48" />
            <rect x={doorX + doorWidth * 0.14} y={doorY + doorHeight * 0.48} width={doorWidth * 0.72} height={doorHeight * 0.42} rx="2" fill="#a98a6d" stroke="#775e48" />
            <circle cx={doorX + doorWidth * 0.2} cy={doorY + doorHeight * 0.46} r="3.2" fill="#e3bf6b" stroke="#6b543b" />
          </g>
        )}
      </g>

      <g filter={`url(#${shadowId})`}>
        <ellipse cx="376" cy="347" rx="122" ry="17" fill="#332b25" opacity="0.2" />
        <polygon points="274,284 478,284 490,321 262,321" fill="#a8a099" stroke="#665f58" strokeWidth="1.2" />
        <polygon points="262,321 490,321 466,354 286,354" fill="#beb6ae" stroke="#665f58" strokeWidth="1.2" />
        <polygon points="262,299 280,296 294,350 276,358" fill="#8e867e" stroke="#665f58" />
        <polygon points="472,296 490,299 476,358 458,350" fill="#8e867e" stroke="#665f58" />
        <line x1="376" y1="286" x2="376" y2="320" stroke="#776f68" />
        <line x1="376" y1="322" x2="376" y2="351" stroke="#817971" />
      </g>

      <g transform="translate(28 24)">
        <rect width="202" height="28" rx="14" fill="#111827" opacity="0.86" />
        <text x="16" y="18" fill="#fff" fontSize="11" fontWeight="750">{wallTitle.toUpperCase()} · {wall.strips.length} ПОЛОС</text>
      </g>
      <g transform="translate(570 24)">
        <rect width="162" height="28" rx="14" fill="#fff" opacity="0.92" />
        <text x="81" y="18" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="700">{wall.lengthM.toLocaleString("ru-RU")} × {result.input.wallHeightM.toLocaleString("ru-RU")} м</text>
      </g>
    </svg>
  );
}

function RollPlan({ result, limit }: { result: WallpaperLayoutResult; limit?: number }) {
  if (result.rolls.length === 0) return null;
  const visibleRolls = limit == null ? result.rolls : result.rolls.slice(0, limit);

  return (
    <div className="space-y-3">
      {visibleRolls.map((roll) => (
        <div key={roll.index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Рулон {roll.index}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {roll.cuts.length} полос · остаток {roll.remainderM.toLocaleString("ru-RU")} м
              {roll.remainderUse === "full-strip" ? " — хватит на полосу" : roll.remainderUse === "patch" ? " — для участков" : ""}
            </span>
          </div>
          <div className="relative h-9 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800" aria-label={`Раскрой рулона ${roll.index}`}>
            {roll.cuts.map((cut) => (
              <div key={cut.stripId}>
                {cut.alignmentWasteM > 0.001 && (
                  <span
                    className="absolute inset-y-0 bg-rose-300/80 dark:bg-rose-700/70"
                    style={{
                      left: `${((cut.startM - cut.alignmentWasteM) / result.input.rollLengthM) * 100}%`,
                      width: `${(cut.alignmentWasteM / result.input.rollLengthM) * 100}%`,
                    }}
                    title={`Подгонка рисунка: ${cut.alignmentWasteM.toLocaleString("ru-RU")} м`}
                  />
                )}
                <span
                  className="absolute inset-y-0 border-r border-white/70 bg-orange-400 dark:bg-orange-600"
                  style={{
                    left: `${(cut.startM / result.input.rollLengthM) * 100}%`,
                    width: `${(cut.cutLengthM / result.input.rollLengthM) * 100}%`,
                  }}
                  title={`${cut.wallName}, полоса ${cut.stripNumber}: ${cut.cutLengthM.toLocaleString("ru-RU")} м`}
                />
              </div>
            ))}
            {roll.remainderM > 0.001 && (
              <span
                className={`absolute inset-y-0 right-0 ${roll.remainderUse === "full-strip" ? "bg-emerald-400 dark:bg-emerald-700" : roll.remainderUse === "patch" ? "bg-lime-300 dark:bg-lime-700" : "bg-slate-300 dark:bg-slate-600"}`}
                style={{ width: `${(roll.remainderM / result.input.rollLengthM) * 100}%` }}
                title={`Остаток: ${roll.remainderM.toLocaleString("ru-RU")} м`}
              />
            )}
          </div>
          <p className="mt-2 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {roll.cuts.map((cut) => `${cut.wallName} · №${cut.stripNumber}`).join("  •  ")}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function WallpaperLayoutGenerator() {
  const searchParams = useSearchParams();
  const [geometryMode, setGeometryMode] = useState<GeometryMode>("rectangle");
  const [roomWidth, setRoomWidth] = useState(4);
  const [roomLength, setRoomLength] = useState(5);
  const [customWalls, setCustomWalls] = useState<WallpaperWallInput[]>(buildRectangleWalls(4, 5));
  const [wallHeight, setWallHeight] = useState(2.7);
  const [rollWidth, setRollWidth] = useState(0.53);
  const [rollLength, setRollLength] = useState(10.05);
  const [matchType, setMatchType] = useState<WallpaperMatchType>("free");
  const [rapport, setRapport] = useState(0);
  const [offset, setOffset] = useState(32);
  const [trimAllowance, setTrimAllowance] = useState(10);
  const [reserveRolls, setReserveRolls] = useState(1);
  const [showAllRolls, setShowAllRolls] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [exportState, setExportState] = useState<"idle" | "preparing" | "done" | "error">("idle");
  const [presentationMode, setPresentationMode] = useState<WallpaperPresentationMode>("room");
  const [visualFinish, setVisualFinish] = useState<WallpaperVisualFinish>("botanical-sage");
  const [comparisonFinish, setComparisonFinish] = useState<WallpaperVisualFinish>("art-deco-greige");
  const [compareMode, setCompareMode] = useState(false);
  const [textureScale, setTextureScale] = useState(100);
  const [showWindow, setShowWindow] = useState(true);
  const [showDoor, setShowDoor] = useState(true);
  const [windowWidthM, setWindowWidthM] = useState(1.4);
  const [windowHeightM, setWindowHeightM] = useState(1.25);
  const [windowPositionPercent, setWindowPositionPercent] = useState(37);
  const [doorWidthM, setDoorWidthM] = useState(0.9);
  const [doorHeightM, setDoorHeightM] = useState(2.1);
  const [doorPositionPercent, setDoorPositionPercent] = useState(82);
  const [activeWallIndex, setActiveWallIndex] = useState(0);
  const hydratedFromUrl = useRef(false);
  const svgRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { hasStarted, markStarted, selectMode } = useToolAnalytics("raskladka-oboev", resultRef);

  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;
    const parsed = parseWallpaperLayoutSearchParams(new URLSearchParams(searchParams.toString()));
    if (parsed.geometryMode != null) setGeometryMode(parsed.geometryMode);
    if (parsed.roomWidth != null) setRoomWidth(parsed.roomWidth);
    if (parsed.roomLength != null) setRoomLength(parsed.roomLength);
    if (parsed.walls != null) setCustomWalls(parsed.walls);
    if (parsed.perimeter != null && parsed.walls == null) {
      setGeometryMode("walls");
      setCustomWalls([{ id: "wall-1", name: "Все стены", lengthM: parsed.perimeter }]);
    }
    if (parsed.height != null) setWallHeight(parsed.height);
    if (parsed.rollLength != null) setRollLength(parsed.rollLength);
    if (parsed.rollWidthM != null) setRollWidth(parsed.rollWidthM);
    if (parsed.rapport != null && parsed.rapport > 0) {
      setRapport(parsed.rapport);
      setOffset(parsed.rapport / 2);
      setMatchType("straight");
    }
    if (parsed.matchType != null) setMatchType(parsed.matchType);
    if (parsed.offset != null) setOffset(parsed.offset);
    if (parsed.trimAllowance != null) setTrimAllowance(parsed.trimAllowance);
    if (parsed.reserveRolls != null) setReserveRolls(parsed.reserveRolls);
  }, [searchParams]);

  const walls = useMemo(
    () => geometryMode === "rectangle" ? buildRectangleWalls(roomWidth, roomLength) : customWalls,
    [customWalls, geometryMode, roomLength, roomWidth],
  );
  const result = useMemo(
    () => calculateWallpaperLayout({
      walls,
      wallHeightM: wallHeight,
      rollWidthM: rollWidth,
      rollLengthM: rollLength,
      matchType,
      rapportCm: rapport,
      offsetCm: offset,
      trimAllowanceCm: trimAllowance,
      reserveRolls,
    }),
    [matchType, offset, rapport, reserveRolls, rollLength, rollWidth, trimAllowance, wallHeight, walls],
  );
  const resolvedActiveWallIndex = Math.min(activeWallIndex, Math.max(result.walls.length - 1, 0));
  const calculatorHref = useMemo(
    () => buildWallpaperCalculatorHref(result.input, result.purchaseRolls),
    [result],
  );
  const projectMaterials = useMemo(() => [
    { name: "Обои к покупке", quantity: result.purchaseRolls, unit: "рулонов", category: "Обои" },
    { name: "Площадь стен без вычета проёмов", quantity: result.wallAreaM2, unit: "м²", category: "Обои" },
  ], [result.purchaseRolls, result.wallAreaM2]);

  const scrollTo = useCallback((ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const start = useCallback((source: "surface_size" | "material_size" | "preset") => markStarted(source), [markStarted]);

  const changeMatchType = (next: WallpaperMatchType) => {
    selectMode(next);
    setMatchType(next);
    if (next !== "free" && rapport <= 0) {
      setRapport(64);
      setOffset(32);
    }
  };

  const updateWall = (id: string, value: number) => {
    start("surface_size");
    setCustomWalls((current) => current.map((wall) => wall.id === id ? { ...wall, lengthM: value } : wall));
  };

  const exportPng = useCallback(async () => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    setExportState("preparing");
    try {
      trackToolExport("raskladka-oboev", "png");
      const exportSvg = await cloneSvgWithEmbeddedImages(svg);
      const data = new XMLSerializer().serializeToString(exportSvg);
      const canvas = document.createElement("canvas");
      const image = new Image();
      image.onload = () => {
        canvas.width = image.width * 2;
        canvas.height = image.height * 2;
        const context = canvas.getContext("2d");
        if (!context) {
          setExportState("error");
          return;
        }
        context.scale(2, 2);
        context.drawImage(image, 0, 0);
        const link = document.createElement("a");
        link.download = "raskladka-oboev.png";
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        link.remove();
        setExportState("done");
        window.setTimeout(() => setExportState("idle"), 2500);
      };
      image.onerror = () => setExportState("error");
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
    } catch {
      setExportState("error");
    }
  }, []);

  const shareLayout = useCallback(async () => {
    const href = buildWallpaperLayoutShareHref({
      geometryMode,
      roomWidth,
      roomLength,
      input: result.input,
    });
    const outcome = await shareOrCopy({
      title: "Раскладка обоев",
      text: `Раскладка: ${result.purchaseRolls} рулонов, ${result.stripCount} полос`,
      url: `${window.location.origin}${href}`,
    });
    if (outcome === "copied") {
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2500);
    }
  }, [geometryMode, result, roomLength, roomWidth]);

  return (
    <div className="space-y-4">
      <RenovationHubStrip scenarioId="room" compact />
      <ToolSectionNav visible={hasStarted} onParameters={() => scrollTo(parametersRef)} onLayout={() => scrollTo(layoutRef)} onResult={() => scrollTo(resultRef)} />

      <div className="wallpaper-workspace grid items-start gap-4">
      <div ref={parametersRef} className="card scroll-mt-24 space-y-6 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Параметры раскладки</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Схема и раскрой обновляются сразу — отдельная кнопка расчёта не нужна.</p>
          </div>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            {result.perimeterM.toLocaleString("ru-RU")} м · {result.wallAreaM2.toLocaleString("ru-RU")} м²
          </span>
        </div>

        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex size-6 items-center justify-center rounded-full bg-orange-100 text-xs text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">1</span>
            Стены помещения
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:max-w-md">
            {(["rectangle", "walls"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                aria-pressed={geometryMode === mode}
                onClick={() => { start("surface_size"); setGeometryMode(mode); }}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${geometryMode === mode ? "border-orange-400 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
              >
                {mode === "rectangle" ? "Прямоугольная комната" : "Стены по отдельности"}
              </button>
            ))}
          </div>

          {geometryMode === "rectangle" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
                <NumberInput label="Ширина комнаты" value={roomWidth} unit="м" min={0.3} max={50} step={0.1} onChange={(value) => { start("surface_size"); setRoomWidth(value); }} />
                <NumberInput label="Длина комнаты" value={roomLength} unit="м" min={0.3} max={50} step={0.1} onChange={(value) => { start("surface_size"); setRoomLength(value); }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {ROOM_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => { start("preset"); trackToolPresetSelect("raskladka-oboev", "surface", preset.label); setRoomWidth(preset.width); setRoomLength(preset.length); }}
                    className="min-h-11 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 transition-colors hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:text-slate-400"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2 sm:max-w-xl">
              {customWalls.map((wall, index) => (
                <div key={wall.id} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-end gap-2">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-xs text-slate-500">Название</span>
                    <input className="input-field w-full min-w-0" value={wall.name} onChange={(event) => { start("surface_size"); setCustomWalls((current) => current.map((item) => item.id === wall.id ? { ...item, name: event.target.value } : item)); }} />
                  </label>
                  <NumberInput label="Длина" value={wall.lengthM} unit="м" min={0.3} max={50} step={0.1} onChange={(value) => updateWall(wall.id, value)} />
                  <button type="button" aria-label={`Удалить ${wall.name}`} disabled={customWalls.length === 1} onClick={() => setCustomWalls((current) => current.filter((item) => item.id !== wall.id))} className="mb-1 rounded-lg px-2 py-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/20">×</button>
                </div>
              ))}
              {customWalls.length < 20 && (
                <button type="button" onClick={() => { start("surface_size"); const index = customWalls.length + 1; setCustomWalls((current) => [...current, { id: `wall-${Date.now()}`, name: `Стена ${index}`, lengthM: 3 }]); }} className="mt-2 text-sm font-medium text-orange-700 hover:underline dark:text-orange-400">
                  + Добавить стену
                </button>
              )}
            </div>
          )}
          <div className="mt-4 max-w-[13rem]">
            <NumberInput label="Высота помещения" value={wallHeight} unit="м" min={1.5} max={6} step={0.05} onChange={(value) => { start("surface_size"); setWallHeight(value); }} />
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex size-6 items-center justify-center rounded-full bg-orange-100 text-xs text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">2</span>
            Рулон и припуск
          </div>
          <div className="grid grid-cols-1 gap-3">
            <NumberInput label="Ширина рулона" value={rollWidth} unit="м" min={0.4} max={1.5} step={0.01} onChange={(value) => { start("material_size"); setRollWidth(value); }} />
            <NumberInput label="Длина рулона" value={rollLength} unit="м" min={5} max={50} step={0.05} onChange={(value) => { start("material_size"); setRollLength(value); }} />
            <NumberInput label="Припуск на полосу" value={trimAllowance} unit="см" min={0} max={30} step={1} onChange={(value) => { start("material_size"); setTrimAllowance(value); }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Припуск общий — на подрезку у потолка и пола. Практический ориентир: 5–10 см.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {WALLPAPER_ROLL_PRESETS.map((preset) => (
              <button type="button" key={preset.label} onClick={() => { start("preset"); trackToolPresetSelect("raskladka-oboev", "material", preset.label); setRollWidth(preset.widthM); setRollLength(preset.lengthM); }} className={`min-h-11 rounded-lg border px-2.5 py-1 text-xs transition-colors ${rollWidth === preset.widthM && rollLength === preset.lengthM ? "border-orange-300 bg-orange-50 font-medium text-orange-700 dark:bg-orange-900/20" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"}`}>
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex size-6 items-center justify-center rounded-full bg-orange-100 text-xs text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">3</span>
            Подгонка рисунка
          </div>
          <div className="grid grid-cols-1 gap-2">
            {WALLPAPER_MATCH_OPTIONS.map((option) => (
              <button type="button" key={option.value} aria-pressed={matchType === option.value} onClick={() => changeMatchType(option.value)} className={`min-h-11 rounded-xl border p-3 text-left transition-all ${matchType === option.value ? "border-orange-400 bg-orange-50 shadow-sm dark:bg-orange-900/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"}`}>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.label}</span>
                <span className="mt-1 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">{option.description}</span>
              </button>
            ))}
          </div>
          {matchType !== "free" && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <NumberInput label="Раппорт" value={rapport} unit="см" min={1} max={150} step={0.5} onChange={(value) => { start("material_size"); setRapport(value); if (matchType === "offset" && offset >= value) setOffset(value / 2); }} />
              {matchType === "offset" && <NumberInput label="Смещение" value={offset} unit="см" min={0.1} max={Math.max(0.1, rapport - 0.1)} step={0.5} onChange={(value) => { start("material_size"); setOffset(value); }} />}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Смотрите обозначение на этикетке: одно число — раппорт; два числа, например 64/32, — раппорт и смещение.
          </p>
        </section>

        <section className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="max-w-[13rem]">
            <NumberInput label="Закрытый рулон в резерв" value={reserveRolls} unit="шт" min={0} max={10} step={1} onChange={(value) => { start("material_size"); setReserveRolls(value); }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Резерв хранится для брака и ремонта. Он не считается отходом и не участвует в раскрое.</p>
        </section>
      </div>

      <div ref={layoutRef} className="card scroll-mt-24 space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Как обои будут выглядеть в комнате</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Сравните интерьерный вид с точной развёрткой полос и планом раскроя.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900" aria-label="Режим визуализации обоев">
              <button type="button" aria-pressed={presentationMode === "room"} onClick={() => setPresentationMode("room")} className={`min-h-11 rounded-md px-3 text-xs font-semibold ${presentationMode === "room" ? "bg-white text-orange-700 shadow-sm dark:bg-slate-800 dark:text-orange-300" : "text-slate-500"}`}>2.5D</button>
              <button type="button" aria-pressed={presentationMode === "walls"} onClick={() => setPresentationMode("walls")} className={`min-h-11 rounded-md px-3 text-xs font-semibold ${presentationMode === "walls" ? "bg-white text-orange-700 shadow-sm dark:bg-slate-800 dark:text-orange-300" : "text-slate-500"}`}>Развёртка</button>
            </div>
            <button type="button" onClick={exportPng} disabled={exportState === "preparing"} className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 transition-colors hover:border-orange-300 hover:text-orange-700 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-400">
              {exportState === "preparing" ? "Готовим PNG…" : exportState === "done" ? "PNG скачан" : exportState === "error" ? "Не удалось скачать" : compareMode && presentationMode === "room" ? "PNG варианта A" : "Скачать PNG"}
            </button>
          </div>
        </div>

        <div data-testid="wallpaper-finish-controls" className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Декор обоев</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Меняет только визуализацию и не влияет на количество рулонов.</p>
            </div>
            <button
              data-testid="wallpaper-compare-toggle"
              type="button"
              aria-pressed={compareMode}
              onClick={() => setCompareMode((current) => !current)}
              className={`min-h-11 shrink-0 rounded-lg border px-3 text-[10px] font-semibold transition-colors ${compareMode ? "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
            >
              {compareMode ? "Закрыть сравнение" : "Сравнить"}
            </button>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400">Вариант A</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Декор обоев, вариант A">
            {(Object.entries(WALLPAPER_VISUAL_FINISHES) as [WallpaperVisualFinish, (typeof WALLPAPER_VISUAL_FINISHES)[WallpaperVisualFinish]][]).map(([value, finish]) => (
              <button key={value} type="button" aria-pressed={visualFinish === value} onClick={() => setVisualFinish(value)} className={`min-h-16 rounded-xl border p-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${visualFinish === value ? "border-orange-500 bg-white shadow-sm ring-1 ring-orange-500/20 dark:bg-slate-900" : "border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60"}`}>
                <span className="block h-8 rounded-lg bg-cover bg-center shadow-inner" style={{ backgroundImage: `url(${finish.textureSrc})` }} />
                <span className="mt-1.5 block truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{finish.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{WALLPAPER_VISUAL_FINISHES[visualFinish].description}</p>
          {compareMode && (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-300">Вариант B</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Декор обоев, вариант B">
                {(Object.entries(WALLPAPER_VISUAL_FINISHES) as [WallpaperVisualFinish, (typeof WALLPAPER_VISUAL_FINISHES)[WallpaperVisualFinish]][]).map(([value, finish]) => (
                  <button key={value} type="button" aria-pressed={comparisonFinish === value} onClick={() => setComparisonFinish(value)} className={`min-h-16 rounded-xl border p-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${comparisonFinish === value ? "border-violet-500 bg-white shadow-sm ring-1 ring-violet-500/20 dark:bg-slate-900" : "border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60"}`}>
                    <span className="block h-8 rounded-lg bg-cover bg-center shadow-inner" style={{ backgroundImage: `url(${finish.textureSrc})` }} />
                    <span className="mt-1.5 block truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{finish.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{WALLPAPER_VISUAL_FINISHES[comparisonFinish].description}</p>
            </div>
          )}
        </div>

        {presentationMode === "room" && (
          <div data-testid="wallpaper-scene-controls" className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Настройка комнаты</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Проёмы и масштаб нужны для примерки и не меняют расчёт рулонов.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={showWindow} onClick={() => setShowWindow((current) => !current)} className={`min-h-11 rounded-lg border px-3 text-[10px] font-semibold ${showWindow ? "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>Окно</button>
                <button type="button" aria-pressed={showDoor} onClick={() => setShowDoor((current) => !current)} className={`min-h-11 rounded-lg border px-3 text-[10px] font-semibold ${showDoor ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>Дверь</button>
              </div>
            </div>
            <label className="mt-4 block">
              <span className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Масштаб рисунка</span>
                <strong data-testid="wallpaper-texture-scale-value" className="text-slate-900 dark:text-slate-100">{textureScale}%</strong>
              </span>
              <input data-testid="wallpaper-texture-scale" type="range" min="60" max="180" step="5" value={textureScale} onChange={(event) => setTextureScale(Number(event.target.value))} className="mt-2 h-11 w-full accent-orange-500" />
              <span className="flex justify-between text-[9px] text-slate-400"><span>Мельче</span><span>Крупнее</span></span>
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2" aria-label="Быстрый масштаб рисунка">
              {([80, 100, 150] as const).map((value) => (
                <button key={value} type="button" aria-pressed={textureScale === value} onClick={() => setTextureScale(value)} className={`min-h-11 rounded-lg border text-[10px] font-semibold ${textureScale === value ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>{value}%</button>
              ))}
            </div>
            {(showWindow || showDoor) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {showWindow && (
                  <div data-testid="wallpaper-window-controls" className="rounded-xl bg-sky-50/70 p-3 dark:bg-sky-950/20">
                    <p className="mb-3 text-xs font-semibold text-sky-800 dark:text-sky-200">Окно</p>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput label="Ширина" value={windowWidthM} unit="м" min={0.4} max={3} step={0.1} onChange={setWindowWidthM} />
                      <NumberInput label="Высота" value={windowHeightM} unit="м" min={0.4} max={2.4} step={0.1} onChange={setWindowHeightM} />
                    </div>
                    <label className="mt-3 block text-[10px] text-slate-500 dark:text-slate-400">Положение по стене · {windowPositionPercent}%<input data-testid="wallpaper-window-position" type="range" min="15" max="70" step="1" value={windowPositionPercent} onChange={(event) => setWindowPositionPercent(Number(event.target.value))} className="mt-1 h-11 w-full accent-sky-500" /></label>
                  </div>
                )}
                {showDoor && (
                  <div data-testid="wallpaper-door-controls" className="rounded-xl bg-amber-50/70 p-3 dark:bg-amber-950/20">
                    <p className="mb-3 text-xs font-semibold text-amber-900 dark:text-amber-200">Дверь</p>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput label="Ширина" value={doorWidthM} unit="м" min={0.6} max={2} step={0.1} onChange={setDoorWidthM} />
                      <NumberInput label="Высота" value={doorHeightM} unit="м" min={1.6} max={2.6} step={0.1} onChange={setDoorHeightM} />
                    </div>
                    <label className="mt-3 block text-[10px] text-slate-500 dark:text-slate-400">Положение по стене · {doorPositionPercent}%<input data-testid="wallpaper-door-position" type="range" min="35" max="90" step="1" value={doorPositionPercent} onChange={(event) => setDoorPositionPercent(Number(event.target.value))} className="mt-1 h-11 w-full accent-amber-500" /></label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5" aria-label="Стена для объёмного просмотра">
          {result.walls.map((wall, index) => (
              <button key={wall.id} type="button" aria-pressed={resolvedActiveWallIndex === index} onClick={() => setActiveWallIndex(index)} className={`min-h-11 rounded-lg border px-3 text-[11px] font-semibold ${resolvedActiveWallIndex === index ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300"}`}>
              {wall.name} · {wall.strips.length}
            </button>
          ))}
        </div>

        <div ref={svgRef} className={presentationMode === "walls" ? "overflow-x-auto rounded-xl border border-orange-100 bg-orange-50/40 dark:border-slate-700 dark:bg-slate-900" : undefined}>
          {presentationMode === "room" ? (
            <div data-testid="wallpaper-room-comparison" className={compareMode ? "grid gap-3 lg:grid-cols-2" : undefined}>
              <figure>
                {compareMode && <figcaption className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Вариант A · {WALLPAPER_VISUAL_FINISHES[visualFinish].label}</figcaption>}
                <WallpaperRoomSVG result={result} wallIndex={resolvedActiveWallIndex} finish={visualFinish} textureScale={textureScale} showWindow={showWindow} showDoor={showDoor} windowWidthM={windowWidthM} windowHeightM={windowHeightM} windowPositionPercent={windowPositionPercent} doorWidthM={doorWidthM} doorHeightM={doorHeightM} doorPositionPercent={doorPositionPercent} />
              </figure>
              {compareMode && (
                <figure>
                  <figcaption className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">Вариант B · {WALLPAPER_VISUAL_FINISHES[comparisonFinish].label}</figcaption>
                  <WallpaperRoomSVG result={result} wallIndex={resolvedActiveWallIndex} finish={comparisonFinish} textureScale={textureScale} showWindow={showWindow} showDoor={showDoor} windowWidthM={windowWidthM} windowHeightM={windowHeightM} windowPositionPercent={windowPositionPercent} doorWidthM={doorWidthM} doorHeightM={doorHeightM} doorPositionPercent={doorPositionPercent} testId="wallpaper-room-preview-compare" />
                </figure>
              )}
            </div>
          ) : (
            <WallpaperWallSVG result={result} />
          )}
        </div>
        {presentationMode === "walls" && <p className="-mt-3 text-[11px] text-slate-400 sm:hidden">Развёртку можно прокручивать по горизонтали.</p>}
        {presentationMode === "room" && <p className="-mt-3 text-[11px] leading-relaxed text-slate-400">Окно и дверь показывают масштаб. Как и в расчёте, полотна заводятся на проёмы и подрезаются на месте — автоматического вычета нет.</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-orange-400" /> Полоса без сдвига</span>
          {matchType === "offset" && <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-orange-300" /> Полоса со смещением</span>}
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-orange-200" /> Крайняя подрезка</span>
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Раскрой рулонов</h3>
          <div className="my-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-5 rounded-sm bg-orange-400" /> Полотно</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-5 rounded-sm bg-rose-300" /> Подгонка рисунка</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-5 rounded-sm bg-emerald-400" /> На полную полосу</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-5 rounded-sm bg-lime-300" /> Для участков от 1 м</span>
          </div>
          {result.baseRolls > 0 ? (
            <>
              <RollPlan result={result} limit={showAllRolls ? undefined : 4} />
              {result.rolls.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllRolls((current) => !current)}
                  className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300"
                >
                  {showAllRolls ? "Свернуть раскрой" : `Показать все рулоны (${result.rolls.length})`}
                </button>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">Раскрой невозможен с указанной длиной рулона. Проверьте высоту и припуск.</div>
          )}
        </div>
      </div>

      <div ref={resultRef} data-testid="wallpaper-result" className="card scroll-mt-24 p-4 sm:p-5 xl:sticky xl:top-20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Итог к покупке</h2>
        <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800/60 dark:bg-orange-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">Купить рулонов одной партии</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-4xl font-bold text-slate-950 dark:text-white">{result.purchaseRolls}</p>
            <p className="pb-1 text-sm text-slate-600 dark:text-slate-300">{result.baseRolls} в раскрой + {result.reserveRolls} закрытых в резерв</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.stripCount}</p><p className="text-xs text-slate-500">Полос на стенах</p></div>
          <div><p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{result.cutLengthM.toLocaleString("ru-RU")} м</p><p className="text-xs text-slate-500">Длина полосы</p></div>
          <div><p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{result.patternWasteM.toLocaleString("ru-RU")} м</p><p className="text-xs text-slate-500">На подгонку рисунка</p></div>
          <div><p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.fullStripRemainderM.toLocaleString("ru-RU")} м</p><p className="text-xs text-slate-500">На полные полосы</p></div>
        </div>

        <div className="mt-5 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 dark:bg-slate-900">
          <p className="flex justify-between gap-3"><span className="text-slate-500">Стены</span><strong>{result.perimeterM.toLocaleString("ru-RU")} м · {result.wallAreaM2.toLocaleString("ru-RU")} м²</strong></p>
          <p className="flex justify-between gap-3"><span className="text-slate-500">Полос из рулона</span><strong>{result.stripsPerRollRange.min === result.stripsPerRollRange.max ? result.stripsPerRollRange.max : `${result.stripsPerRollRange.min}–${result.stripsPerRollRange.max}`}</strong></p>
          <p className="flex justify-between gap-3"><span className="text-slate-500">Припуск на подрезку</span><strong>{result.trimWasteM.toLocaleString("ru-RU")} м</strong></p>
          <p className="flex justify-between gap-3"><span className="text-slate-500">Остатки открытых рулонов</span><strong>{result.rollRemainderM.toLocaleString("ru-RU")} м</strong></p>
          <p className="flex justify-between gap-3"><span className="text-slate-500">Куски от 1 м для участков</span><strong>{result.patchRemainderM.toLocaleString("ru-RU")} м</strong></p>
          <p className="flex justify-between gap-3 sm:col-span-2"><span className="text-slate-500">Вне полноразмерных полос</span><strong>{result.totalWasteM.toLocaleString("ru-RU")} м · {result.wastePercent.toLocaleString("ru-RU")}%</strong></p>
        </div>

        {result.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            {result.warnings.map((warning) => <p key={warning} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">⚠ {warning}</p>)}
          </div>
        )}
        <ul className="mt-4 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {result.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Для рулонов ориентируйтесь на эту раскладку. В полном калькуляторе по тем же размерам можно дополнительно посчитать клей, грунтовку и инструмент.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={calculatorHref} onClick={() => trackToolRelatedClick("raskladka-oboev", "wallpaper-calculator")} className="btn-primary inline-flex text-sm no-underline">Клей и грунтовка →</Link>
            <button type="button" onClick={shareLayout} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300">
              {shareState === "copied" ? "Ссылка скопирована" : "Поделиться раскладкой"}
            </button>
            <SaveToProjectButton calcId="instrument-raskladka-oboev" calcTitle="Раскладка обоев" slug="oboi" categorySlug="otdelka" materials={projectMaterials} calendarScenarioId="room" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

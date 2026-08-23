"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useState,
  useMemo,
  useRef,
  useId,
  useCallback,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import TileLayoutPassportCard from "@/components/tools/TileLayoutPassportCard";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import { copyText, shareOrCopy } from "@/lib/clipboard";
import { useEstimateExport, type PdfVisual } from "@/lib/export";
import {
  trackToolExport,
  trackToolPresetSelect,
  trackToolRelatedClick,
  trackProjectSave,
} from "@/lib/analytics";
import {
  calculateTileLayout,
  clampLayoutInput,
  clampLayoutInputs,
  compareTileLayoutOpeningAxisStarts,
  compareTileLayoutStartModes,
  computeLayoutSvgBoundsMm,
  LAYOUT_MODE_OPTIONS,
  SURFACE_SIZE_PRESETS,
  TILE_SIZE_PRESETS,
  type LayoutMode,
  type TileStartMode,
  type TileLayoutResult,
} from "@/lib/tools/tile-layout";
import {
  buildPlitkaCalculatorHref,
  buildTileAdhesiveCalculatorHref,
  buildTileGroutCalculatorHref,
  parseTileLayoutFromSearchParams,
} from "@/lib/tools/tile-layout-to-calc";
import {
  buildTileLayoutExportPlan,
} from "@/lib/tools/tile-layout-export";
import {
  buildTileLayoutProjectHref,
  deleteSavedTileLayoutProject,
  parseTileLayoutProjectSearchParams,
  readSavedTileLayoutProjects,
  saveTileLayoutProject,
  type SavedTileLayoutProject,
  type TileLayoutProjectState,
  type TileProjectPresentationMode,
  type TileProjectSurfaceView,
  type TileVisualFinish,
  type TileLightingPreset,
  type TileTextureSource,
} from "@/lib/tools/tile-layout-project";
import {
  calculateTilePackaging,
  DEFAULT_TILE_PACK_AREA_M2,
  DEFAULT_TILE_TILES_PER_BOX,
  estimateTilesPerBoxFromArea,
  isValidTilePackArea,
  isValidTilesPerBox,
  MAX_TILE_PACK_AREA_M2,
  MAX_TILE_TILES_PER_BOX,
  MIN_TILE_PACK_AREA_M2,
  MIN_TILE_TILES_PER_BOX,
  type TilePackagingSource,
} from "@/lib/tools/tile-layout-purchase";

// ── SVG Renderer ─────────────────────────────────────────────────────────────

type TileSurfaceView = TileProjectSurfaceView;
type TilePresentationMode = TileProjectPresentationMode;

type TileVisualPalette = {
  label: string;
  description: string;
  textureSrc: string;
  tones: [
    [string, string, string],
    [string, string, string],
    [string, string, string],
  ];
  grout: string;
  seam: string;
  vein: string;
  highlight: string;
  cut: string;
  glossOpacity: number;
  dark: boolean;
};

const TILE_VISUAL_FINISHES: Record<TileVisualFinish, TileVisualPalette> = {
  limestone: {
    label: "Светлый камень",
    description: "Тёплая матовая поверхность с мягкой природной неоднородностью.",
    textureSrc: "/images/tile-textures/limestone.webp",
    tones: [
      ["#f6f1e8", "#e7ded2", "#d8ccbd"],
      ["#f2ede5", "#e3d9cc", "#d3c5b5"],
      ["#ddd2c5", "#ece4da", "#f7f3ed"],
    ],
    grout: "#91877c",
    seam: "#a69b8f",
    vein: "#8f8171",
    highlight: "#ffffff",
    cut: "#b76720",
    glossOpacity: 0.68,
    dark: false,
  },
  marble: {
    label: "Белый мрамор",
    description: "Холодный светлый фон, выраженные серо-голубые прожилки и лёгкий глянец.",
    textureSrc: "/images/tile-textures/marble.webp",
    tones: [
      ["#ffffff", "#edf0f2", "#d8dde1"],
      ["#f7f9fa", "#e4e8eb", "#cdd4d9"],
      ["#dbe1e5", "#eff2f4", "#ffffff"],
    ],
    grout: "#929ba3",
    seam: "#aab2b8",
    vein: "#687b8b",
    highlight: "#ffffff",
    cut: "#a96c35",
    glossOpacity: 0.86,
    dark: false,
  },
  concrete: {
    label: "Микроцемент",
    description: "Спокойный серо-бежевый материал с матовой минеральной фактурой.",
    textureSrc: "/images/tile-textures/microcement.webp",
    tones: [
      ["#e4e2dd", "#cbc9c3", "#b4b1aa"],
      ["#dbd9d4", "#c2c0ba", "#a9a69f"],
      ["#bbb9b3", "#d0cec8", "#e8e6e1"],
    ],
    grout: "#77756f",
    seam: "#8f8c85",
    vein: "#77756f",
    highlight: "#f8f7f4",
    cut: "#a8652c",
    glossOpacity: 0.4,
    dark: false,
  },
  graphite: {
    label: "Графит",
    description: "Тёмный керамогранит с сатиновым бликом и контрастной геометрией швов.",
    textureSrc: "/images/tile-textures/graphite.webp",
    tones: [
      ["#555b60", "#3e4449", "#292e32"],
      ["#4a5055", "#353b40", "#22272b"],
      ["#2d3338", "#42494e", "#596066"],
    ],
    grout: "#171b1e",
    seam: "#737b81",
    vein: "#9aa5ac",
    highlight: "#d8e0e5",
    cut: "#d08a48",
    glossOpacity: 0.48,
    dark: true,
  },
};

const TILE_GROUT_COLORS = [
  { value: "#f1eee8", label: "Белый" },
  { value: "#d4d0c8", label: "Светло-серый" },
  { value: "#aaa49a", label: "Серый" },
  { value: "#84796d", label: "Бежевый" },
  { value: "#34373a", label: "Графит" },
] as const;

const MAX_TILE_TEXTURE_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TILE_TEXTURE_DATA_URL_LENGTH = 170_000;

async function fileToTileTexture(file: File): Promise<string> {
  if (!/^image\/(?:png|jpe?g|webp)$/i.test(file.type)) {
    throw new Error("Выберите PNG, JPG или WebP");
  }
  if (file.size > MAX_TILE_TEXTURE_FILE_SIZE) {
    throw new Error("Файл больше 8 МБ — выберите изображение поменьше");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Не удалось прочитать изображение"));
      image.src = objectUrl;
    });

    const encode = (size: number, quality: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Браузер не поддерживает обработку изображения");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      return canvas.toDataURL("image/webp", quality);
    };

    const primary = encode(640, 0.82);
    if (primary.length <= MAX_TILE_TEXTURE_DATA_URL_LENGTH) return primary;
    const compact = encode(480, 0.68);
    if (compact.length <= MAX_TILE_TEXTURE_DATA_URL_LENGTH) return compact;
    throw new Error("Не удалось безопасно уменьшить изображение");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function cloneSvgWithEmbeddedImages(svg: SVGSVGElement): Promise<SVGSVGElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const images = Array.from(clone.querySelectorAll("image"));
  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute("href");
    if (!href || href.startsWith("data:")) return;
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) throw new Error("Внешняя текстура не поддерживается");
    const response = await fetch(url);
    if (!response.ok) throw new Error("Не удалось встроить текстуру в изображение");
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Не удалось встроить текстуру"));
      reader.readAsDataURL(blob);
    });
    image.setAttribute("href", dataUrl);
  }));
  return clone;
}

type TileLightingPalette = {
  label: string;
  description: string;
  stage: [string, string, string];
  leftWall: [string, string, string];
  rightWall: [string, string, string];
  floor: [string, string, string];
  ceiling: [string, string];
  lamp: string;
  lampOpacity: number;
  ambient: string;
  ambientOpacity: number;
  vignette: string;
  vignetteOpacity: number;
};

const TILE_LIGHTING_PRESETS: Record<TileLightingPreset, TileLightingPalette> = {
  daylight: {
    label: "Дневной",
    description: "Ровный нейтральный свет — удобен для оценки оттенка и ширины швов.",
    stage: ["#faf8f4", "#f6f2ec", "#f1ece5"],
    leftWall: ["#e2dbd1", "#eee9e1", "#f6f2ec"],
    rightWall: ["#ddd5ca", "#ece6dd", "#f5f0e9"],
    floor: ["#f0d9b4", "#f5e1c2", "#f8e9d0"],
    ceiling: ["#f1ece5", "#fffdfa"],
    lamp: "#fff1c7",
    lampOpacity: 0.42,
    ambient: "#ffffff",
    ambientOpacity: 0.34,
    vignette: "#6b5a49",
    vignetteOpacity: 0.08,
  },
  warm: {
    label: "Тёплый вечер",
    description: "Мягкий тёплый свет показывает, как плитка будет выглядеть вечером.",
    stage: ["#fbf4e9", "#f6e9d8", "#eedbc6"],
    leftWall: ["#dccbbb", "#eadbcb", "#f4e8da"],
    rightWall: ["#d6c3b0", "#e6d4c2", "#f0e2d3"],
    floor: ["#ddb982", "#edcfa0", "#f7dfb9"],
    ceiling: ["#ecddcc", "#fff5e8"],
    lamp: "#ffd17a",
    lampOpacity: 0.66,
    ambient: "#fff0d0",
    ambientOpacity: 0.42,
    vignette: "#704727",
    vignetteOpacity: 0.13,
  },
  contrast: {
    label: "Контрастный",
    description: "Более направленный холодный свет подчёркивает рельеф, края и подрезки.",
    stage: ["#f2f5f6", "#e7ebed", "#dbe0e3"],
    leftWall: ["#cdd3d6", "#e0e5e7", "#eef1f2"],
    rightWall: ["#c4cbd0", "#d9dfe2", "#e9edef"],
    floor: ["#c8b8a4", "#d9c9b5", "#e8dac8"],
    ceiling: ["#e1e6e8", "#f8fafb"],
    lamp: "#dcefff",
    lampOpacity: 0.48,
    ambient: "#ddecff",
    ambientOpacity: 0.3,
    vignette: "#34434f",
    vignetteOpacity: 0.17,
  },
};

async function renderSvgToPngVisual(svg: SVGSVGElement, title: string): Promise<PdfVisual> {
  const viewBox = svg.viewBox.baseVal;
  const sourceWidth = viewBox.width || svg.clientWidth || 760;
  const sourceHeight = viewBox.height || svg.clientHeight || 460;
  const targetWidth = Math.min(Math.max(Math.ceil(sourceWidth * 2), 1200), 1800);
  const scale = targetWidth / sourceWidth;
  const targetHeight = Math.ceil(sourceHeight * scale);
  const exportSvg = await cloneSvgWithEmbeddedImages(svg);
  const svgData = new XMLSerializer().serializeToString(exportSvg);
  const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Не удалось подготовить изображение «${title}»`));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Браузер не поддерживает подготовку изображения для PDF");
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    return {
      title,
      dataUrl: canvas.toDataURL("image/png"),
      aspectRatio: sourceWidth / sourceHeight,
    };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function WorkspaceSteps({
  onParameters,
  onLayout,
  onResult,
}: {
  onParameters: () => void;
  onLayout: () => void;
  onResult: () => void;
}) {
  const steps = [
    { number: 1, label: "Параметры", onClick: onParameters },
    { number: 2, label: "Схема", onClick: onLayout },
    { number: 3, label: "Результат", onClick: onResult },
  ];

  return (
    <nav
      aria-label="Этапы работы с раскладкой"
      data-testid="tile-workspace-steps"
      className="sticky top-16 z-20 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur sm:static sm:bg-white sm:shadow-sm dark:border-slate-700 dark:bg-slate-900/95 dark:sm:bg-slate-900"
    >
      {steps.map((step, index) => (
        <button
          key={step.number}
          type="button"
          onClick={step.onClick}
          className={`flex min-h-11 items-center justify-center gap-1.5 px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500/60 sm:min-h-12 sm:gap-2 sm:px-4 sm:text-sm dark:text-slate-300 dark:hover:bg-accent-900/20 dark:hover:text-accent-300 ${index < steps.length - 1 ? "border-r border-slate-200 dark:border-slate-700" : ""}`}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
            {step.number}
          </span>
          {step.label}
        </button>
      ))}
    </nav>
  );
}

function tileModeLabel(mode: LayoutMode): string {
  return LAYOUT_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? "Раскладка";
}

const TILE_START_OPTIONS: Array<{ value: TileStartMode; label: string; short: string }> = [
  { value: "edge", label: "От края", short: "Быстрый старт с целой плитки" },
  { value: "center", label: "По центру", short: "Равные и более крупные края" },
  { value: "custom", label: "Свой сдвиг", short: "Заданные подрезки слева и сверху" },
];

function tileStartLabel(mode: TileStartMode, layoutMode?: LayoutMode): string {
  if (layoutMode === "diagonal") return "Автоматически по центру";
  return TILE_START_OPTIONS.find((option) => option.value === mode)?.label ?? "От края";
}

type TileSceneMetrics = {
  padX: number;
  padTop: number;
  padBottom: number;
  depth: number;
  floorDepth: number;
};

function getTileSceneMetrics(width: number, height: number, surfaceView: TileSurfaceView): TileSceneMetrics {
  if (surfaceView === "floor") {
    return { padX: 34, padTop: 48, padBottom: 30, depth: 0, floorDepth: 0 };
  }

  const depth = Math.max(42, Math.min(width * 0.18, 84));
  const floorDepth = Math.max(48, Math.min(height * 0.17, 82));
  return {
    padX: depth + 34,
    padTop: 58,
    padBottom: floorDepth + 38,
    depth,
    floorDepth,
  };
}

function TileSceneDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <linearGradient id={`${idPrefix}-room-left`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#d7ccbd" />
        <stop offset="0.72" stopColor="#eae2d7" />
        <stop offset="1" stopColor="#f5f0e9" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-room-right`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#cfc2b2" />
        <stop offset="0.72" stopColor="#e3d9cc" />
        <stop offset="1" stopColor="#f1ebe3" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-room-floor`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e5ddd3" />
        <stop offset="0.58" stopColor="#d8cbbd" />
        <stop offset="1" stopColor="#c7b4a0" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-room-ceiling`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#eee7de" />
        <stop offset="1" stopColor="#fffdf9" />
      </linearGradient>
      <radialGradient id={`${idPrefix}-wall-light`} cx="50%" cy="35%" r="72%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
        <stop offset="0.58" stopColor="#fffaf1" stopOpacity="0.09" />
        <stop offset="1" stopColor="#5f4a35" stopOpacity="0.1" />
      </radialGradient>
      <linearGradient id={`${idPrefix}-wall-falloff`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="1" stopColor="#4c3928" stopOpacity="0.12" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-corner-left`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3f3024" stopOpacity="0.2" />
        <stop offset="1" stopColor="#3f3024" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-corner-right`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#3f3024" stopOpacity="0.18" />
        <stop offset="1" stopColor="#3f3024" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-corner-bottom`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#3f3024" stopOpacity="0.2" />
        <stop offset="1" stopColor="#3f3024" stopOpacity="0" />
      </linearGradient>
      <filter id={`${idPrefix}-room-shadow`} x="-30%" y="-30%" width="160%" height="180%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </>
  );
}

function TileSceneContext({
  width,
  height,
  surfaceView,
  metrics,
  idPrefix,
}: {
  width: number;
  height: number;
  surfaceView: TileSurfaceView;
  metrics: TileSceneMetrics;
  idPrefix: string;
}) {
  if (surfaceView === "floor") {
    return (
      <>
        <rect x="-11" y="-6" width={width + 22} height={height + 22} rx="13" fill="#7c6852" opacity="0.16" filter={`url(#${idPrefix}-room-shadow)`} />
        <rect x="-8" y="-8" width={width + 16} height={height + 16} rx="10" fill="#ded7cc" stroke="#9b9184" strokeWidth="1" />
      </>
    );
  }

  const { depth, floorDepth } = metrics;
  const ceilingRise = Math.min(22, Math.max(14, depth * 0.3));
  const outerBottom = height + floorDepth;

  return (
    <g aria-hidden="true" data-testid="tile-room-scene">
      <ellipse
        cx={width / 2}
        cy={outerBottom + 13}
        rx={width / 2 + depth * 0.9}
        ry={Math.max(13, floorDepth * 0.25)}
        fill="#3d2f21"
        opacity="0.15"
        filter={`url(#${idPrefix}-room-shadow)`}
      />
      <polygon
        points={`${-depth},${-ceilingRise} 0,0 ${width},0 ${width + depth},${-ceilingRise}`}
        fill={`url(#${idPrefix}-room-ceiling)`}
        stroke="#c7b9a8"
        strokeWidth="0.7"
      />
      <polygon
        points={`${-depth},${-ceilingRise} 0,0 0,${height} ${-depth},${outerBottom}`}
        fill={`url(#${idPrefix}-room-left)`}
        stroke="#b8aa99"
        strokeWidth="0.7"
      />
      <polygon
        points={`${width},0 ${width + depth},${-ceilingRise} ${width + depth},${outerBottom} ${width},${height}`}
        fill={`url(#${idPrefix}-room-right)`}
        stroke="#ad9e8c"
        strokeWidth="0.7"
      />
      <polygon
        points={`${-depth},${outerBottom} 0,${height} ${width},${height} ${width + depth},${outerBottom}`}
        fill={`url(#${idPrefix}-room-floor)`}
        stroke="#aa9884"
        strokeWidth="0.75"
      />
      <path d={`M 0 ${height + 1} L ${width} ${height + 1}`} fill="none" stroke="#473529" strokeWidth="7" opacity="0.12" />
      <path d={`M 0 0 L 0 ${height}`} fill="none" stroke="#3f3024" strokeWidth="5" opacity="0.1" />
      <path d={`M ${width} 0 L ${width} ${height}`} fill="none" stroke="#3f3024" strokeWidth="5" opacity="0.09" />
      <line x1={-depth} y1={outerBottom - 2.4} x2="0" y2={height - 2.4} stroke="#fffaf2" strokeWidth="3" opacity="0.68" />
      <line x1={width} y1={height - 2.4} x2={width + depth} y2={outerBottom - 2.4} stroke="#fffaf2" strokeWidth="3" opacity="0.6" />
      <ellipse cx={width / 2} cy={-ceilingRise * 0.42} rx={width * 0.25} ry={Math.max(3, ceilingRise * 0.34)} fill="#ffffff" opacity="0.2" />
    </g>
  );
}

function TileDimensions({
  width,
  height,
  surfaceW,
  surfaceH,
  surfaceView,
  metrics,
}: {
  width: number;
  height: number;
  surfaceW: number;
  surfaceH: number;
  surfaceView: TileSurfaceView;
  metrics: TileSceneMetrics;
}) {
  const widthLineY = surfaceView === "wall" ? height + metrics.floorDepth + 20 : -12;
  const heightLineX = surfaceView === "wall" ? -metrics.depth - 21 : -12;

  return (
    <g fill="#475569" stroke="#64748b" strokeWidth="0.65">
      <line x1="0" y1={widthLineY} x2={width} y2={widthLineY} />
      <line x1="0" y1={widthLineY - 4} x2="0" y2={widthLineY + 4} />
      <line x1={width} y1={widthLineY - 4} x2={width} y2={widthLineY + 4} />
      <rect x={width / 2 - 37} y={widthLineY - 6.5} width="74" height="13" rx="5" fill="#fffdf9" stroke="none" opacity="0.96" />
      <text x={width / 2} y={widthLineY} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="650" stroke="none">{surfaceW.toLocaleString("ru-RU")} мм</text>
      <line x1={heightLineX} y1="0" x2={heightLineX} y2={height} />
      <line x1={heightLineX - 4} y1="0" x2={heightLineX + 4} y2="0" />
      <line x1={heightLineX - 4} y1={height} x2={heightLineX + 4} y2={height} />
      <rect x={heightLineX - 6.5} y={height / 2 - 37} width="13" height="74" rx="5" fill="#fffdf9" stroke="none" opacity="0.96" />
      <text x={heightLineX} y={height / 2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 ${heightLineX} ${height / 2})`} fontSize="8" fontWeight="650" stroke="none">{surfaceH.toLocaleString("ru-RU")} мм</text>
    </g>
  );
}

function TileMaterialDetail({
  x,
  y,
  width,
  height,
  variant,
  isCut = false,
  finish = "limestone",
  groutColor,
  textured = false,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  variant: number;
  isCut?: boolean;
  finish?: TileVisualFinish;
  groutColor?: string;
  textured?: boolean;
}) {
  if (width < 4 || height < 4) return null;

  const palette = TILE_VISUAL_FINISHES[finish];
  const inset = Math.min(1.15, Math.max(0.35, Math.min(width, height) * 0.045));
  const veinWidth = Math.min(0.55, Math.max(0.24, Math.min(width, height) * 0.006));
  const vein = variant === 0
    ? `M ${x + width * 0.08} ${y + height * 0.72} C ${x + width * 0.3} ${y + height * 0.5}, ${x + width * 0.58} ${y + height * 0.62}, ${x + width * 0.92} ${y + height * 0.3}`
    : variant === 1
      ? `M ${x + width * 0.08} ${y + height * 0.28} C ${x + width * 0.34} ${y + height * 0.44}, ${x + width * 0.66} ${y + height * 0.34}, ${x + width * 0.92} ${y + height * 0.68}`
      : `M ${x + width * 0.18} ${y + height * 0.12} C ${x + width * 0.42} ${y + height * 0.34}, ${x + width * 0.36} ${y + height * 0.66}, ${x + width * 0.78} ${y + height * 0.9}`;

  return (
    <g aria-hidden="true" pointerEvents="none" data-testid="tile-material-detail">
      <line x1={x + inset} y1={y + inset} x2={x + width - inset} y2={y + inset} stroke={palette.highlight} strokeWidth="0.55" opacity={palette.dark ? 0.28 : 0.58} />
      <line x1={x + inset} y1={y + inset} x2={x + inset} y2={y + height - inset} stroke={palette.highlight} strokeWidth="0.42" opacity={palette.dark ? 0.2 : 0.4} />
      <line x1={x + inset} y1={y + height - inset} x2={x + width - inset} y2={y + height - inset} stroke={groutColor ?? palette.grout} strokeWidth="0.45" opacity={palette.dark ? 0.42 : 0.2} />
      <line x1={x + width - inset} y1={y + inset} x2={x + width - inset} y2={y + height - inset} stroke={groutColor ?? palette.grout} strokeWidth="0.35" opacity={palette.dark ? 0.34 : 0.12} />
      {!textured && width > 15 && height > 11 && (
        <>
          <path d={vein} fill="none" stroke={palette.vein} strokeWidth={veinWidth} strokeLinecap="round" opacity={finish === "marble" ? 0.34 : 0.2} />
          <path
            d={`M ${x + width * 0.14} ${y + height * 0.22} Q ${x + width * 0.46} ${y + height * 0.06}, ${x + width * 0.82} ${y + height * 0.18}`}
            fill="none"
            stroke={palette.highlight}
            strokeWidth={Math.max(0.3, veinWidth * 0.9)}
            strokeLinecap="round"
            opacity={palette.dark ? 0.16 : 0.22}
          />
        </>
      )}
      {isCut && (
        <>
          <line x1={x + inset} y1={y + height - inset * 0.55} x2={x + width - inset} y2={y + height - inset * 0.55} stroke={palette.cut} strokeWidth="0.52" opacity="0.32" />
          <line x1={x + width - inset * 0.55} y1={y + inset} x2={x + width - inset * 0.55} y2={y + height - inset} stroke={palette.cut} strokeWidth="0.45" opacity="0.24" />
        </>
      )}
    </g>
  );
}

type RoomPoint = { x: number; y: number };

function roomPoints(points: RoomPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function TileAlignmentGuides({
  surfaceX,
  surfaceY,
  surfaceWidth,
  surfaceHeight,
  openingX,
  openingWidth,
  visible,
}: {
  surfaceX: number;
  surfaceY: number;
  surfaceWidth: number;
  surfaceHeight: number;
  openingX?: number;
  openingWidth?: number;
  visible: boolean;
}) {
  if (!visible || openingX == null || openingWidth == null) return null;
  const surfaceAxisX = surfaceX + surfaceWidth / 2;
  const openingAxisX = openingX + openingWidth / 2;
  const labelY = surfaceY + 13;

  return (
    <g data-testid="tile-alignment-guides" aria-hidden="true" pointerEvents="none">
      <line x1={surfaceAxisX} y1={surfaceY} x2={surfaceAxisX} y2={surfaceY + surfaceHeight} stroke="#64748b" strokeWidth="1.1" strokeDasharray="5 5" opacity="0.72" />
      <line x1={openingAxisX} y1={surfaceY} x2={openingAxisX} y2={surfaceY + surfaceHeight} stroke="#ea580c" strokeWidth="1.5" strokeDasharray="7 4" opacity="0.9" />
      <circle cx={surfaceAxisX} cy={surfaceY + 5} r="3.2" fill="#64748b" opacity="0.82" />
      <circle cx={openingAxisX} cy={surfaceY + 5} r="3.2" fill="#ea580c" />
      <text x={surfaceAxisX - 5} y={labelY} textAnchor="end" fill="#475569" fontSize="7" fontWeight="700">ось стены</text>
      <text x={openingAxisX + 5} y={labelY + 9} fill="#c2410c" fontSize="7" fontWeight="700">ось проёма</text>
    </g>
  );
}

function useOpeningDrag({
  enabled,
  surfaceX,
  surfaceWidth,
  surfaceWidthMm,
  openingWidthMm,
  offsetLeftMm,
  onOffsetChange,
}: {
  enabled: boolean;
  surfaceX: number;
  surfaceWidth: number;
  surfaceWidthMm: number;
  openingWidthMm: number;
  offsetLeftMm: number;
  onOffsetChange?: (offsetLeftMm: number) => void;
}) {
  const dragRef = useRef<{ pointerId: number; startSvgX: number; startOffsetMm: number } | null>(null);
  const maxOffsetMm = Math.max(surfaceWidthMm - openingWidthMm, 0);

  const clientXToSvgX = useCallback((target: SVGGElement, clientX: number) => {
    const svg = target.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return surfaceX;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = 0;
    return point.matrixTransform(matrix.inverse()).x;
  }, [surfaceX]);

  const moveTo = useCallback((nextOffsetMm: number) => {
    if (!enabled || !onOffsetChange) return;
    onOffsetChange(Math.round(Math.min(Math.max(nextOffsetMm, 0), maxOffsetMm)));
  }, [enabled, maxOffsetMm, onOffsetChange]);

  const onPointerDown = useCallback((event: ReactPointerEvent<SVGGElement>) => {
    if (!enabled) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startSvgX: clientXToSvgX(event.currentTarget, event.clientX),
      startOffsetMm: offsetLeftMm,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [clientXToSvgX, enabled, offsetLeftMm]);

  const onPointerMove = useCallback((event: ReactPointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || surfaceWidth <= 0) return;
    const currentSvgX = clientXToSvgX(event.currentTarget, event.clientX);
    const deltaMm = ((currentSvgX - drag.startSvgX) / surfaceWidth) * surfaceWidthMm;
    moveTo(drag.startOffsetMm + deltaMm);
  }, [clientXToSvgX, moveTo, surfaceWidth, surfaceWidthMm]);

  const finishPointer = useCallback((event: ReactPointerEvent<SVGGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<SVGGElement>) => {
    if (!enabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    const step = event.shiftKey ? 50 : 10;
    moveTo(offsetLeftMm + (event.key === "ArrowLeft" ? -step : step));
  }, [enabled, moveTo, offsetLeftMm]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onKeyDown,
    maxOffsetMm,
  };
}

function TileRoomPreviewSVG({
  result,
  groutMm,
  surfaceView,
  surfaceW,
  surfaceH,
  visualFinish = "limestone",
  lightingPreset = "daylight",
  groutColor = "#d4d0c8",
  textureSource = "preset",
  customTextureDataUrl = null,
  textureScalePercent = 100,
  textureRotationDeg = 0,
  showAlignmentGuides = false,
  onOpeningOffsetChange,
}: {
  result: TileLayoutResult;
  groutMm: number;
  surfaceView: TileSurfaceView;
  surfaceW: number;
  surfaceH: number;
  visualFinish?: TileVisualFinish;
  lightingPreset?: TileLightingPreset;
  groutColor?: string;
  textureSource?: TileTextureSource;
  customTextureDataUrl?: string | null;
  textureScalePercent?: number;
  textureRotationDeg?: 0 | 90 | 180 | 270;
  showAlignmentGuides?: boolean;
  onOpeningOffsetChange?: (offsetLeftMm: number) => void;
}) {
  const stageW = 760;
  const stageH = 460;
  const instanceId = useId().replace(/:/g, "");
  const sceneId = `${instanceId}-${result.diagonal ? "tile-room-diagonal" : "tile-room-straight"}`;
  const finishPalette = TILE_VISUAL_FINISHES[visualFinish];
  const lightingPalette = TILE_LIGHTING_PRESETS[lightingPreset];
  const textureSrc = textureSource === "custom" && customTextureDataUrl
    ? customTextureDataUrl
    : finishPalette.textureSrc;
  const textureZoom = Math.min(Math.max(textureScalePercent / 100, 0.7), 1.8);
  const textureOffset = (1 - textureZoom) / 2;
  const textureAngles = [textureRotationDeg, (textureRotationDeg + 180) % 360, (textureRotationDeg + 90) % 360];
  // Иллюстративная камера остаётся почти фронтальной: так стена занимает
  // основную часть сцены и не превращается в далёкий «туннель».
  const visualAspect = Math.min(Math.max(surfaceW / Math.max(surfaceH, 1), 1.48), 1.56);
  const wallH = 336;
  const wallW = wallH * visualAspect;
  const wallX = (stageW - wallW) / 2;
  const wallY = 48;
  const wallBottom = wallY + wallH;
  const outerTopLeft = { x: 34, y: 28 };
  const outerTopRight = { x: stageW - 34, y: 28 };
  const outerBottomLeft = { x: 18, y: stageH - 22 };
  const outerBottomRight = { x: stageW - 18, y: stageH - 22 };
  const clipId = `${sceneId}-surface-clip`;
  const maskId = `${sceneId}-opening-mask`;
  const bounds = result.diagonal
    ? { widthMm: result.diagonal.surfaceW, heightMm: result.diagonal.surfaceH }
    : computeLayoutSvgBoundsMm(result.tileGrid, groutMm);
  const wallScaleX = wallW / Math.max(bounds.widthMm, 1);
  const wallScaleY = wallH / Math.max(bounds.heightMm, 1);
  const wallGap = Math.max(groutMm * Math.min(wallScaleX, wallScaleY), 0.7);
  const opening = surfaceView === "wall" ? result.opening : undefined;
  const openingRect = (() => {
    if (!opening) return undefined;
    // В интерьерной иллюстрации ограничиваем перспективный размер двери,
    // чтобы она выглядела как в референсе. Точная геометрия остаётся в «Чертеже».
    const widthRatio = Math.min(Math.max(opening.widthMm / Math.max(surfaceW, 1), 0.12), 0.22);
    const heightRatio = Math.min(Math.max(opening.heightMm / Math.max(surfaceH, 1), 0.35), 0.74);
    const width = wallW * widthRatio;
    const height = wallH * heightRatio;
    const centerRatio = (opening.offsetLeftMm + opening.widthMm / 2) / Math.max(surfaceW, 1);
    const x = Math.min(
      Math.max(wallX + centerRatio * wallW - width / 2, wallX),
      wallX + wallW - width,
    );
    return { x, y: wallBottom - height, width, height };
  })();
  const openingDrag = useOpeningDrag({
    enabled: Boolean(opening && onOpeningOffsetChange),
    surfaceX: wallX,
    surfaceWidth: wallW,
    surfaceWidthMm: surfaceW,
    openingWidthMm: opening?.widthMm ?? 0,
    offsetLeftMm: opening?.offsetLeftMm ?? 0,
    onOffsetChange: onOpeningOffsetChange,
  });
  const tileFill = (tone: number) => `url(#${sceneId}-texture-${tone % 3})`;

  const floorTopLeft = { x: 218, y: 190 };
  const floorTopRight = { x: stageW - 218, y: 190 };
  const floorBottomLeft = { x: 40, y: stageH - 24 };
  const floorBottomRight = { x: stageW - 40, y: stageH - 24 };
  const projectFloor = (u: number, v: number): RoomPoint => {
    const left = {
      x: floorTopLeft.x + (floorBottomLeft.x - floorTopLeft.x) * v,
      y: floorTopLeft.y + (floorBottomLeft.y - floorTopLeft.y) * v,
    };
    const right = {
      x: floorTopRight.x + (floorBottomRight.x - floorTopRight.x) * v,
      y: floorTopRight.y + (floorBottomRight.y - floorTopRight.y) * v,
    };
    return {
      x: left.x + (right.x - left.x) * u,
      y: left.y + (right.y - left.y) * u,
    };
  };
  const insetPolygon = (points: RoomPoint[], amount = 0.985): RoomPoint[] => {
    const center = points.reduce((acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }), { x: 0, y: 0 });
    return points.map((point) => ({
      x: center.x + (point.x - center.x) * amount,
      y: center.y + (point.y - center.y) * amount,
    }));
  };

  return (
    <svg
      viewBox={`0 0 ${stageW} ${stageH}`}
      className="w-full rounded-2xl border border-stone-200 bg-stone-50 dark:border-slate-700"
      role="img"
      data-testid="tile-room-preview"
      aria-label={`Объёмная 2.5D-модель: ${surfaceView === "wall" ? "плитка на стене" : "плитка на полу"}, ${tileModeLabel(result.mode).toLowerCase()}`}
    >
      <defs>
        <linearGradient id={`${sceneId}-stage`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lightingPalette.stage[0]} />
          <stop offset="0.62" stopColor={lightingPalette.stage[1]} />
          <stop offset="1" stopColor={lightingPalette.stage[2]} />
        </linearGradient>
        <linearGradient id={`${sceneId}-left-wall`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={lightingPalette.leftWall[0]} />
          <stop offset="0.72" stopColor={lightingPalette.leftWall[1]} />
          <stop offset="1" stopColor={lightingPalette.leftWall[2]} />
        </linearGradient>
        <linearGradient id={`${sceneId}-right-wall`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor={lightingPalette.rightWall[0]} />
          <stop offset="0.72" stopColor={lightingPalette.rightWall[1]} />
          <stop offset="1" stopColor={lightingPalette.rightWall[2]} />
        </linearGradient>
        <linearGradient id={`${sceneId}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lightingPalette.floor[0]} />
          <stop offset="0.55" stopColor={lightingPalette.floor[1]} />
          <stop offset="1" stopColor={lightingPalette.floor[2]} />
        </linearGradient>
        <linearGradient id={`${sceneId}-ceiling`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lightingPalette.ceiling[0]} />
          <stop offset="1" stopColor={lightingPalette.ceiling[1]} />
        </linearGradient>
        <linearGradient id={`${sceneId}-stone-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={finishPalette.tones[0][0]} />
          <stop offset="0.52" stopColor={finishPalette.tones[0][1]} />
          <stop offset="1" stopColor={finishPalette.tones[0][2]} />
        </linearGradient>
        <linearGradient id={`${sceneId}-stone-b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={finishPalette.tones[1][0]} />
          <stop offset="0.54" stopColor={finishPalette.tones[1][1]} />
          <stop offset="1" stopColor={finishPalette.tones[1][2]} />
        </linearGradient>
        <linearGradient id={`${sceneId}-stone-c`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={finishPalette.tones[2][0]} />
          <stop offset="0.52" stopColor={finishPalette.tones[2][1]} />
          <stop offset="1" stopColor={finishPalette.tones[2][2]} />
        </linearGradient>
        {textureAngles.map((angle, index) => (
          <pattern
            key={index}
            id={`${sceneId}-texture-${index}`}
            width="1"
            height="1"
            patternUnits="objectBoundingBox"
            patternContentUnits="objectBoundingBox"
          >
            <rect width="1" height="1" fill={`url(#${sceneId}-stone-${index === 0 ? "a" : index === 1 ? "b" : "c"})`} />
            <image
              href={textureSrc}
              x={textureOffset}
              y={textureOffset}
              width={textureZoom}
              height={textureZoom}
              preserveAspectRatio="xMidYMid slice"
              transform={`rotate(${angle} 0.5 0.5)`}
              opacity={finishPalette.dark ? 0.94 : 0.88}
            />
          </pattern>
        ))}
        <linearGradient id={`${sceneId}-tile-gloss`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.28" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="0.72" stopColor="#8c7965" stopOpacity="0.02" />
          <stop offset="1" stopColor="#5b4938" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={`${sceneId}-door-depth`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#bdb3a7" />
          <stop offset="0.16" stopColor="#f0ebe4" />
          <stop offset="0.82" stopColor="#e6dfd5" />
          <stop offset="1" stopColor="#95887a" />
        </linearGradient>
        <linearGradient id={`${sceneId}-door-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d7d0c7" />
          <stop offset="0.48" stopColor="#f5f2ed" />
          <stop offset="1" stopColor="#e6e0d8" />
        </linearGradient>
        <linearGradient id={`${sceneId}-corner-shade-left`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f3329" stopOpacity="0.17" />
          <stop offset="1" stopColor="#3f3329" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${sceneId}-corner-shade-right`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#3f3329" stopOpacity="0.15" />
          <stop offset="1" stopColor="#3f3329" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${sceneId}-light`} cx="50%" cy="24%" r="78%">
          <stop offset="0" stopColor={lightingPalette.ambient} stopOpacity={lightingPalette.ambientOpacity} />
          <stop offset="0.62" stopColor={lightingPalette.ambient} stopOpacity={lightingPalette.ambientOpacity * 0.18} />
          <stop offset="1" stopColor={lightingPalette.vignette} stopOpacity={lightingPalette.vignetteOpacity} />
        </radialGradient>
        <radialGradient id={`${sceneId}-floor-light`} cx="50%" cy="0%" r="90%">
          <stop offset="0" stopColor={lightingPalette.ambient} stopOpacity={lightingPalette.ambientOpacity * 0.94} />
          <stop offset="1" stopColor={lightingPalette.vignette} stopOpacity={lightingPalette.vignetteOpacity * 1.45} />
        </radialGradient>
        <pattern id={`${sceneId}-cut`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={finishPalette.cut} strokeWidth="1.5" opacity="0.46" />
        </pattern>
        <pattern id={`${sceneId}-corner-cut`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={finishPalette.cut} strokeWidth="1.4" opacity="0.5" />
        </pattern>
        <pattern id={`${sceneId}-plaster-grain`} width="23" height="19" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="5" r="0.55" fill="#6f6256" opacity="0.11" />
          <circle cx="17" cy="13" r="0.45" fill="#ffffff" opacity="0.32" />
          <path d="M 8 16 Q 12 14 15 16" fill="none" stroke="#7d7062" strokeWidth="0.35" opacity="0.09" />
        </pattern>
        <pattern id={`${sceneId}-floor-grain`} width="46" height="18" patternUnits="userSpaceOnUse">
          <path d="M 2 7 C 12 2, 29 12, 43 5" fill="none" stroke="#8f6740" strokeWidth="0.55" opacity="0.13" />
          <path d="M 5 14 C 16 10, 27 17, 39 12" fill="none" stroke="#ffffff" strokeWidth="0.45" opacity="0.18" />
        </pattern>
        <clipPath id={clipId}>
          {surfaceView === "wall" ? (
            <rect x={wallX} y={wallY} width={wallW} height={wallH} />
          ) : (
            <polygon points={roomPoints([floorTopLeft, floorTopRight, floorBottomRight, floorBottomLeft])} />
          )}
        </clipPath>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect x={wallX} y={wallY} width={wallW} height={wallH} fill="white" />
          {openingRect && <rect {...openingRect} fill="black" />}
        </mask>
        <filter id={`${sceneId}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#4d4237" floodOpacity="0.1" />
        </filter>
        <filter id={`${sceneId}-soft-shadow`} x="-40%" y="-100%" width="180%" height="300%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${sceneId}-tile-relief`} x="-8%" y="-15%" width="116%" height="135%">
          <feDropShadow dx="0.45" dy="0.8" stdDeviation="0.45" floodColor="#4c4035" floodOpacity="0.2" />
        </filter>
        <filter id={`${sceneId}-opening-shadow`} x="-30%" y="-20%" width="170%" height="145%">
          <feDropShadow dx="1.5" dy="3" stdDeviation="3" floodColor="#3c3025" floodOpacity="0.3" />
        </filter>
        <filter id={`${sceneId}-lamp-glow`} x="-150%" y="-300%" width="400%" height="700%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <rect width={stageW} height={stageH} rx="20" fill={`url(#${sceneId}-stage)`} />

      {surfaceView === "wall" ? (
        <>
          <ellipse cx={stageW / 2} cy={stageH - 16} rx="280" ry="13" fill="#65584a" opacity="0.07" filter={`url(#${sceneId}-soft-shadow)`} />
          <polygon points={roomPoints([outerTopLeft, { x: wallX, y: wallY }, { x: wallX + wallW, y: wallY }, outerTopRight])} fill={`url(#${sceneId}-ceiling)`} stroke="#d7cfc5" strokeWidth="0.8" />
          <ellipse cx={stageW / 2} cy="39" rx="78" ry="11" fill={lightingPalette.lamp} opacity={lightingPalette.lampOpacity} filter={`url(#${sceneId}-lamp-glow)`} />
          <polygon points="350,30 410,30 403,39 357,39" fill="#fffdf6" stroke="#cfc5b8" strokeWidth="0.8" opacity="0.98" />
          <polygon points="357,32 403,32 399,37 361,37" fill={lightingPalette.lamp} opacity="0.9" />
          <polygon points={roomPoints([outerTopLeft, { x: wallX, y: wallY }, { x: wallX, y: wallBottom }, outerBottomLeft])} fill={`url(#${sceneId}-left-wall)`} stroke="#c8bfb3" strokeWidth="0.8" />
          <polygon points={roomPoints([{ x: wallX + wallW, y: wallY }, outerTopRight, outerBottomRight, { x: wallX + wallW, y: wallBottom }])} fill={`url(#${sceneId}-right-wall)`} stroke="#c4baae" strokeWidth="0.8" />
          <polygon points={roomPoints([outerBottomLeft, { x: wallX, y: wallBottom }, { x: wallX + wallW, y: wallBottom }, outerBottomRight])} fill={`url(#${sceneId}-floor)`} stroke="#d8c09c" strokeWidth="0.9" />
          <polygon points={roomPoints([outerTopLeft, { x: wallX, y: wallY }, { x: wallX, y: wallBottom }, outerBottomLeft])} fill={`url(#${sceneId}-plaster-grain)`} opacity="0.42" />
          <polygon points={roomPoints([{ x: wallX + wallW, y: wallY }, outerTopRight, outerBottomRight, { x: wallX + wallW, y: wallBottom }])} fill={`url(#${sceneId}-plaster-grain)`} opacity="0.36" />
          <polygon points={roomPoints([outerBottomLeft, { x: wallX, y: wallBottom }, { x: wallX + wallW, y: wallBottom }, outerBottomRight])} fill={`url(#${sceneId}-floor-grain)`} opacity="0.42" />

          {[0.34, 0.68].map((ratio) => (
            <g key={ratio} opacity="0.07" stroke="#8e7e6d" strokeWidth="0.7">
              <line x1={outerTopLeft.x + (wallX - outerTopLeft.x) * ratio} y1={outerTopLeft.y + (wallY - outerTopLeft.y) * ratio} x2={outerBottomLeft.x + (wallX - outerBottomLeft.x) * ratio} y2={outerBottomLeft.y + (wallBottom - outerBottomLeft.y) * ratio} />
              <line x1={outerTopRight.x + (wallX + wallW - outerTopRight.x) * ratio} y1={outerTopRight.y + (wallY - outerTopRight.y) * ratio} x2={outerBottomRight.x + (wallX + wallW - outerBottomRight.x) * ratio} y2={outerBottomRight.y + (wallBottom - outerBottomRight.y) * ratio} />
            </g>
          ))}

          {[0.18, 0.36, 0.54, 0.72, 0.88].map((ratio) => {
            const top = {
              x: wallX + wallW * ratio,
              y: wallBottom,
            };
            const bottom = {
              x: outerBottomLeft.x + (outerBottomRight.x - outerBottomLeft.x) * ratio,
              y: outerBottomLeft.y,
            };
            return <line key={ratio} x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} stroke="#8f6d49" strokeWidth="0.7" opacity="0.13" />;
          })}
          {[0.32, 0.62].map((ratio) => {
            const y = wallBottom + (outerBottomLeft.y - wallBottom) * ratio;
            const leftX = wallX + (outerBottomLeft.x - wallX) * ratio;
            const rightX = wallX + wallW + (outerBottomRight.x - (wallX + wallW)) * ratio;
            return <line key={ratio} x1={leftX} y1={y} x2={rightX} y2={y} stroke="#9c7954" strokeWidth="0.65" opacity="0.1" />;
          })}

          <line x1={outerBottomLeft.x} y1={outerBottomLeft.y - 4} x2={wallX} y2={wallBottom - 3} stroke="#fffaf2" strokeWidth="4" opacity="0.58" />
          <line x1={wallX + wallW} y1={wallBottom - 3} x2={outerBottomRight.x} y2={outerBottomRight.y - 4} stroke="#fffaf2" strokeWidth="4" opacity="0.5" />
          <line x1={outerBottomLeft.x + 4} y1={outerBottomLeft.y - 7} x2={wallX} y2={wallBottom - 6} stroke="#a78a68" strokeWidth="2" opacity="0.38" />
          <line x1={wallX + wallW} y1={wallBottom - 6} x2={outerBottomRight.x - 4} y2={outerBottomRight.y - 7} stroke="#9f8364" strokeWidth="2" opacity="0.34" />
          <path d={`M ${wallX} ${wallBottom + 3} L ${wallX + wallW} ${wallBottom + 3}`} stroke="#55483b" strokeWidth="9" opacity="0.08" filter={`url(#${sceneId}-soft-shadow)`} />

          <rect x={wallX} y={wallY} width={wallW} height={wallH} fill={groutColor} stroke={groutColor} strokeWidth="1" filter={`url(#${sceneId}-shadow)`} />
          <g clipPath={`url(#${clipId})`} mask={`url(#${maskId})`}>
            {result.diagonal ? result.diagonal.cells.map((cell, index) => {
              const diagonal = result.diagonal!;
              const cx = wallX + (cell.cx / Math.max(diagonal.surfaceW, 1)) * wallW;
              const cy = wallY + (cell.cy / Math.max(diagonal.surfaceH, 1)) * wallH;
              const halfX = (diagonal.halfDiagonalMm / Math.max(diagonal.surfaceW, 1)) * wallW;
              const halfY = (diagonal.halfDiagonalMm / Math.max(diagonal.surfaceH, 1)) * wallH;
              const points = [
                { x: cx, y: cy - halfY },
                { x: cx + halfX, y: cy },
                { x: cx, y: cy + halfY },
                { x: cx - halfX, y: cy },
              ];
              return (
                <g key={index}>
                  <polygon points={roomPoints(points)} fill={tileFill(index % 3)} stroke={cell.type === "edge" || cell.cutByOpening ? finishPalette.cut : groutColor} strokeWidth={cell.type === "edge" || cell.cutByOpening ? 0.8 : 0.48} filter={`url(#${sceneId}-tile-relief)`} />
                </g>
              );
            }) : result.tileGrid.map((row, rowIndex) => {
              const cells = row.map((cell, cellIndex) => {
                const x = wallX + cell.xMm * wallScaleX + wallGap / 2;
                const y = wallY + cell.yMm * wallScaleY + wallGap / 2;
                const width = Math.max(cell.widthMm * wallScaleX - wallGap, 0.5);
                const height = Math.max(cell.heightMm * wallScaleY - wallGap, 0.5);
                const cut = cell.type !== "whole" || cell.cutByOpening;
                const tone = (rowIndex * 5 + cellIndex * 3) % 3;
                return (
                  <g key={`${rowIndex}-${cellIndex}`}>
                    <rect x={x} y={y} width={width} height={height} rx="1.35" fill={tileFill(tone)} stroke={cut ? finishPalette.cut : groutColor} strokeWidth={cut ? 0.8 : 0.45} filter={`url(#${sceneId}-tile-relief)`} />
                    <TileMaterialDetail x={x} y={y} width={width} height={height} variant={tone} isCut={cut} finish={visualFinish} groutColor={groutColor} textured />
                  </g>
                );
              });
              return <g key={rowIndex}>{cells}</g>;
            })}
            <rect x={wallX} y={wallY} width={wallW} height={wallH} fill={`url(#${sceneId}-tile-gloss)`} opacity={finishPalette.glossOpacity} pointerEvents="none" />
            <rect x={wallX} y={wallY} width={wallW} height={wallH} fill={`url(#${sceneId}-light)`} pointerEvents="none" />
          </g>
          <line x1={wallX} y1={wallBottom - 2.5} x2={wallX + wallW} y2={wallBottom - 2.5} stroke="#fffaf2" strokeWidth="5" opacity="0.88" />
          <rect x={wallX} y={wallY} width="34" height={wallH} fill={`url(#${sceneId}-corner-shade-left)`} pointerEvents="none" />
          <rect x={wallX + wallW - 34} y={wallY} width="34" height={wallH} fill={`url(#${sceneId}-corner-shade-right)`} pointerEvents="none" />
          <line x1={wallX} y1={wallY} x2={wallX} y2={wallBottom} stroke="#4d4034" strokeWidth="7" opacity="0.11" />
          <line x1={wallX + wallW} y1={wallY} x2={wallX + wallW} y2={wallBottom} stroke="#4d4034" strokeWidth="7" opacity="0.1" />
          {openingRect && (
            <g
              data-testid="tile-opening"
              role={onOpeningOffsetChange ? "slider" : undefined}
              aria-label={onOpeningOffsetChange ? "Переместить дверной проём на стене" : undefined}
              aria-valuemin={onOpeningOffsetChange ? 0 : undefined}
              aria-valuemax={onOpeningOffsetChange ? openingDrag.maxOffsetMm : undefined}
              aria-valuenow={onOpeningOffsetChange ? opening?.offsetLeftMm : undefined}
              tabIndex={onOpeningOffsetChange ? 0 : undefined}
              onPointerDown={openingDrag.onPointerDown}
              onPointerMove={openingDrag.onPointerMove}
              onPointerUp={openingDrag.onPointerUp}
              onPointerCancel={openingDrag.onPointerCancel}
              onKeyDown={openingDrag.onKeyDown}
              style={onOpeningOffsetChange ? { cursor: "grab", touchAction: "none" } : undefined}
            >
              <rect x={openingRect.x - 4} y={openingRect.y - 4} width={openingRect.width + 9} height={openingRect.height + 5} rx="1.5" fill="#51453a" opacity="0.18" filter={`url(#${sceneId}-opening-shadow)`} />
              <rect data-testid={onOpeningOffsetChange ? "tile-opening-drag" : undefined} {...openingRect} fill={`url(#${sceneId}-door-depth)`} stroke="#887d71" strokeWidth="1.6" />
              <rect x={openingRect.x + 8} y={openingRect.y + 9} width={Math.max(openingRect.width - 16, 1)} height={Math.max(openingRect.height - 9, 1)} fill={`url(#${sceneId}-door-back)`} stroke="#c7beb3" strokeWidth="0.8" />
              <polygon
                points={roomPoints([
                  { x: openingRect.x, y: openingRect.y },
                  { x: openingRect.x + openingRect.width, y: openingRect.y },
                  { x: openingRect.x + openingRect.width - 8, y: openingRect.y + 9 },
                  { x: openingRect.x + 8, y: openingRect.y + 9 },
                ])}
                fill="#f4efe8"
                stroke="#c5baad"
                strokeWidth="0.65"
              />
              <polygon
                points={roomPoints([
                  { x: openingRect.x, y: openingRect.y },
                  { x: openingRect.x + 8, y: openingRect.y + 9 },
                  { x: openingRect.x + 8, y: openingRect.y + openingRect.height },
                  { x: openingRect.x, y: openingRect.y + openingRect.height },
                ])}
                fill="#eee8e0"
                stroke="#c3b8ab"
                strokeWidth="0.65"
              />
              <polygon
                points={roomPoints([
                  { x: openingRect.x + openingRect.width - 8, y: openingRect.y + 9 },
                  { x: openingRect.x + openingRect.width, y: openingRect.y },
                  { x: openingRect.x + openingRect.width, y: openingRect.y + openingRect.height },
                  { x: openingRect.x + openingRect.width - 8, y: openingRect.y + openingRect.height },
                ])}
                fill="#b5aa9e"
                stroke="#998d80"
                strokeWidth="0.65"
              />
              <ellipse cx={openingRect.x + openingRect.width / 2} cy={openingRect.y + openingRect.height - 1} rx={openingRect.width * 0.42} ry="4" fill="#4f4338" opacity="0.18" filter={`url(#${sceneId}-soft-shadow)`} />
              <line x1={openingRect.x + 8} y1={openingRect.y + openingRect.height - 1.2} x2={openingRect.x + openingRect.width - 8} y2={openingRect.y + openingRect.height - 1.2} stroke="#8f7457" strokeWidth="2" opacity="0.42" />
            </g>
          )}
          <TileAlignmentGuides
            surfaceX={wallX}
            surfaceY={wallY}
            surfaceWidth={wallW}
            surfaceHeight={wallH}
            openingX={openingRect?.x}
            openingWidth={openingRect?.width}
            visible={showAlignmentGuides}
          />
          <rect x={0} y={0} width={stageW} height={stageH} fill={`url(#${sceneId}-floor-light)`} opacity="0.18" pointerEvents="none" />
        </>
      ) : (
        <>
          <rect x={218} y={48} width={stageW - 436} height="142" fill="#e7dfd4" stroke="#b8aa98" strokeWidth="1" />
          <polygon points={roomPoints([{ x: 36, y: 24 }, { x: 218, y: 48 }, { x: 218, y: 190 }, floorBottomLeft])} fill={`url(#${sceneId}-left-wall)`} stroke="#a89783" strokeWidth="1" />
          <polygon points={roomPoints([{ x: stageW - 218, y: 48 }, { x: stageW - 36, y: 24 }, floorBottomRight, { x: stageW - 218, y: 190 }])} fill={`url(#${sceneId}-right-wall)`} stroke="#9e8d79" strokeWidth="1" />
          <polygon points={roomPoints([floorTopLeft, floorTopRight, floorBottomRight, floorBottomLeft])} fill={groutColor} stroke={groutColor} strokeWidth="1.4" filter={`url(#${sceneId}-shadow)`} />
          <g clipPath={`url(#${clipId})`}>
            {result.diagonal ? result.diagonal.cells.map((cell, index) => {
              if (cell.excludedByOpening) return null;
              const diagonal = result.diagonal!;
              const u = cell.cx / Math.max(diagonal.surfaceW, 1);
              const v = cell.cy / Math.max(diagonal.surfaceH, 1);
              const halfU = diagonal.halfDiagonalMm / Math.max(diagonal.surfaceW, 1);
              const halfV = diagonal.halfDiagonalMm / Math.max(diagonal.surfaceH, 1);
              const points = insetPolygon([
                projectFloor(u, v - halfV),
                projectFloor(u + halfU, v),
                projectFloor(u, v + halfV),
                projectFloor(u - halfU, v),
              ], 0.99);
              return (
                <g key={index}>
                  <polygon points={roomPoints(points)} fill={tileFill(index % 3)} stroke={cell.type === "edge" ? "#b85d0b" : groutColor} strokeWidth={cell.type === "edge" ? 1.15 : 0.42} />
                  {cell.type === "edge" && <polygon points={roomPoints(points)} fill={`url(#${sceneId}-cut)`} />}
                </g>
              );
            }) : result.tileGrid.map((row, rowIndex) => {
              const cells = row.map((cell, cellIndex) => {
                if (cell.excludedByOpening) return null;
                const u0 = cell.xMm / Math.max(bounds.widthMm, 1);
                const u1 = (cell.xMm + cell.widthMm) / Math.max(bounds.widthMm, 1);
                const v0 = cell.yMm / Math.max(bounds.heightMm, 1);
                const v1 = (cell.yMm + cell.heightMm) / Math.max(bounds.heightMm, 1);
                const points = insetPolygon([
                  projectFloor(u0, v0),
                  projectFloor(u1, v0),
                  projectFloor(u1, v1),
                  projectFloor(u0, v1),
                ]);
                const cut = cell.type !== "whole" || cell.cutByOpening;
                const tone = (rowIndex * 5 + cellIndex * 3) % 3;
                return (
                  <g key={`${rowIndex}-${cellIndex}`}>
                    <polygon points={roomPoints(points)} fill={tileFill(tone)} stroke={cell.type === "corner" ? "#be123c" : cut ? "#b85d0b" : groutColor} strokeWidth={cut ? 1.05 : 0.4} />
                    {cut && <polygon points={roomPoints(points)} fill={cell.type === "corner" ? `url(#${sceneId}-corner-cut)` : `url(#${sceneId}-cut)`} />}
                  </g>
                );
              });
              return <g key={rowIndex}>{cells}</g>;
            })}
            <polygon points={roomPoints([floorTopLeft, floorTopRight, floorBottomRight, floorBottomLeft])} fill={`url(#${sceneId}-floor-light)`} pointerEvents="none" />
          </g>
          <line x1={floorTopLeft.x} y1={floorTopLeft.y - 2.5} x2={floorTopRight.x} y2={floorTopRight.y - 2.5} stroke="#fffaf2" strokeWidth="5" opacity="0.85" />
        </>
      )}

      <g transform="translate(22 20)" aria-hidden="true">
        <rect width="132" height="28" rx="14" fill="#fffdf9" opacity="0.94" stroke="#dfd3c5" />
        <circle cx="15" cy="14" r="6" fill="#f97316" opacity="0.9" />
        <text x="28" y="14" dominantBaseline="middle" fill="#5b4633" fontSize="10" fontWeight="750" letterSpacing="0.8">ОБЪЁМНЫЙ ВИД</text>
      </g>
      <g transform={`translate(${stageW - 160} 20)`} aria-hidden="true">
        <rect width="138" height="28" rx="14" fill="#fffdf9" opacity="0.94" stroke="#dfd3c5" />
        <text x="69" y="14" textAnchor="middle" dominantBaseline="middle" fill="#6b5a49" fontSize="10" fontWeight="650">{surfaceW.toLocaleString("ru-RU")} × {surfaceH.toLocaleString("ru-RU")} мм</text>
      </g>
    </svg>
  );
}

function TileLayoutSVG({ result, groutMm, surfaceView, surfaceW, surfaceH, showAlignmentGuides = false, onOpeningOffsetChange }: { result: TileLayoutResult; groutMm: number; surfaceView: TileSurfaceView; surfaceW: number; surfaceH: number; showAlignmentGuides?: boolean; onOpeningOffsetChange?: (offsetLeftMm: number) => void }) {
  const bounds = computeLayoutSvgBoundsMm(result.tileGrid, groutMm);
  const scale = Math.min(
    600 / Math.max(bounds.widthMm, 1),
    400 / Math.max(bounds.heightMm, 1),
    1,
  );

  const svgW = bounds.widthMm * scale;
  const svgH = bounds.heightMm * scale;

  const sceneMetrics = getTileSceneMetrics(svgW, svgH, surfaceView);
  const { padX, padTop, padBottom } = sceneMetrics;
  const sceneId = "tile-straight";
  const clipId = "tile-straight-surface-clip";
  const maskId = "tile-straight-opening-mask";
  const openingRect = surfaceView === "wall" && result.opening
    ? {
        x: result.opening.offsetLeftMm * scale,
        y: result.opening.offsetTopMm * scale,
        width: result.opening.widthMm * scale,
        height: result.opening.heightMm * scale,
      }
    : undefined;
  const openingDrag = useOpeningDrag({
    enabled: Boolean(result.opening && onOpeningOffsetChange),
    surfaceX: 0,
    surfaceWidth: svgW,
    surfaceWidthMm: surfaceW,
    openingWidthMm: result.opening?.widthMm ?? 0,
    offsetLeftMm: result.opening?.offsetLeftMm ?? 0,
    onOffsetChange: onOpeningOffsetChange,
  });
  const edgeShadeWidth = Math.max(5, Math.min(svgW * 0.035, 14));
  const bottomShadeHeight = Math.max(6, Math.min(svgH * 0.04, 16));

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label={`${surfaceView === "wall" ? "Плитка на стене" : "Плитка на полу"}: ${tileModeLabel(result.mode).toLowerCase()}`}
    >
      <defs>
        <TileSceneDefs idPrefix={sceneId} />
        <linearGradient id="tile-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffdfa" /><stop offset="1" stopColor="#f3eee7" /></linearGradient>
        <linearGradient id="tile-stone-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffefb" /><stop offset="0.48" stopColor="#eee9e1" /><stop offset="1" stopColor="#d8d0c5" /></linearGradient>
        <linearGradient id="tile-stone-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#faf6ef" /><stop offset="0.56" stopColor="#e5ddd2" /><stop offset="1" stopColor="#d2c7b9" /></linearGradient>
        <linearGradient id="tile-stone-c" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#f3eee6" /><stop offset="0.52" stopColor="#e9e2d8" /><stop offset="1" stopColor="#fffdf8" /></linearGradient>
        <pattern id="tile-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#b45309" strokeWidth="1.3" opacity="0.45" /></pattern>
        <pattern id="tile-corner-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#be123c" strokeWidth="1.4" opacity="0.5" /></pattern>
        <clipPath id={clipId}><rect width={svgW} height={svgH} /></clipPath>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width={svgW} height={svgH} fill="white" />
          {openingRect && <rect {...openingRect} fill="black" />}
        </mask>
        <filter id="tile-surface-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#3d2f21" floodOpacity="0.28" /></filter>
      </defs>
      <rect x={-padX} y={-padTop} width={svgW + padX * 2} height={svgH + padTop + padBottom} rx="14" fill="url(#tile-scene-bg)" />
      <TileSceneContext width={svgW} height={svgH} surfaceView={surfaceView} metrics={sceneMetrics} idPrefix={sceneId} />
      <rect width={svgW} height={svgH} fill="#d8d1c7" stroke="#9d9387" strokeWidth="1" filter="url(#tile-surface-shadow)" />
      <g clipPath={`url(#${clipId})`} mask={`url(#${maskId})`}>
        {result.tileGrid.map((row, ri) => {
          const rowElements = row.map((cell, ci) => {
            if (cell.excludedByOpening) return null;
            const cellW = cell.widthMm * scale;
            const cellH = cell.heightMm * scale;
            const gapS = Math.max(groutMm * scale, 0.6);
            const x = cell.xMm * scale + gapS / 2;
            const y = cell.yMm * scale + gapS / 2;
            const cut = cell.type !== "whole" || cell.cutByOpening;
            const tone = (ri * 5 + ci * 3) % 3;
            const fill = tone === 0 ? "url(#tile-stone-a)" : tone === 1 ? "url(#tile-stone-b)" : "url(#tile-stone-c)";
            const renderedW = Math.max(cellW - gapS, 0.4);
            const renderedH = Math.max(cellH - gapS, 0.4);
            return (
              <g key={`${ri}-${ci}`}>
                <rect x={x} y={y} width={renderedW} height={renderedH} rx="1.1" fill={fill} stroke={cell.type === "corner" ? "#be123c" : cut ? "#b45309" : "#b4aba1"} strokeWidth={cut ? 1.05 : 0.32} />
                <TileMaterialDetail x={x} y={y} width={renderedW} height={renderedH} variant={tone} />
                {cut && <rect x={x} y={y} width={renderedW} height={renderedH} rx="1.4" fill={cell.type === "corner" ? "url(#tile-corner-hatch)" : "url(#tile-cut-hatch)"} />}
                {cut && cellW > 60 && cellH > 34 && <text x={x + renderedW / 2} y={y + renderedH / 2} textAnchor="middle" dominantBaseline="middle" fill={cell.type === "corner" ? "#9f1239" : "#92400e"} fontSize="6.5" fontWeight="750">{Math.round(cell.widthMm)}×{Math.round(cell.heightMm)}</text>}
              </g>
            );
          });
          return <g key={ri}>{rowElements}</g>;
        })}
        {surfaceView === "wall" && (
          <>
            <rect width={svgW} height={svgH} fill={`url(#${sceneId}-wall-light)`} pointerEvents="none" />
            <rect width={svgW} height={svgH} fill={`url(#${sceneId}-wall-falloff)`} pointerEvents="none" />
            <rect width={edgeShadeWidth} height={svgH} fill={`url(#${sceneId}-corner-left)`} pointerEvents="none" />
            <rect x={svgW - edgeShadeWidth} width={edgeShadeWidth} height={svgH} fill={`url(#${sceneId}-corner-right)`} pointerEvents="none" />
            <rect y={svgH - bottomShadeHeight} width={svgW} height={bottomShadeHeight} fill={`url(#${sceneId}-corner-bottom)`} pointerEvents="none" />
          </>
        )}
      </g>
      {surfaceView === "wall" && (
        <>
          <line x1="0" y1={svgH - 1.8} x2={svgW} y2={svgH - 1.8} stroke="#fffaf1" strokeWidth="3.6" opacity="0.9" />
          <line x1="0" y1={svgH} x2={svgW} y2={svgH} stroke="#8d7b66" strokeWidth="0.75" opacity="0.75" />
        </>
      )}
      {openingRect && (
        <g
          data-testid="tile-opening"
          role={onOpeningOffsetChange ? "slider" : undefined}
          aria-label={onOpeningOffsetChange ? "Переместить дверной проём на чертеже" : undefined}
          aria-valuemin={onOpeningOffsetChange ? 0 : undefined}
          aria-valuemax={onOpeningOffsetChange ? openingDrag.maxOffsetMm : undefined}
          aria-valuenow={onOpeningOffsetChange ? result.opening?.offsetLeftMm : undefined}
          tabIndex={onOpeningOffsetChange ? 0 : undefined}
          onPointerDown={openingDrag.onPointerDown}
          onPointerMove={openingDrag.onPointerMove}
          onPointerUp={openingDrag.onPointerUp}
          onPointerCancel={openingDrag.onPointerCancel}
          onKeyDown={openingDrag.onKeyDown}
          style={onOpeningOffsetChange ? { cursor: "grab", touchAction: "none" } : undefined}
        >
          <rect x={openingRect.x - 2} y={openingRect.y - 2} width={openingRect.width + 4} height={openingRect.height + 2} fill="#65584a" opacity="0.13" />
          <rect data-testid={onOpeningOffsetChange ? "tile-opening-drag" : undefined} {...openingRect} fill="#fcfbf8" stroke="#9f9487" strokeWidth="1.4" />
          <line x1={openingRect.x + 2} y1={openingRect.y + 2} x2={openingRect.x + openingRect.width - 2} y2={openingRect.y + 2} stroke="#fff" strokeWidth="1.5" />
        </g>
      )}
      <TileAlignmentGuides
        surfaceX={0}
        surfaceY={0}
        surfaceWidth={svgW}
        surfaceHeight={svgH}
        openingX={openingRect?.x}
        openingWidth={openingRect?.width}
        visible={showAlignmentGuides}
      />
      <TileDimensions width={svgW} height={svgH} surfaceW={surfaceW} surfaceH={surfaceH} surfaceView={surfaceView} metrics={sceneMetrics} />
      <text x="0" y="-34" fill="#0f172a" fontSize="13" fontWeight="750">{surfaceView === "wall" ? "Динамическая модель стены" : "Вид пола сверху"}</text>
      <text x="0" y="-22" fill="#64748b" fontSize="7.5">{tileModeLabel(result.mode)} · шов {groutMm.toLocaleString("ru-RU")} мм</text>
    </svg>
  );
}

// ── Diagonal SVG Renderer ──────────────────────────────────────────────────

function DiagonalLayoutSVG({ result, surfaceView, showAlignmentGuides = false, onOpeningOffsetChange }: { result: TileLayoutResult; surfaceView: TileSurfaceView; showAlignmentGuides?: boolean; onOpeningOffsetChange?: (offsetLeftMm: number) => void }) {
  const d = result.diagonal;
  const diagonalSurfaceW = d?.surfaceW ?? 1;
  const diagonalSurfaceH = d?.surfaceH ?? 1;
  const scale = Math.min(600 / Math.max(diagonalSurfaceW, 1), 400 / Math.max(diagonalSurfaceH, 1), 1);
  const svgW = diagonalSurfaceW * scale;
  const svgH = diagonalSurfaceH * scale;
  const openingDrag = useOpeningDrag({
    enabled: Boolean(d && result.opening && onOpeningOffsetChange),
    surfaceX: 0,
    surfaceWidth: svgW,
    surfaceWidthMm: diagonalSurfaceW,
    openingWidthMm: result.opening?.widthMm ?? 0,
    offsetLeftMm: result.opening?.offsetLeftMm ?? 0,
    onOffsetChange: onOpeningOffsetChange,
  });
  if (!d) return null;

  const half = d.halfDiagonalMm * scale;
  const clipId = "tile-diagonal-surface-clip";
  const maskId = "tile-diagonal-opening-mask";
  const openingRect = surfaceView === "wall" && result.opening
    ? {
        x: result.opening.offsetLeftMm * scale,
        y: result.opening.offsetTopMm * scale,
        width: result.opening.widthMm * scale,
        height: result.opening.heightMm * scale,
      }
    : undefined;
  const sceneMetrics = getTileSceneMetrics(svgW, svgH, surfaceView);
  const { padX, padTop, padBottom } = sceneMetrics;
  const sceneId = "tile-diag";
  const edgeShadeWidth = Math.max(5, Math.min(svgW * 0.035, 14));
  const bottomShadeHeight = Math.max(6, Math.min(svgH * 0.04, 16));

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label={`${surfaceView === "wall" ? "Диагональная плитка на стене" : "Диагональная плитка на полу"} под 45 градусов`}
    >
      <defs>
        <TileSceneDefs idPrefix={sceneId} />
        <linearGradient id="tile-diag-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffdfa" /><stop offset="1" stopColor="#f3eee7" /></linearGradient>
        <linearGradient id="tile-diag-stone-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffef9" /><stop offset="0.6" stopColor="#e9e2d8" /><stop offset="1" stopColor="#d4c9bb" /></linearGradient>
        <linearGradient id="tile-diag-stone-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8f3eb" /><stop offset="0.58" stopColor="#e0d7ca" /><stop offset="1" stopColor="#cfc2b2" /></linearGradient>
        <linearGradient id="tile-diag-stone-c" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#eee7dc" /><stop offset="0.55" stopColor="#f5f0e8" /><stop offset="1" stopColor="#fffdf8" /></linearGradient>
        <pattern id="tile-diag-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#b45309" strokeWidth="1.3" opacity="0.5" /></pattern>
        <clipPath id={clipId}><rect x={0} y={0} width={svgW} height={svgH} /></clipPath>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width={svgW} height={svgH} fill="white" />
          {openingRect && <rect {...openingRect} fill="black" />}
        </mask>
        <filter id="tile-diag-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#3d2f21" floodOpacity="0.28" /></filter>
      </defs>
      <rect x={-padX} y={-padTop} width={svgW + padX * 2} height={svgH + padTop + padBottom} rx="14" fill="url(#tile-diag-scene-bg)" />
      <TileSceneContext width={svgW} height={svgH} surfaceView={surfaceView} metrics={sceneMetrics} idPrefix={sceneId} />
      <rect width={svgW} height={svgH} fill="#d8d1c7" stroke="#9d9387" strokeWidth="1" filter="url(#tile-diag-shadow)" />
      <g clipPath={`url(#${clipId})`} mask={`url(#${maskId})`}>
        {d.cells.map((cell, i) => {
          if (cell.excludedByOpening) return null;
          const cx = cell.cx * scale;
          const cy = cell.cy * scale;
          // Ромб = квадрат, повёрнутый на 45°: 4 вершины по осям.
          const pts = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
          const tone = i % 3;
          const fill = tone === 0 ? "url(#tile-diag-stone-a)" : tone === 1 ? "url(#tile-diag-stone-b)" : "url(#tile-diag-stone-c)";
          return (
            <g key={i}>
              <polygon
                points={pts}
                fill={fill}
                stroke={cell.type === "edge" ? "#b45309" : "#aaa095"}
                strokeWidth={cell.type === "edge" ? 1.05 : Math.max(half * 0.01, 0.38)}
              />
              {(cell.type === "edge" || cell.cutByOpening) && <polygon points={pts} fill="url(#tile-diag-cut-hatch)" />}
            </g>
          );
        })}
        {surfaceView === "wall" && (
          <>
            <rect width={svgW} height={svgH} fill={`url(#${sceneId}-wall-light)`} pointerEvents="none" />
            <rect width={svgW} height={svgH} fill={`url(#${sceneId}-wall-falloff)`} pointerEvents="none" />
            <rect width={edgeShadeWidth} height={svgH} fill={`url(#${sceneId}-corner-left)`} pointerEvents="none" />
            <rect x={svgW - edgeShadeWidth} width={edgeShadeWidth} height={svgH} fill={`url(#${sceneId}-corner-right)`} pointerEvents="none" />
            <rect y={svgH - bottomShadeHeight} width={svgW} height={bottomShadeHeight} fill={`url(#${sceneId}-corner-bottom)`} pointerEvents="none" />
          </>
        )}
      </g>
      {surfaceView === "wall" && (
        <>
          <line x1="0" y1={svgH - 1.8} x2={svgW} y2={svgH - 1.8} stroke="#fffaf1" strokeWidth="3.6" opacity="0.9" />
          <line x1="0" y1={svgH} x2={svgW} y2={svgH} stroke="#8d7b66" strokeWidth="0.75" opacity="0.75" />
        </>
      )}
      {openingRect && (
        <g
          data-testid="tile-opening"
          role={onOpeningOffsetChange ? "slider" : undefined}
          aria-label={onOpeningOffsetChange ? "Переместить дверной проём на диагональном чертеже" : undefined}
          aria-valuemin={onOpeningOffsetChange ? 0 : undefined}
          aria-valuemax={onOpeningOffsetChange ? openingDrag.maxOffsetMm : undefined}
          aria-valuenow={onOpeningOffsetChange ? result.opening?.offsetLeftMm : undefined}
          tabIndex={onOpeningOffsetChange ? 0 : undefined}
          onPointerDown={openingDrag.onPointerDown}
          onPointerMove={openingDrag.onPointerMove}
          onPointerUp={openingDrag.onPointerUp}
          onPointerCancel={openingDrag.onPointerCancel}
          onKeyDown={openingDrag.onKeyDown}
          style={onOpeningOffsetChange ? { cursor: "grab", touchAction: "none" } : undefined}
        >
          <rect x={openingRect.x - 2} y={openingRect.y - 2} width={openingRect.width + 4} height={openingRect.height + 2} fill="#65584a" opacity="0.13" />
          <rect data-testid={onOpeningOffsetChange ? "tile-opening-drag" : undefined} {...openingRect} fill="#fcfbf8" stroke="#9f9487" strokeWidth="1.4" />
          <line x1={openingRect.x + 2} y1={openingRect.y + 2} x2={openingRect.x + openingRect.width - 2} y2={openingRect.y + 2} stroke="#fff" strokeWidth="1.5" />
        </g>
      )}
      <TileAlignmentGuides
        surfaceX={0}
        surfaceY={0}
        surfaceWidth={svgW}
        surfaceHeight={svgH}
        openingX={openingRect?.x}
        openingWidth={openingRect?.width}
        visible={showAlignmentGuides}
      />
      <TileDimensions width={svgW} height={svgH} surfaceW={Math.round(d.surfaceW)} surfaceH={Math.round(d.surfaceH)} surfaceView={surfaceView} metrics={sceneMetrics} />
      <text x="0" y="-34" fill="#0f172a" fontSize="13" fontWeight="750">{surfaceView === "wall" ? "Динамическая модель стены" : "Вид пола сверху"}</text>
      <text x="0" y="-22" fill="#64748b" fontSize="7.5">Диагональная раскладка · 45°</text>
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function TileLayoutGenerator() {
  const searchParams = useSearchParams();
  const initialPackAreaM2 = Number(searchParams.get("packAreaM2"));
  const initialTilesPerBox = Number(searchParams.get("tilesPerBox"));
  const initialPackagingSource: TilePackagingSource = searchParams.get("packagingSource") === "label"
    && isValidTilesPerBox(initialTilesPerBox)
    ? "label"
    : "estimated";
  const initialReservePercent = Number(searchParams.get("reservePercent"));
  const [surfaceW, setSurfaceW] = useState(2500);
  const [surfaceH, setSurfaceH] = useState(2600);
  const [tileW, setTileW] = useState(600);
  const [tileH, setTileH] = useState(300);
  const [groutMm, setGroutMm] = useState(2);
  const [reservePercent, setReservePercent] = useState(
    Number.isFinite(initialReservePercent) && initialReservePercent >= 0 && initialReservePercent <= 30
      ? initialReservePercent
      : 10,
  );
  const [packAreaInput, setPackAreaInput] = useState(
    String(isValidTilePackArea(initialPackAreaM2) ? initialPackAreaM2 : DEFAULT_TILE_PACK_AREA_M2),
  );
  const [tilesPerBoxInput, setTilesPerBoxInput] = useState(
    String(isValidTilesPerBox(initialTilesPerBox) ? initialTilesPerBox : DEFAULT_TILE_TILES_PER_BOX),
  );
  const [packagingSource, setPackagingSource] = useState<TilePackagingSource>(initialPackagingSource);
  const [hasEditedTransferredPackaging, setHasEditedTransferredPackaging] = useState(false);
  const [hasOpening, setHasOpening] = useState(true);
  const [openingW, setOpeningW] = useState(900);
  const [openingH, setOpeningH] = useState(2100);
  const [openingOffsetLeft, setOpeningOffsetLeft] = useState(1300);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("straight");
  const [startMode, setStartMode] = useState<TileStartMode>("edge");
  const [startOffsetXmm, setStartOffsetXmm] = useState(300);
  const [startOffsetYmm, setStartOffsetYmm] = useState(150);
  const [surfaceView, setSurfaceView] = useState<TileSurfaceView>("wall");
  const [presentationMode, setPresentationMode] = useState<TilePresentationMode>("room");
  const [visualFinish, setVisualFinish] = useState<TileVisualFinish>("limestone");
  const [lightingPreset, setLightingPreset] = useState<TileLightingPreset>("daylight");
  const [groutColor, setGroutColor] = useState("#d4d0c8");
  const [textureSource, setTextureSource] = useState<TileTextureSource>("preset");
  const [textureScalePercent, setTextureScalePercent] = useState(100);
  const [textureRotationDeg, setTextureRotationDeg] = useState<0 | 90 | 180 | 270>(0);
  const [customTextureDataUrl, setCustomTextureDataUrl] = useState<string | null>(null);
  const [textureUploadStatus, setTextureUploadStatus] = useState<"idle" | "processing" | "ready" | "failed">("idle");
  const [textureUploadError, setTextureUploadError] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareFinish, setCompareFinish] = useState<TileVisualFinish>("graphite");
  const [compareLighting, setCompareLighting] = useState<TileLightingPreset>("warm");
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);
  const [projectName, setProjectName] = useState("Новая раскладка");
  const [savedProjects, setSavedProjects] = useState<SavedTileLayoutProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeProjectId, setActiveProjectId] = useState("");
  const [projectStatus, setProjectStatus] = useState<
    "idle" | "saving" | "saved" | "loaded" | "link-copied" | "deleted" | "failed"
  >("idle");
  const [showMobileParameters, setShowMobileParameters] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "shared" | "copied" | "failed">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "exporting" | "failed">("idle");
  const [renderPdfVisuals, setRenderPdfVisuals] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const pdfVisualsRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { markStarted, selectMode } = useToolAnalytics(
    "raskladka-plitki",
    resultRef,
  );

  const scrollTo = useCallback((ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const navigateToParameters = useCallback(() => {
    setShowMobileParameters(true);
    scrollTo(parametersRef);
  }, [scrollTo]);

  const applyProjectState = useCallback((project: TileLayoutProjectState) => {
    setProjectName(project.name);
    setSurfaceW(project.surfaceW);
    setSurfaceH(project.surfaceH);
    setTileW(project.tileW);
    setTileH(project.tileH);
    setGroutMm(project.groutMm);
    setReservePercent(project.reservePercent);
    setPackAreaInput(String(project.packAreaM2));
    setTilesPerBoxInput(String(project.tilesPerBox));
    setPackagingSource(project.packagingSource);
    setHasOpening(project.hasOpening);
    setOpeningW(project.openingW);
    setOpeningH(project.openingH);
    setOpeningOffsetLeft(project.openingOffsetLeft);
    setLayoutMode(project.layoutMode);
    setStartMode(project.startMode);
    setStartOffsetXmm(project.startOffsetXmm);
    setStartOffsetYmm(project.startOffsetYmm);
    setSurfaceView(project.surfaceView);
    setPresentationMode(project.presentationMode);
    setVisualFinish(project.visualFinish);
    setLightingPreset(project.lightingPreset);
    setGroutColor(project.groutColor);
    setTextureSource(project.textureSource);
    setTextureScalePercent(project.textureScalePercent);
    setTextureRotationDeg(project.textureRotationDeg);
    setCustomTextureDataUrl(project.customTextureDataUrl);
    setTextureUploadStatus(project.customTextureDataUrl ? "ready" : "idle");
    setTextureUploadError("");
  }, []);

  useEffect(() => {
    const projects = readSavedTileLayoutProjects(window.localStorage);
    setSavedProjects(projects);
    if (projects[0]) setSelectedProjectId(projects[0].id);
  }, []);

  useEffect(() => {
    const linkedProject = parseTileLayoutProjectSearchParams(searchParams);
    if (linkedProject) {
      applyProjectState(linkedProject);
      setActiveProjectId("");
      setProjectStatus("loaded");
      return;
    }
    const parsed = parseTileLayoutFromSearchParams(searchParams);
    if (!parsed?.surfaceW || !parsed.surfaceH) return;
    const normalized = clampLayoutInputs(
      parsed.surfaceW,
      parsed.surfaceH,
      parsed.tileW ?? 300,
      parsed.tileH ?? 600,
      parsed.groutMm ?? 2,
    );
    setSurfaceW(normalized.surfaceW);
    setSurfaceH(normalized.surfaceH);
    setTileW(normalized.tileW);
    setTileH(normalized.tileH);
    setGroutMm(normalized.groutMm);
    if (parsed.packAreaM2 != null) setPackAreaInput(String(parsed.packAreaM2));
    if (parsed.tilesPerBox != null) {
      setTilesPerBoxInput(String(parsed.tilesPerBox));
    } else if (parsed.packagingSource === "estimated" && parsed.packAreaM2 != null) {
      setTilesPerBoxInput(String(estimateTilesPerBoxFromArea(
        parsed.tileW ?? 300,
        parsed.tileH ?? 600,
        parsed.packAreaM2,
      )));
    }
    if (parsed.packagingSource) setPackagingSource(parsed.packagingSource);
    if (parsed.reservePercent != null) setReservePercent(parsed.reservePercent);
    setHasOpening(parsed.hasOpening ?? false);
    if (parsed.openingW != null) setOpeningW(parsed.openingW);
    if (parsed.openingH != null) setOpeningH(parsed.openingH);
    if (parsed.openingOffsetLeft != null) setOpeningOffsetLeft(parsed.openingOffsetLeft);
    if (parsed.layoutMode) setLayoutMode(parsed.layoutMode);
  }, [applyProjectState, searchParams]);

  const handleExportPNG = useCallback(async () => {
    const svgEl = svgContainerRef.current?.querySelector("svg");
    if (!svgEl) return;
    try {
      const visual = await renderSvgToPngVisual(svgEl, "Раскладка плитки");
      trackToolExport("raskladka-plitki", "png");
      const link = document.createElement("a");
      link.download = "tile-layout.png";
      link.href = visual.dataUrl;
      link.click();
    } catch {
      // Кнопка остаётся доступной для повторной попытки.
    }
  }, []);

  const handleTextureFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setTextureUploadStatus("processing");
    setTextureUploadError("");
    try {
      const dataUrl = await fileToTileTexture(file);
      setCustomTextureDataUrl(dataUrl);
      setTextureSource("custom");
      setTextureUploadStatus("ready");
      trackToolPresetSelect("raskladka-plitki", "material", "Своя текстура");
    } catch (error) {
      setTextureUploadStatus("failed");
      setTextureUploadError(error instanceof Error ? error.message : "Не удалось обработать изображение");
    }
  }, []);

  const removeCustomTexture = useCallback(() => {
    setCustomTextureDataUrl(null);
    setTextureSource("preset");
    setTextureUploadStatus("idle");
    setTextureUploadError("");
  }, []);

  const normalizedInput = useMemo(
    () => clampLayoutInputs(surfaceW, surfaceH, tileW, tileH, groutMm),
    [surfaceW, surfaceH, tileW, tileH, groutMm],
  );
  const normalizedOpening = useMemo(() => {
    if (surfaceView !== "wall" || !hasOpening) return undefined;
    const widthMm = Math.min(Math.max(openingW, 100), normalizedInput.surfaceW);
    const heightMm = Math.min(Math.max(openingH, 100), normalizedInput.surfaceH);
    const offsetLeftMm = Math.min(
      Math.max(openingOffsetLeft, 0),
      Math.max(normalizedInput.surfaceW - widthMm, 0),
    );
    return { widthMm, heightMm, offsetLeftMm };
  }, [hasOpening, normalizedInput.surfaceH, normalizedInput.surfaceW, openingH, openingOffsetLeft, openingW, surfaceView]);

  useEffect(() => {
    const nextWidth = Math.min(Math.max(openingW, 100), normalizedInput.surfaceW);
    const nextHeight = Math.min(Math.max(openingH, 100), normalizedInput.surfaceH);
    const nextOffset = Math.min(
      Math.max(openingOffsetLeft, 0),
      Math.max(normalizedInput.surfaceW - nextWidth, 0),
    );
    if (nextWidth !== openingW) setOpeningW(nextWidth);
    if (nextHeight !== openingH) setOpeningH(nextHeight);
    if (nextOffset !== openingOffsetLeft) setOpeningOffsetLeft(nextOffset);
  }, [normalizedInput.surfaceH, normalizedInput.surfaceW, openingH, openingOffsetLeft, openingW]);

  useEffect(() => {
    const nextX = Math.min(Math.max(startOffsetXmm, 0), Math.max(normalizedInput.tileW - 0.5, 0));
    const nextY = Math.min(Math.max(startOffsetYmm, 0), Math.max(normalizedInput.tileH - 0.5, 0));
    if (nextX !== startOffsetXmm) setStartOffsetXmm(nextX);
    if (nextY !== startOffsetYmm) setStartOffsetYmm(nextY);
  }, [normalizedInput.tileH, normalizedInput.tileW, startOffsetXmm, startOffsetYmm]);

  const result = useMemo(
    () => calculateTileLayout(
      normalizedInput.surfaceW,
      normalizedInput.surfaceH,
      normalizedInput.tileW,
      normalizedInput.tileH,
      normalizedInput.groutMm,
      layoutMode,
      normalizedOpening,
      reservePercent,
      { mode: startMode, offsetXmm: startOffsetXmm, offsetYmm: startOffsetYmm },
    ),
    [normalizedInput, layoutMode, normalizedOpening, reservePercent, startMode, startOffsetXmm, startOffsetYmm],
  );

  const startVariants = useMemo(
    () => layoutMode === "diagonal"
      ? []
      : compareTileLayoutStartModes({
          surfaceW: normalizedInput.surfaceW,
          surfaceH: normalizedInput.surfaceH,
          tileW: normalizedInput.tileW,
          tileH: normalizedInput.tileH,
          groutMm: normalizedInput.groutMm,
          layoutMode,
          opening: normalizedOpening,
          reservePercent,
          customOffsetXmm: startOffsetXmm,
          customOffsetYmm: startOffsetYmm,
          includeCustom: true,
        }),
    [layoutMode, normalizedInput, normalizedOpening, reservePercent, startOffsetXmm, startOffsetYmm],
  );
  const maxOpeningOffsetMm = normalizedOpening
    ? Math.max(normalizedInput.surfaceW - normalizedOpening.widthMm, 0)
    : 0;
  const openingRightOffsetMm = normalizedOpening
    ? Math.max(normalizedInput.surfaceW - normalizedOpening.offsetLeftMm - normalizedOpening.widthMm, 0)
    : 0;
  const openingCenterMm = normalizedOpening
    ? normalizedOpening.offsetLeftMm + normalizedOpening.widthMm / 2
    : 0;
  const openingAxisVariants = useMemo(
    () => normalizedOpening && layoutMode === "straight"
      ? compareTileLayoutOpeningAxisStarts({
          ...normalizedInput,
          layoutMode,
          opening: normalizedOpening,
          reservePercent,
        })
      : [],
    [layoutMode, normalizedInput, normalizedOpening, reservePercent],
  );
  const recommendedOpeningAxis = openingAxisVariants.find((variant) => variant.recommended);
  const openingAxisAligned = layoutMode === "straight"
    && startMode === "custom"
    && recommendedOpeningAxis != null
    && Math.abs(startOffsetXmm - recommendedOpeningAxis.offsetXmm) < 0.5;

  const updateOpeningPosition = useCallback((value: number) => {
    if (!normalizedOpening) return;
    const nextOffset = Math.min(Math.max(value, 0), maxOpeningOffsetMm);
    if (openingAxisAligned) {
      const nextRecommended = compareTileLayoutOpeningAxisStarts({
        ...normalizedInput,
        layoutMode: "straight",
        opening: { ...normalizedOpening, offsetLeftMm: nextOffset },
        reservePercent,
      }).find((variant) => variant.recommended);
      if (nextRecommended) {
        setStartOffsetXmm(nextRecommended.offsetXmm);
        setStartOffsetYmm(nextRecommended.result.startOffsetYMm);
      }
    }
    markStarted("opening");
    setOpeningOffsetLeft(nextOffset);
    setShowAlignmentGuides(true);
  }, [markStarted, maxOpeningOffsetMm, normalizedInput, normalizedOpening, openingAxisAligned, reservePercent]);

  const alignLayoutWithOpening = useCallback(() => {
    if (!recommendedOpeningAxis || layoutMode !== "straight") return;
    markStarted("opening");
    setStartMode("custom");
    setStartOffsetXmm(recommendedOpeningAxis.offsetXmm);
    setStartOffsetYmm(recommendedOpeningAxis.result.startOffsetYMm);
    setShowAlignmentGuides(true);
  }, [layoutMode, markStarted, recommendedOpeningAxis]);

  const perimeterCuts = useMemo(() => [
    { label: "Слева", value: result.cutLeft, tileSize: normalizedInput.tileW },
    { label: "Справа", value: result.cutRight, tileSize: normalizedInput.tileW },
    { label: "Сверху", value: result.cutTop, tileSize: normalizedInput.tileH },
    { label: "Снизу", value: result.cutBottom, tileSize: normalizedInput.tileH },
  ], [normalizedInput.tileH, normalizedInput.tileW, result.cutBottom, result.cutLeft, result.cutRight, result.cutTop]);
  const narrowPerimeterCuts = perimeterCuts.filter(
    (cut) => cut.value > 0.5 && cut.value < cut.tileSize * 0.3,
  );

  const normalizedPackAreaInput = packAreaInput.trim().replace(",", ".");
  const parsedPackAreaM2 = normalizedPackAreaInput === ""
    ? undefined
    : Number(normalizedPackAreaInput);
  const packAreaError = parsedPackAreaM2 == null || isValidTilePackArea(parsedPackAreaM2)
    ? null
    : `Допустимые значения: ${MIN_TILE_PACK_AREA_M2} — ${MAX_TILE_PACK_AREA_M2} м²`;
  const transferredLabelTilesPerBox = Number(searchParams.get("tilesPerBox"));
  const effectiveTilesPerBoxInput = packagingSource === "label"
    && isValidTilesPerBox(transferredLabelTilesPerBox)
    && !hasEditedTransferredPackaging
      ? String(transferredLabelTilesPerBox)
      : tilesPerBoxInput;
  const parsedTilesPerBox = Number(effectiveTilesPerBoxInput.trim());
  const tilesPerBoxError = isValidTilesPerBox(parsedTilesPerBox)
    ? null
    : `Введите целое число от ${MIN_TILE_TILES_PER_BOX} до ${MAX_TILE_TILES_PER_BOX}`;
  const packagingError = tilesPerBoxError ?? packAreaError;
  const packaging = useMemo(
    () => packagingError
      ? null
      : calculateTilePackaging(
          result.purchaseTiles,
          normalizedInput.tileW,
          normalizedInput.tileH,
          {
            tilesPerBox: parsedTilesPerBox,
            packAreaM2: parsedPackAreaM2,
            source: packagingSource,
          },
        ),
    [packagingError, packagingSource, parsedPackAreaM2, parsedTilesPerBox, result.purchaseTiles, normalizedInput.tileH, normalizedInput.tileW],
  );

  const handleEstimatePackaging = useCallback(() => {
    if (parsedPackAreaM2 == null || packAreaError) return;
    setHasEditedTransferredPackaging(true);
    markStarted("material_packaging");
    setTilesPerBoxInput(String(estimateTilesPerBoxFromArea(
      normalizedInput.tileW,
      normalizedInput.tileH,
      parsedPackAreaM2,
    )));
    setPackagingSource("estimated");
  }, [markStarted, normalizedInput.tileH, normalizedInput.tileW, packAreaError, parsedPackAreaM2]);

  const surfaceAreaM2 = useMemo(
    () => Math.round((result.coveredAreaMm2 / 1_000_000) * 100) / 100,
    [result.coveredAreaMm2],
  );

  const tileCalculatorHref = useMemo(
    () => buildPlitkaCalculatorHref(
      {
        surfaceW: normalizedInput.surfaceW,
        surfaceH: normalizedInput.surfaceH,
        tileW: normalizedInput.tileW,
        tileH: normalizedInput.tileH,
        groutMm: normalizedInput.groutMm,
        layoutMode,
        packAreaM2: packAreaError ? undefined : parsedPackAreaM2,
        tilesPerBox: tilesPerBoxError ? undefined : parsedTilesPerBox,
        packagingSource,
        reservePercent,
        hasOpening: Boolean(normalizedOpening),
        openingW: normalizedOpening?.widthMm,
        openingH: normalizedOpening?.heightMm,
        openingOffsetLeft: normalizedOpening?.offsetLeftMm,
      },
      { areaM2: surfaceAreaM2, tilesTotal: result.purchaseTiles },
    ),
    [layoutMode, normalizedInput, normalizedOpening, packAreaError, packagingSource, parsedPackAreaM2, parsedTilesPerBox, reservePercent, result.purchaseTiles, surfaceAreaM2, tilesPerBoxError],
  );

  const tileAdhesiveHref = useMemo(
    () =>
      buildTileAdhesiveCalculatorHref(
        {
          surfaceW: normalizedInput.surfaceW,
          surfaceH: normalizedInput.surfaceH,
          tileW: normalizedInput.tileW,
          tileH: normalizedInput.tileH,
          groutMm: normalizedInput.groutMm,
          layoutMode,
        },
        { areaM2: surfaceAreaM2, surfaceView },
      ),
    [normalizedInput, layoutMode, surfaceAreaM2, surfaceView],
  );

  const tileGroutHref = useMemo(
    () =>
      buildTileGroutCalculatorHref(
        {
          surfaceW: normalizedInput.surfaceW,
          surfaceH: normalizedInput.surfaceH,
          tileW: normalizedInput.tileW,
          tileH: normalizedInput.tileH,
          groutMm: normalizedInput.groutMm,
          layoutMode,
        },
        { areaM2: surfaceAreaM2 },
      ),
    [normalizedInput, layoutMode, surfaceAreaM2],
  );

  const layoutMaterials = useMemo(
    () => [
      packaging
        ? {
            name: `Плитка ${normalizedInput.tileW}×${normalizedInput.tileH} мм (${packaging.tilesPerBox} шт./кор., ${packaging.packagingSource === "label" ? "этикетка" : "оценка"})`,
            quantity: packaging.boxesToBuy,
            unit: "кор.",
            category: "Плитка",
          }
        : {
            name: "Плитка к закупке (с запасом, без округления коробок)",
            quantity: result.purchaseTiles,
            unit: "шт",
            category: "Плитка",
          },
      {
        name: result.opening ? "Площадь облицовки" : "Площадь поверхности",
        quantity: surfaceAreaM2,
        unit: "м²",
        category: "Плитка",
      },
    ],
    [normalizedInput.tileH, normalizedInput.tileW, packaging, result.opening, result.purchaseTiles, surfaceAreaM2],
  );

  const exportPlan = useMemo(
    () => packaging
      ? buildTileLayoutExportPlan({
          projectName,
          surfaceLabel: surfaceView === "wall" ? "Стена" : "Пол",
          surfaceW: normalizedInput.surfaceW,
          surfaceH: normalizedInput.surfaceH,
          tileW: normalizedInput.tileW,
          tileH: normalizedInput.tileH,
          groutMm: normalizedInput.groutMm,
          layoutModeLabel: tileModeLabel(layoutMode),
          startModeLabel: tileStartLabel(result.startMode, layoutMode),
          edgeCuts: {
            left: result.cutLeft,
            right: result.cutRight,
            top: result.cutTop,
            bottom: result.cutBottom,
          },
          surfaceAreaM2,
          basePurchaseTiles: result.basePurchaseTiles,
          reserveTiles: result.purchaseReserveTiles,
          reservePercent: result.reservePercent,
          purchaseTiles: result.purchaseTiles,
          opening: result.opening
            ? { widthMm: result.opening.widthMm, heightMm: result.opening.heightMm }
            : undefined,
          packaging,
        })
      : null,
    [layoutMode, normalizedInput, packaging, projectName, result, surfaceAreaM2, surfaceView],
  );
  const selectedSavedPassport = useMemo(() => {
    const project = savedProjects.find((item) => item.id === selectedProjectId);
    if (!project) return null;
    const input = clampLayoutInputs(
      project.surfaceW,
      project.surfaceH,
      project.tileW,
      project.tileH,
      project.groutMm,
    );
    const opening = project.surfaceView === "wall" && project.hasOpening
      ? {
          widthMm: project.openingW,
          heightMm: project.openingH,
          offsetLeftMm: project.openingOffsetLeft,
        }
      : undefined;
    const savedResult = calculateTileLayout(
      input.surfaceW,
      input.surfaceH,
      input.tileW,
      input.tileH,
      input.groutMm,
      project.layoutMode,
      opening,
      project.reservePercent,
      {
        mode: project.startMode,
        offsetXmm: project.startOffsetXmm,
        offsetYmm: project.startOffsetYmm,
      },
    );
    const savedPackaging = calculateTilePackaging(
      savedResult.purchaseTiles,
      input.tileW,
      input.tileH,
      {
        tilesPerBox: project.tilesPerBox,
        packAreaM2: project.packAreaM2,
        source: project.packagingSource,
      },
    );
    const savedPlan = buildTileLayoutExportPlan({
      projectName: project.name,
      surfaceLabel: project.surfaceView === "wall" ? "Стена" : "Пол",
      surfaceW: input.surfaceW,
      surfaceH: input.surfaceH,
      tileW: input.tileW,
      tileH: input.tileH,
      groutMm: input.groutMm,
      layoutModeLabel: tileModeLabel(project.layoutMode),
      startModeLabel: tileStartLabel(savedResult.startMode, project.layoutMode),
      edgeCuts: {
        left: savedResult.cutLeft,
        right: savedResult.cutRight,
        top: savedResult.cutTop,
        bottom: savedResult.cutBottom,
      },
      surfaceAreaM2: Math.round((savedResult.coveredAreaMm2 / 1_000_000) * 100) / 100,
      basePurchaseTiles: savedResult.basePurchaseTiles,
      reserveTiles: savedResult.purchaseReserveTiles,
      reservePercent: savedResult.reservePercent,
      purchaseTiles: savedResult.purchaseTiles,
      opening: savedResult.opening
        ? { widthMm: savedResult.opening.widthMm, heightMm: savedResult.opening.heightMm }
        : undefined,
      packaging: savedPackaging,
    });
    return {
      passport: savedPlan.passport,
      result: savedResult,
      input,
      surfaceView: project.surfaceView,
      visualFinish: project.visualFinish,
      lightingPreset: project.lightingPreset,
      groutColor: project.groutColor,
      textureSource: project.textureSource,
      textureScalePercent: project.textureScalePercent,
      textureRotationDeg: project.textureRotationDeg,
      customTextureDataUrl: project.customTextureDataUrl,
    };
  }, [savedProjects, selectedProjectId]);
  const exportEstimate = useEstimateExport(exportPlan?.calculatorName ?? "Раскладка плитки");

  const projectState = useMemo<TileLayoutProjectState>(() => ({
    name: projectName,
    surfaceW: normalizedInput.surfaceW,
    surfaceH: normalizedInput.surfaceH,
    tileW: normalizedInput.tileW,
    tileH: normalizedInput.tileH,
    groutMm: normalizedInput.groutMm,
    reservePercent,
    packAreaM2: packAreaError || parsedPackAreaM2 == null ? DEFAULT_TILE_PACK_AREA_M2 : parsedPackAreaM2,
    tilesPerBox: tilesPerBoxError ? DEFAULT_TILE_TILES_PER_BOX : parsedTilesPerBox,
    packagingSource,
    hasOpening: surfaceView === "wall" && hasOpening,
    openingW,
    openingH,
    openingOffsetLeft,
    layoutMode,
    startMode,
    startOffsetXmm,
    startOffsetYmm,
    surfaceView,
    presentationMode,
    visualFinish,
    lightingPreset,
    groutColor,
    textureSource,
    textureScalePercent,
    textureRotationDeg,
    customTextureDataUrl,
  }), [
    hasOpening,
    layoutMode,
    normalizedInput,
    openingH,
    openingOffsetLeft,
    openingW,
    packAreaError,
    packagingSource,
    parsedPackAreaM2,
    parsedTilesPerBox,
    presentationMode,
    projectName,
    reservePercent,
    startMode,
    startOffsetXmm,
    startOffsetYmm,
    surfaceView,
    tilesPerBoxError,
    visualFinish,
    lightingPreset,
    groutColor,
    textureSource,
    textureScalePercent,
    textureRotationDeg,
    customTextureDataUrl,
  ]);

  useEffect(() => {
    setShareStatus("idle");
  }, [exportPlan?.shareText]);

  const handleExportPDF = useCallback(async () => {
    if (!exportPlan) return;
    setPdfStatus("exporting");
    setRenderPdfVisuals(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const visualSvgs = pdfVisualsRef.current?.querySelectorAll("svg");
      if (!visualSvgs || visualSvgs.length < 2) {
        throw new Error("Не удалось подготовить схемы раскладки");
      }
      const visuals = await Promise.all([
        renderSvgToPngVisual(visualSvgs[0], "Объёмный вид"),
        renderSvgToPngVisual(visualSvgs[1], "Точный чертёж"),
      ]);
      trackToolExport("raskladka-plitki", "pdf");
      await exportEstimate(
        exportPlan.materials,
        exportPlan.totals,
        exportPlan.warnings,
        `${tileModeLabel(layoutMode)} · ${tileStartLabel(result.startMode, layoutMode).toLocaleLowerCase("ru-RU")} · ${surfaceView === "wall" ? "стена" : "пол"} · ${textureSource === "custom" ? "своя текстура" : TILE_VISUAL_FINISHES[visualFinish].label.toLocaleLowerCase("ru-RU")} · затирка ${groutColor} · фактура ${textureScalePercent}% / ${textureRotationDeg}° · свет: ${TILE_LIGHTING_PRESETS[lightingPreset].label.toLocaleLowerCase("ru-RU")}`,
        visuals,
        exportPlan.pdfPassport,
      ).toPDF();
      setPdfStatus("idle");
    } catch {
      setPdfStatus("failed");
    } finally {
      setRenderPdfVisuals(false);
    }
  }, [exportEstimate, exportPlan, groutColor, layoutMode, lightingPreset, result.startMode, surfaceView, textureRotationDeg, textureScalePercent, textureSource, visualFinish]);

  const handleShare = useCallback(async () => {
    if (!exportPlan || typeof window === "undefined") return;
    setShareStatus("sharing");
    trackToolExport("raskladka-plitki", "share");
    const result = await shareOrCopy({
      title: exportPlan.shareTitle,
      text: exportPlan.shareText,
      url: new URL(buildTileLayoutProjectHref(projectState), window.location.origin).toString(),
    });
    if (result === "cancelled") {
      setShareStatus("idle");
      return;
    }
    setShareStatus(result);
  }, [exportPlan, projectState]);

  const handleSaveProject = useCallback(() => {
    if (packagingError || typeof window === "undefined") return;
    setProjectStatus("saving");
    try {
      const saved = saveTileLayoutProject(
        window.localStorage,
        projectState,
        activeProjectId ? { id: activeProjectId } : undefined,
      );
      setSavedProjects(saved.projects);
      setActiveProjectId(saved.project.id);
      setSelectedProjectId(saved.project.id);
      setProjectName(saved.project.name);
      setProjectStatus("saved");
      trackProjectSave("instrument-raskladka-plitki", saved.created);
    } catch {
      setProjectStatus("failed");
    }
  }, [activeProjectId, packagingError, projectState]);

  const handleCopyProjectLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = new URL(buildTileLayoutProjectHref(projectState), window.location.origin).toString();
    const copied = await copyText(url);
    setProjectStatus(copied ? "link-copied" : "failed");
    if (copied) trackToolExport("raskladka-plitki", "share");
  }, [projectState]);

  const handleOpenProject = useCallback(() => {
    const project = savedProjects.find((item) => item.id === selectedProjectId);
    if (!project || typeof window === "undefined") return;
    applyProjectState(project);
    setActiveProjectId(project.id);
    setProjectStatus("loaded");
    window.history.replaceState(null, "", buildTileLayoutProjectHref(project));
  }, [applyProjectState, savedProjects, selectedProjectId]);

  const handleDeleteProject = useCallback(() => {
    const project = savedProjects.find((item) => item.id === selectedProjectId);
    if (!project || typeof window === "undefined") return;
    if (!window.confirm(`Удалить проект «${project.name}»?`)) return;
    try {
      const projects = deleteSavedTileLayoutProject(window.localStorage, project.id);
      setSavedProjects(projects);
      setSelectedProjectId(projects[0]?.id ?? "");
      if (activeProjectId === project.id) setActiveProjectId("");
      setProjectStatus("deleted");
    } catch {
      setProjectStatus("failed");
    }
  }, [activeProjectId, savedProjects, selectedProjectId]);

  const selectedSurfacePreset = SURFACE_SIZE_PRESETS.findIndex(
    (preset) => preset.w === surfaceW && preset.h === surfaceH,
  );
  const selectedTilePreset = TILE_SIZE_PRESETS.findIndex(
    (preset) => preset.w === tileW && preset.h === tileH,
  );

  const applySurfacePreset = useCallback((index: number) => {
    const preset = SURFACE_SIZE_PRESETS[index];
    if (!preset) return;
    markStarted("preset");
    trackToolPresetSelect("raskladka-plitki", "surface", preset.label);
    const floorPreset = preset.label.toLocaleLowerCase("ru-RU").includes("пол");
    setSurfaceW(preset.w);
    setSurfaceH(preset.h);
    setSurfaceView(floorPreset ? "floor" : "wall");
    if (floorPreset) setHasOpening(false);
    if (preset.w === 2500 && preset.h === 2600) {
      setHasOpening(true);
      setOpeningW(900);
      setOpeningH(2100);
      setOpeningOffsetLeft(1300);
    }
  }, [markStarted]);

  const applyTilePreset = useCallback((index: number) => {
    const preset = TILE_SIZE_PRESETS[index];
    if (!preset) return;
    markStarted("preset");
    trackToolPresetSelect("raskladka-plitki", "material", preset.label);
    setTileW(preset.w);
    setTileH(preset.h);
    if (packagingSource === "estimated" && parsedPackAreaM2 != null && !packAreaError) {
      setTilesPerBoxInput(String(estimateTilesPerBoxFromArea(preset.w, preset.h, parsedPackAreaM2)));
    }
  }, [markStarted, packAreaError, packagingSource, parsedPackAreaM2]);

  return (
    <div className="space-y-5">
      {searchParams.get("from") === "calculator" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/25 dark:text-blue-200">
          <p className="font-semibold">Параметры перенесены из калькулятора плитки</p>
          <p className="mt-1 text-xs leading-relaxed">
            {searchParams.get("surfaceSource") === "area-derived"
              ? "В калькуляторе была указана только площадь, поэтому мы построили равностороннюю поверхность той же площади. Уточните длину и ширину перед финальной раскладкой."
              : "Размеры поверхности, формат плитки, шов, способ укладки и фасовка уже заполнены."}
          </p>
        </div>
      )}
      <WorkspaceSteps
        onParameters={navigateToParameters}
        onLayout={() => scrollTo(layoutRef)}
        onResult={() => scrollTo(resultRef)}
      />

      <section data-testid="tile-project-workspace" className="card overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">Проект раскладки</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Сохраните стену и вернитесь к ней позже</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Размеры, проём, плитка, шов, запас и выбранный вид сохраняются в этом браузере. Ссылка восстанавливает ту же схему на другом устройстве.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {savedProjects.length > 0 ? `${savedProjects.length} сохранено` : "Хранится локально"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(240px,1.15fr)_auto_minmax(280px,1fr)] xl:items-end">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Название помещения или стены</span>
            <input
              data-testid="tile-project-name"
              type="text"
              maxLength={80}
              value={projectName}
              onChange={(event) => { setProjectName(event.target.value); setProjectStatus("idle"); }}
              placeholder="Например, ванная — стена у двери"
              className="input-field min-h-11 w-full"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              data-testid="tile-save-layout-project"
              disabled={Boolean(packagingError) || projectStatus === "saving"}
              onClick={handleSaveProject}
              className="btn-primary inline-flex min-h-11 items-center justify-center px-4 text-center text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              {projectStatus === "saving" ? "Сохраняем…" : activeProjectId ? "Обновить проект" : "Сохранить проект"}
            </button>
            <button
              type="button"
              data-testid="tile-copy-project-link"
              onClick={handleCopyProjectLink}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-accent-700 dark:hover:bg-accent-950/30 dark:hover:text-accent-300"
            >
              Копировать ссылку
            </button>
          </div>

          <div className="min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Сохранённые проекты</span>
            {savedProjects.length === 0 ? (
              <div className="flex min-h-11 items-center rounded-xl border border-dashed border-slate-200 px-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                После сохранения проект появится здесь
              </div>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                <select
                  aria-label="Сохранённые проекты раскладки"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="input-field min-h-11 min-w-0 w-full text-sm"
                >
                  {savedProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  data-testid="tile-open-layout-project"
                  disabled={!selectedProjectId}
                  onClick={handleOpenProject}
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200"
                >
                  Открыть
                </button>
                <button
                  type="button"
                  aria-label="Удалить сохранённый проект"
                  disabled={!selectedProjectId}
                  onClick={handleDeleteProject}
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-400"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>

        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-slate-500 dark:text-slate-400">
          {projectStatus === "saved" && "Проект сохранён в этом браузере."}
          {projectStatus === "loaded" && "Проект восстановлен — все параметры применены."}
          {projectStatus === "link-copied" && "Ссылка с полной схемой скопирована."}
          {projectStatus === "deleted" && "Сохранённый проект удалён."}
          {projectStatus === "failed" && "Не удалось сохранить данные. Проверьте доступ браузера к локальному хранилищу."}
        </p>
        {selectedSavedPassport && (
          <TileLayoutPassportCard
            passport={selectedSavedPassport.passport}
            compact
            className="mt-3"
            visual={(
              <TileRoomPreviewSVG
                result={selectedSavedPassport.result}
                groutMm={selectedSavedPassport.input.groutMm}
                surfaceView={selectedSavedPassport.surfaceView}
                surfaceW={selectedSavedPassport.input.surfaceW}
                surfaceH={selectedSavedPassport.input.surfaceH}
                visualFinish={selectedSavedPassport.visualFinish}
                lightingPreset={selectedSavedPassport.lightingPreset}
                groutColor={selectedSavedPassport.groutColor}
                textureSource={selectedSavedPassport.textureSource}
                textureScalePercent={selectedSavedPassport.textureScalePercent}
                textureRotationDeg={selectedSavedPassport.textureRotationDeg}
                customTextureDataUrl={selectedSavedPassport.customTextureDataUrl}
              />
            )}
          />
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.6fr)] lg:items-start xl:grid-cols-[minmax(250px,0.9fr)_minmax(0,1.9fr)_minmax(260px,0.9fr)]">
      <div ref={parametersRef} data-tool-panel="parameters" className="card scroll-mt-32 p-4 sm:scroll-mt-24 sm:p-5 lg:col-start-1 lg:row-start-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Параметры раскладки</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {surfaceAreaM2} м²
            </span>
            <button
              type="button"
              aria-expanded={showMobileParameters}
              aria-controls="tile-parameters-content"
              onClick={() => setShowMobileParameters((visible) => !visible)}
              className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 sm:hidden dark:border-slate-700 dark:text-slate-300"
            >
              {showMobileParameters ? "Свернуть" : "Изменить"}
            </button>
          </div>
        </div>

        <div id="tile-parameters-content" className={`${showMobileParameters ? "block" : "hidden"} mt-4 space-y-4 sm:block`}>
        {/* Surface size */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">1</span>
            Размер поверхности
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:max-w-sm">
            <input aria-label="Ширина поверхности в миллиметрах" type="number" inputMode="numeric" min={100} max={20000} value={surfaceW} onChange={(e) => { markStarted("surface_size"); setSurfaceW(clampLayoutInput(Number(e.target.value), "surface")); }} className="input-field min-w-0 w-full" />
            <span className="text-slate-400">×</span>
            <input aria-label="Высота поверхности в миллиметрах" type="number" inputMode="numeric" min={100} max={20000} value={surfaceH} onChange={(e) => { markStarted("surface_size"); setSurfaceH(clampLayoutInput(Number(e.target.value), "surface")); }} className="input-field min-w-0 w-full" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <details className="group mt-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
            <summary className="cursor-pointer list-none text-[11px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-300">
              <span className="flex items-center justify-between gap-2">Готовые размеры <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span></span>
            </summary>
            <select
              aria-label="Быстрый размер поверхности"
              value={selectedSurfacePreset >= 0 ? String(selectedSurfacePreset) : ""}
              onChange={(event) => {
                if (event.target.value !== "") applySurfacePreset(Number(event.target.value));
              }}
              className="input-field mt-2 w-full text-xs"
            >
              <option value="">Свой размер</option>
              {SURFACE_SIZE_PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>{preset.label}</option>
              ))}
            </select>
          </details>
        </div>

        {/* Tile size */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">2</span>
            Размер плитки
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:max-w-sm">
            <input aria-label="Ширина плитки в миллиметрах" type="number" inputMode="numeric" min={10} max={2000} value={tileW} onChange={(e) => { const next = clampLayoutInput(Number(e.target.value), "tile"); markStarted("material_size"); setTileW(next); if (packagingSource === "estimated" && parsedPackAreaM2 != null && !packAreaError) setTilesPerBoxInput(String(estimateTilesPerBoxFromArea(next, normalizedInput.tileH, parsedPackAreaM2))); }} className="input-field min-w-0 w-full" />
            <span className="text-slate-400">×</span>
            <input aria-label="Высота плитки в миллиметрах" type="number" inputMode="numeric" min={10} max={2000} value={tileH} onChange={(e) => { const next = clampLayoutInput(Number(e.target.value), "tile"); markStarted("material_size"); setTileH(next); if (packagingSource === "estimated" && parsedPackAreaM2 != null && !packAreaError) setTilesPerBoxInput(String(estimateTilesPerBoxFromArea(normalizedInput.tileW, next, parsedPackAreaM2))); }} className="input-field min-w-0 w-full" />
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <label className="mt-2 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Быстрый формат
            <select
              aria-label="Быстрый формат плитки"
              value={selectedTilePreset >= 0 ? String(selectedTilePreset) : ""}
              onChange={(event) => {
                if (event.target.value !== "") applyTilePreset(Number(event.target.value));
              }}
              className="input-field mt-1 w-full text-xs"
            >
              <option value="">Свой формат</option>
              {TILE_SIZE_PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>{preset.label} см</option>
              ))}
            </select>
          </label>
          <details data-testid="tile-packaging-settings" className="group mt-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
            <summary className="cursor-pointer list-none text-[11px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-300">
              <span className="flex items-center justify-between gap-2">
                <span>Упаковка · {packagingError ? "уточните фасовку" : `${packaging?.tilesPerBox} шт./кор. · ${packagingSource === "label" ? "по этикетке" : "оценка"}`}</span>
                <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
              </span>
            </summary>
            <label className="mt-2 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Штук в коробке
              <div className="relative mt-1">
                <input
                  aria-label="Штук плитки в коробке"
                  aria-invalid={tilesPerBoxError ? "true" : "false"}
                  aria-describedby={tilesPerBoxError ? "tile-pack-pieces-error" : "tile-pack-pieces-hint"}
                  type="text"
                  inputMode="numeric"
                  value={effectiveTilesPerBoxInput}
                  onChange={(event) => {
                    markStarted("material_packaging");
                    setHasEditedTransferredPackaging(true);
                    setTilesPerBoxInput(event.target.value);
                    setPackagingSource("label");
                  }}
                  className={`input-field w-full pr-12 ${tilesPerBoxError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">шт.</span>
              </div>
            </label>
            {tilesPerBoxError ? (
              <p id="tile-pack-pieces-error" className="mt-1.5 text-[10px] leading-relaxed text-rose-600 dark:text-rose-300">{tilesPerBoxError}</p>
            ) : (
              <p id="tile-pack-pieces-hint" className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                <span data-testid="tile-packaging-source" className={`rounded-full px-1.5 py-0.5 font-semibold ${packagingSource === "label" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                  {packagingSource === "label" ? "По этикетке" : "Оценка"}
                </span>
                Основной параметр для покупки коробок.
              </p>
            )}
            <label className="mt-3 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Площадь на этикетке (необязательно)
              <div className="relative mt-1">
                <input
                  aria-label="Площадь плитки в коробке"
                  aria-invalid={packAreaError ? "true" : "false"}
                  aria-describedby={packAreaError ? "tile-pack-area-error" : "tile-pack-area-hint"}
                  type="text"
                  inputMode="decimal"
                  value={packAreaInput}
                  onChange={(event) => {
                    markStarted("material_packaging");
                    setPackAreaInput(event.target.value);
                    const nextPackArea = Number(event.target.value.trim().replace(",", "."));
                    if (packagingSource === "estimated" && isValidTilePackArea(nextPackArea)) {
                      setTilesPerBoxInput(String(estimateTilesPerBoxFromArea(
                        normalizedInput.tileW,
                        normalizedInput.tileH,
                        nextPackArea,
                      )));
                    }
                  }}
                  className={`input-field w-full pr-10 ${packAreaError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">м²</span>
              </div>
            </label>
            {packAreaError ? (
              <p id="tile-pack-area-error" className="mt-1.5 text-[10px] leading-relaxed text-rose-600 dark:text-rose-300">{packAreaError}</p>
            ) : (
              <p id="tile-pack-area-hint" className="mt-1.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                Введите площадь конкретной коробки с этикетки. 1,44 м² — пример, а не универсальная норма.
              </p>
            )}
            <button
              type="button"
              data-testid="tile-estimate-pack-pieces"
              disabled={parsedPackAreaM2 == null || Boolean(packAreaError)}
              onClick={handleEstimatePackaging}
              className="mt-2 min-h-10 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            >
              Оценить шт. по площади
            </button>
          </details>
        </div>

        {/* Layout mode */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">3</span>
            Способ укладки
          </div>
          <select
            aria-label="Способ укладки"
            value={layoutMode}
            onChange={(event) => {
              const mode = event.target.value as LayoutMode;
              selectMode(mode);
              setLayoutMode(mode);
            }}
            className="input-field w-full text-sm"
          >
            {LAYOUT_MODE_OPTIONS.map((mode) => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            {LAYOUT_MODE_OPTIONS.find((mode) => mode.value === layoutMode)?.desc}
          </p>
        </div>

        {/* Start line */}
        <div data-testid="tile-start-controls">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">4</span>
            Старт раскладки
          </div>
          {layoutMode === "diagonal" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Для диагональной укладки сетка центрируется автоматически — ручной сдвиг не нужен.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Старт раскладки">
                {TILE_START_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={startMode === option.value}
                    onClick={() => { markStarted("layout_mode"); setStartMode(option.value); }}
                    className={`min-h-11 rounded-lg px-1.5 py-2 text-[10px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${startMode === option.value ? "bg-white text-accent-700 shadow-sm dark:bg-slate-700 dark:text-accent-300" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                {TILE_START_OPTIONS.find((option) => option.value === startMode)?.short}
              </p>
              {startMode === "custom" && (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Подрезка слева
                    <div className="relative mt-1">
                      <input
                        aria-label="Стартовый сдвиг по горизонтали"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={Math.max(normalizedInput.tileW - 0.5, 0)}
                        step={1}
                        value={startOffsetXmm}
                        onChange={(event) => setStartOffsetXmm(Math.min(Math.max(Number(event.target.value), 0), normalizedInput.tileW - 0.5))}
                        className="input-field w-full pr-9"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">мм</span>
                    </div>
                  </label>
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Подрезка сверху
                    <div className="relative mt-1">
                      <input
                        aria-label="Стартовый сдвиг по вертикали"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={Math.max(normalizedInput.tileH - 0.5, 0)}
                        step={1}
                        value={startOffsetYmm}
                        onChange={(event) => setStartOffsetYmm(Math.min(Math.max(Number(event.target.value), 0), normalizedInput.tileH - 0.5))}
                        className="input-field w-full pr-9"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">мм</span>
                    </div>
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {/* Grout and reserve */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">5</span>
            Шов и запас
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Ширина шва
              <div className="relative mt-1">
                <input
                  aria-label="Ширина шва в миллиметрах"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={10}
                  step={0.5}
                  value={groutMm}
                  onChange={(event) => {
                    markStarted("joint_width");
                    setGroutMm(clampLayoutInput(Number(event.target.value), "grout"));
                  }}
                  className="input-field w-full pr-10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">мм</span>
              </div>
            </label>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Запас материала
              <select
                aria-label="Запас материала"
                value={result.reservePercent}
                onChange={(event) => {
                  markStarted("material_reserve");
                  setReservePercent(clampLayoutInput(Number(event.target.value), "reserve"));
                }}
                className="input-field mt-1 w-full"
              >
                {[0, 5, 10, 15, 20, 25, 30].map((value) => (
                  <option key={value} value={value}>{value}%</option>
                ))}
              </select>
            </label>
          </div>
          {layoutMode === "diagonal" && reservePercent < 15 && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
              Для диагональной раскладки применяем минимум 15%.
            </p>
          )}
        </div>

        {/* Opening */}
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <span className="flex size-5 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">6</span>
              Дверной проём
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hasOpening}
              aria-label="Учитывать дверной проём"
              onClick={() => {
                markStarted("opening");
                setHasOpening((enabled) => !enabled);
                if (surfaceView === "floor") setSurfaceView("wall");
              }}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${hasOpening ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${hasOpening ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {surfaceView === "floor" && hasOpening && (
            <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Сейчас выбран пол — проём сохранён, но применяется только в режиме «Стена».
            </p>
          )}
          {hasOpening && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="space-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Ширина
                <div className="relative">
                  <input aria-label="Ширина дверного проёма в миллиметрах" type="number" inputMode="numeric" min={100} max={normalizedInput.surfaceW} value={openingW} onChange={(e) => { markStarted("opening"); setOpeningW(Math.min(Math.max(Number(e.target.value), 100), normalizedInput.surfaceW)); }} className="input-field w-full pr-10" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">мм</span>
                </div>
              </label>
              <label className="space-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Высота
                <div className="relative">
                  <input aria-label="Высота дверного проёма в миллиметрах" type="number" inputMode="numeric" min={100} max={normalizedInput.surfaceH} value={openingH} onChange={(e) => { markStarted("opening"); setOpeningH(Math.min(Math.max(Number(e.target.value), 100), normalizedInput.surfaceH)); }} className="input-field w-full pr-10" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">мм</span>
                </div>
              </label>
              <details className="group col-span-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                <summary className="cursor-pointer list-none text-[11px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-300">
                  <span className="flex items-center justify-between gap-2">Положение проёма <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span></span>
                </summary>
                <label className="mt-2 block space-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Отступ слева
                  <div className="relative">
                    <input aria-label="Отступ дверного проёма слева в миллиметрах" type="number" inputMode="numeric" min={0} max={maxOpeningOffsetMm} value={openingOffsetLeft} onChange={(e) => updateOpeningPosition(Number(e.target.value))} className="input-field w-full pr-10" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">мм</span>
                  </div>
                </label>
              </details>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Visual layout */}
      <div ref={layoutRef} data-tool-panel="layout" className="card min-w-0 scroll-mt-32 space-y-4 p-4 sm:scroll-mt-24 sm:p-5 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {presentationMode === "room" ? "Объёмный вид раскладки" : "Точный чертёж раскладки"}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleExportPNG}
            className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-accent-300 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:border-slate-700 dark:text-slate-400"
          >
            {compareMode && presentationMode === "room" ? "PNG варианта A" : "Скачать PNG"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Вид поверхности">
            {(["wall", "floor"] as const).map((value) => <button type="button" key={value} aria-pressed={surfaceView === value} onClick={() => setSurfaceView(value)} className={`min-h-11 rounded-lg px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${surfaceView === value ? "bg-white text-accent-700 shadow-sm dark:bg-slate-700 dark:text-accent-300" : "text-slate-500 dark:text-slate-400"}`}>{value === "wall" ? "Стена" : "Пол"}</button>)}
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Режим отображения">
            {(["room", "drawing"] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={presentationMode === value}
                onClick={() => setPresentationMode(value)}
                className={`min-h-11 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 sm:px-4 ${presentationMode === value ? "bg-white text-accent-700 shadow-sm dark:bg-slate-700 dark:text-accent-300" : "text-slate-500 dark:text-slate-400"}`}
              >
                {value === "room" ? "Объёмный вид" : "Чертёж"}
              </button>
            ))}
          </div>
        </div>

        {presentationMode === "room" && (
          <section data-testid="tile-visual-finish" className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Материал плитки{compareMode ? " · Вариант A" : ""}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Меняет только внешний вид модели, не влияет на расчёт.</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">Визуализация</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Визуальный материал плитки">
              {(Object.entries(TILE_VISUAL_FINISHES) as [TileVisualFinish, TileVisualPalette][]).map(([value, finish]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={visualFinish === value}
                  onClick={() => {
                    setVisualFinish(value);
                    setTextureSource("preset");
                    trackToolPresetSelect("raskladka-plitki", "material", finish.label);
                  }}
                  className={`min-h-12 rounded-xl border px-2.5 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${visualFinish === value ? "border-accent-400 bg-white text-slate-900 shadow-sm ring-1 ring-accent-200 dark:border-accent-600 dark:bg-slate-800 dark:text-white dark:ring-accent-900" : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"}`}
                >
                  <span
                    aria-hidden="true"
                    className="mb-1.5 block h-5 w-full rounded-md border border-black/10 shadow-inner"
                    style={{
                      backgroundColor: finish.tones[1][1],
                      backgroundImage: `linear-gradient(135deg, transparent, ${finish.tones[2][2]}55 80%), url(${finish.textureSrc})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                  />
                  <span className="block text-[10px] font-bold leading-tight">{finish.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{TILE_VISUAL_FINISHES[visualFinish].description}</p>
            <div data-testid="tile-texture-controls" className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100">Своя плитка</p>
                  <p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">Фото обрабатывается в браузере и сохраняется только в локальном проекте.</p>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-accent-300 px-3 py-2 text-[10px] font-bold text-accent-700 transition-colors hover:bg-accent-50 focus-within:ring-2 focus-within:ring-accent-500/50 dark:border-accent-700 dark:text-accent-300 dark:hover:bg-accent-950/30">
                  {textureUploadStatus === "processing" ? "Обработка…" : customTextureDataUrl ? "Заменить фото" : "Загрузить фото"}
                  <input
                    data-testid="tile-texture-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={textureUploadStatus === "processing"}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      void handleTextureFile(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {customTextureDataUrl && (
                <div className="mt-3 flex items-center gap-3" data-testid="tile-custom-texture-ready">
                  <button
                    type="button"
                    aria-pressed={textureSource === "custom"}
                    onClick={() => setTextureSource("custom")}
                    className={`min-h-12 min-w-24 rounded-xl border bg-cover bg-center px-3 py-2 text-[9px] font-black text-white shadow-sm [text-shadow:0_1px_3px_rgb(0_0_0_/_0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${textureSource === "custom" ? "border-accent-500 ring-2 ring-accent-200 dark:ring-accent-900" : "border-slate-300 dark:border-slate-600"}`}
                    style={{ backgroundImage: `linear-gradient(#0002,#0005), url(${customTextureDataUrl})` }}
                  >
                    Своя текстура
                  </button>
                  <div className="min-w-0 flex-1 text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">Готово для модели, PNG и PDF</p>
                    <button type="button" onClick={removeCustomTexture} className="mt-1 min-h-8 text-rose-600 underline underline-offset-2 dark:text-rose-300">Удалить изображение</button>
                  </div>
                </div>
              )}
              {textureUploadError && <p role="alert" className="mt-2 text-[9px] font-semibold text-rose-600 dark:text-rose-300">{textureUploadError}</p>}

              <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2 dark:border-slate-700">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="tile-texture-scale" className="text-[9px] font-bold text-slate-600 dark:text-slate-300">Масштаб фактуры</label>
                    <span className="text-[9px] tabular-nums text-slate-500">{textureScalePercent}%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="tile-texture-scale-down"
                      aria-label="Уменьшить масштаб фактуры"
                      disabled={textureScalePercent <= 70}
                      onClick={() => setTextureScalePercent((value) => Math.max(value - 5, 70))}
                      className="size-11 shrink-0 rounded-lg border border-slate-200 text-lg font-bold text-slate-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    >
                      −
                    </button>
                    <input
                      id="tile-texture-scale"
                      data-testid="tile-texture-scale"
                      type="range"
                      min="70"
                      max="180"
                      step="5"
                      value={textureScalePercent}
                      onChange={(event) => setTextureScalePercent(Number(event.target.value))}
                      className="h-11 min-w-0 flex-1 accent-accent-500"
                    />
                    <button
                      type="button"
                      data-testid="tile-texture-scale-up"
                      aria-label="Увеличить масштаб фактуры"
                      disabled={textureScalePercent >= 180}
                      onClick={() => setTextureScalePercent((value) => Math.min(value + 5, 180))}
                      className="size-11 shrink-0 rounded-lg border border-slate-200 text-lg font-bold text-slate-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300">Поворот фактуры</p>
                  <div className="mt-2 grid grid-cols-4 gap-1" aria-label="Поворот текстуры плитки">
                    {([0, 90, 180, 270] as const).map((angle) => (
                      <button
                        key={angle}
                        type="button"
                        aria-pressed={textureRotationDeg === angle}
                        onClick={() => setTextureRotationDeg(angle)}
                        className={`min-h-11 rounded-lg border px-1 text-[9px] font-bold ${textureRotationDeg === angle ? "border-accent-400 bg-accent-50 text-accent-700 dark:border-accent-700 dark:bg-accent-950/30 dark:text-accent-300" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"}`}
                      >
                        {angle}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300">Цвет затирки</p>
                  <label className="inline-flex min-h-9 items-center gap-2 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                    Свой цвет
                    <input
                      data-testid="tile-grout-color-picker"
                      type="color"
                      value={groutColor}
                      onChange={(event) => setGroutColor(event.target.value)}
                      className="size-9 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-1 dark:border-slate-700"
                    />
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1.5" aria-label="Цвет затирки в модели">
                  {TILE_GROUT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={color.label}
                      aria-label={color.label}
                      aria-pressed={groutColor === color.value}
                      onClick={() => setGroutColor(color.value)}
                      className={`min-h-11 rounded-lg border p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${groutColor === color.value ? "border-accent-500 ring-2 ring-accent-200 dark:ring-accent-900" : "border-slate-200 dark:border-slate-700"}`}
                    >
                      <span className="block h-full min-h-6 rounded-md border border-black/10" style={{ backgroundColor: color.value }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Освещение комнаты{compareMode ? " · Вариант A" : ""}</p>
                <span className="text-[9px] font-medium text-slate-400">Не влияет на расчёт</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2" data-testid="tile-lighting-preset" aria-label="Освещение модели">
                {(Object.entries(TILE_LIGHTING_PRESETS) as [TileLightingPreset, TileLightingPalette][]).map(([value, light]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={lightingPreset === value}
                    onClick={() => {
                      setLightingPreset(value);
                      trackToolPresetSelect("raskladka-plitki", "material", `Свет: ${light.label}`);
                    }}
                    className={`min-h-11 rounded-xl border px-2 py-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${lightingPreset === value ? "border-accent-400 bg-white text-slate-900 shadow-sm ring-1 ring-accent-200 dark:border-accent-600 dark:bg-slate-800 dark:text-white dark:ring-accent-900" : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"}`}
                  >
                    <span
                      aria-hidden="true"
                      className="mx-auto mb-1 block size-5 rounded-full border border-black/10 shadow-sm"
                      style={{ background: `radial-gradient(circle at 38% 32%, ${light.lamp}, ${light.stage[1]} 55%, ${light.vignette})` }}
                    />
                    <span className="block text-[9px] font-bold leading-tight sm:text-[10px]">{light.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{TILE_LIGHTING_PRESETS[lightingPreset].description}</p>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Сравнение вариантов</p>
                  <p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">Одна геометрия и один расчёт, разные материал и свет.</p>
                </div>
                <button
                  type="button"
                  data-testid="tile-compare-toggle"
                  aria-pressed={compareMode}
                  onClick={() => setCompareMode((enabled) => !enabled)}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${compareMode ? "border-accent-400 bg-accent-50 text-accent-700 dark:border-accent-700 dark:bg-accent-950/40 dark:text-accent-300" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  {compareMode ? "Скрыть сравнение" : "Сравнить варианты"}
                </button>
              </div>
              {compareMode && (
                <div data-testid="tile-compare-controls" className="mt-3 rounded-xl border border-accent-200/70 bg-white/80 p-3 dark:border-accent-800/60 dark:bg-slate-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100">Вариант B</p>
                    <button
                      type="button"
                      data-testid="tile-compare-swap"
                      onClick={() => {
                        const currentFinish = visualFinish;
                        const currentLighting = lightingPreset;
                        setVisualFinish(compareFinish);
                        setLightingPreset(compareLighting);
                        setCompareFinish(currentFinish);
                        setCompareLighting(currentLighting);
                      }}
                      className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:border-slate-700 dark:text-slate-300"
                    >
                      Поменять A ↔ B
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      Материал B
                      <select
                        data-testid="tile-compare-finish"
                        aria-label="Материал варианта B"
                        value={compareFinish}
                        onChange={(event) => setCompareFinish(event.target.value as TileVisualFinish)}
                        className="input-field min-h-11 w-full text-xs"
                      >
                        {(Object.entries(TILE_VISUAL_FINISHES) as [TileVisualFinish, TileVisualPalette][]).map(([value, finish]) => <option key={value} value={value}>{finish.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      Свет B
                      <select
                        data-testid="tile-compare-lighting"
                        aria-label="Освещение варианта B"
                        value={compareLighting}
                        onChange={(event) => setCompareLighting(event.target.value as TileLightingPreset)}
                        className="input-field min-h-11 w-full text-xs"
                      >
                        {(Object.entries(TILE_LIGHTING_PRESETS) as [TileLightingPreset, TileLightingPalette][]).map(([value, light]) => <option key={value} value={value}>{light.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <p className="mt-2 text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">В проект, PNG и PDF сохраняется вариант A. Вариант B нужен для быстрого визуального выбора.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {surfaceView === "wall" && normalizedOpening && (
          <section data-testid="tile-opening-position-control" className="rounded-2xl border border-accent-200/80 bg-gradient-to-br from-white to-accent-50/50 p-3 dark:border-accent-800/60 dark:from-slate-900 dark:to-accent-950/20">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Положение проёма на стене</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Тяните дверь прямо на модели или используйте ползунок — подрезки пересчитываются сразу.</p>
              </div>
              <button
                type="button"
                aria-pressed={showAlignmentGuides}
                onClick={() => setShowAlignmentGuides((visible) => !visible)}
                className={`min-h-9 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${showAlignmentGuides ? "border-accent-300 bg-accent-50 text-accent-700 dark:border-accent-700 dark:bg-accent-900/30 dark:text-accent-300" : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                Оси разметки
              </button>
            </div>

            <label className="mt-3 block" htmlFor="tile-opening-position-range">
              <span className="sr-only">Отступ дверного проёма слева</span>
              <input
                id="tile-opening-position-range"
                data-testid="tile-opening-position-range"
                type="range"
                min={0}
                max={maxOpeningOffsetMm}
                step={10}
                value={normalizedOpening.offsetLeftMm}
                onChange={(event) => updateOpeningPosition(Number(event.target.value))}
                className="h-2 w-full cursor-ew-resize accent-orange-600"
              />
            </label>
            <div className="mt-1 flex items-center justify-between gap-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span>Слева {Math.round(normalizedOpening.offsetLeftMm)} мм</span>
              <span>Справа {Math.round(openingRightOffsetMm)} мм</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5" aria-label="Быстрое положение проёма">
              {[
                { label: "Слева", value: 0 },
                { label: "По центру", value: maxOpeningOffsetMm / 2 },
                { label: "Справа", value: maxOpeningOffsetMm },
              ].map((position) => (
                <button
                  key={position.label}
                  type="button"
                  onClick={() => updateOpeningPosition(position.value)}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {position.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="tile-align-layout-to-opening"
              disabled={layoutMode !== "straight"}
              onClick={alignLayoutWithOpening}
              className={`mt-2 flex min-h-11 w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${openingAxisAligned ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-slate-900 text-white hover:bg-accent-700 dark:bg-white dark:text-slate-900 dark:hover:bg-accent-200"} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {layoutMode !== "straight"
                ? "Привязка доступна для прямой раскладки"
                : openingAxisAligned
                  ? `Привязано: ${recommendedOpeningAxis?.alignment === "tile-center" ? "центр плитки" : "межплиточный шов"}`
                  : "Совместить раскладку с осью проёма"}
            </button>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Сравним центр плитки и межплиточный шов, исключим узкие края и оставим симметричный старт по высоте.
            </p>
          </section>
        )}

        {layoutMode !== "diagonal" && (
          <section data-testid="tile-start-comparison" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Сравнение стартовой линии</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Сначала исключаем узкие края, затем сравниваем расход и число подрезок.</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">3 варианта</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {startVariants.map((variant) => {
                const selected = startMode === variant.mode;
                return (
                  <button
                    key={variant.mode}
                    type="button"
                    data-testid={`tile-start-variant-${variant.mode}`}
                    aria-pressed={selected}
                    onClick={() => setStartMode(variant.mode)}
                    className={`relative min-w-0 rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${selected ? "border-accent-400 bg-white shadow-sm dark:border-accent-600 dark:bg-slate-800" : "border-slate-200 bg-white/70 hover:border-accent-200 dark:border-slate-700 dark:bg-slate-800/60"}`}
                  >
                    <span className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white">{tileStartLabel(variant.mode)}</span>
                      {variant.recommended && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Лучший</span>
                      )}
                    </span>
                    <span className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-slate-500 dark:text-slate-400">
                      <span>Мин. край</span><strong className="text-right text-slate-700 dark:text-slate-200">{Math.round(variant.minimumEdgeCutMm)} мм</strong>
                      <span>Узких краёв</span><strong className="text-right text-slate-700 dark:text-slate-200">{variant.narrowEdgeCount}</strong>
                      <span>К покупке</span><strong className="text-right text-slate-700 dark:text-slate-200">{variant.result.purchaseTiles} шт.</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div ref={svgContainerRef}>
          {presentationMode === "room" ? (
            compareMode ? (
              <section data-testid="tile-compare-grid" className="grid gap-3 md:grid-cols-2" aria-label="Сравнение двух вариантов отделки">
                <article data-testid="tile-compare-variant-a" className="min-w-0 rounded-2xl border border-accent-300 bg-accent-50/45 p-2.5 dark:border-accent-800 dark:bg-accent-950/20">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-accent-700 dark:text-accent-300">Вариант A · проект</p>
                    <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">{TILE_VISUAL_FINISHES[visualFinish].label} · {TILE_LIGHTING_PRESETS[lightingPreset].label}</p>
                  </div>
                  <TileRoomPreviewSVG
                    result={result}
                    groutMm={normalizedInput.groutMm}
                    surfaceView={surfaceView}
                    surfaceW={normalizedInput.surfaceW}
                    surfaceH={normalizedInput.surfaceH}
                    visualFinish={visualFinish}
                    lightingPreset={lightingPreset}
                    groutColor={groutColor}
                    textureSource={textureSource}
                    textureScalePercent={textureScalePercent}
                    textureRotationDeg={textureRotationDeg}
                    customTextureDataUrl={customTextureDataUrl}
                    showAlignmentGuides={showAlignmentGuides}
                    onOpeningOffsetChange={updateOpeningPosition}
                  />
                </article>
                <article data-testid="tile-compare-variant-b" className="min-w-0 rounded-2xl border border-slate-300 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">Вариант B · сравнение</p>
                    <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">{TILE_VISUAL_FINISHES[compareFinish].label} · {TILE_LIGHTING_PRESETS[compareLighting].label}</p>
                  </div>
                  <TileRoomPreviewSVG
                    result={result}
                    groutMm={normalizedInput.groutMm}
                    surfaceView={surfaceView}
                    surfaceW={normalizedInput.surfaceW}
                    surfaceH={normalizedInput.surfaceH}
                    visualFinish={compareFinish}
                    lightingPreset={compareLighting}
                    groutColor={groutColor}
                    textureSource="preset"
                    textureScalePercent={textureScalePercent}
                    textureRotationDeg={textureRotationDeg}
                    showAlignmentGuides={showAlignmentGuides}
                    onOpeningOffsetChange={updateOpeningPosition}
                  />
                </article>
              </section>
            ) : (
              <TileRoomPreviewSVG
                result={result}
                groutMm={normalizedInput.groutMm}
                surfaceView={surfaceView}
                surfaceW={normalizedInput.surfaceW}
                surfaceH={normalizedInput.surfaceH}
                visualFinish={visualFinish}
                lightingPreset={lightingPreset}
                groutColor={groutColor}
                textureSource={textureSource}
                textureScalePercent={textureScalePercent}
                textureRotationDeg={textureRotationDeg}
                customTextureDataUrl={customTextureDataUrl}
                showAlignmentGuides={showAlignmentGuides}
                onOpeningOffsetChange={updateOpeningPosition}
              />
            )
          ) : result.diagonal ? (
            <DiagonalLayoutSVG result={result} surfaceView={surfaceView} showAlignmentGuides={showAlignmentGuides} onOpeningOffsetChange={updateOpeningPosition} />
          ) : (
            <TileLayoutSVG result={result} groutMm={normalizedInput.groutMm} surfaceView={surfaceView} surfaceW={normalizedInput.surfaceW} surfaceH={normalizedInput.surfaceH} showAlignmentGuides={showAlignmentGuides} onOpeningOffsetChange={updateOpeningPosition} />
          )}
        </div>

        {presentationMode === "room" && (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
            {compareMode
              ? "Обе сцены используют одну геометрию и один расчёт. В проект, PNG и PDF сохраняется вариант A; вариант B служит для визуального сравнения."
              : "Объёмный вид помогает оценить композицию и материал. Точные пропорции, размеры и подрезки смотрите в режиме «Чертёж»."}
          </p>
        )}

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

        <div data-testid="tile-layout-advice" className="flex items-start gap-3 rounded-2xl border border-accent-200 bg-gradient-to-r from-accent-50/90 to-white p-3.5 dark:border-accent-800/60 dark:from-accent-950/30 dark:to-slate-900">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-500 text-sm font-black text-white shadow-sm">М</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Совет Михалыча</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {layoutMode === "diagonal"
                ? "Диагональная сетка уже центрирована автоматически. Перед укладкой отбейте обе оси поверхности и проверьте угловые доборы на точном чертеже."
                : startMode === "center"
                  ? "Выбран симметричный старт: крайние подрезки распределены по обеим сторонам. Перенесите центральные оси с чертежа на поверхность лазером или отбивочным шнуром."
                  : startMode === "custom"
                    ? openingAxisAligned
                      ? `${recommendedOpeningAxis?.alignment === "tile-center" ? "Центр целой плитки" : "Межплиточный шов"} совмещён с осью проёма на отметке ${Math.round(openingCenterMm)} мм от левого края. Перенесите обе оси с чертежа лазером или отбивочным шнуром.`
                      : `Свой старт: ${Math.round(result.startOffsetXMm)} мм слева и ${Math.round(result.startOffsetYMm)} мм сверху. Проверьте, что ни один край не уже 30% плитки.`
                    : surfaceView === "wall"
                      ? "Старт от края быстрее, но может оставить узкую полосу справа или снизу. Сравните карточку «По центру» перед разметкой."
                      : "Старт от края удобен у базовой стены. Перед укладкой сравните симметричный вариант и проверьте крайние ряды на чертеже."}
            </p>
          </div>
        </div>
      </div>

      {renderPdfVisuals && (
        <div
          ref={pdfVisualsRef}
          aria-hidden="true"
          data-testid="tile-pdf-visual-source"
          style={{ position: "fixed", left: -10000, top: 0, width: 760, pointerEvents: "none" }}
        >
          <TileRoomPreviewSVG
            result={result}
            groutMm={normalizedInput.groutMm}
            surfaceView={surfaceView}
            surfaceW={normalizedInput.surfaceW}
            surfaceH={normalizedInput.surfaceH}
            visualFinish={visualFinish}
            lightingPreset={lightingPreset}
            groutColor={groutColor}
            textureSource={textureSource}
            textureScalePercent={textureScalePercent}
            textureRotationDeg={textureRotationDeg}
            customTextureDataUrl={customTextureDataUrl}
          />
          {result.diagonal ? (
            <DiagonalLayoutSVG result={result} surfaceView={surfaceView} />
          ) : (
            <TileLayoutSVG result={result} groutMm={normalizedInput.groutMm} surfaceView={surfaceView} surfaceW={normalizedInput.surfaceW} surfaceH={normalizedInput.surfaceH} />
          )}
        </div>
      )}

      {/* Stats */}
      <div ref={resultRef} data-tool-panel="result" className="card scroll-mt-32 p-4 sm:scroll-mt-24 sm:p-5 lg:col-start-2 lg:row-start-2 xl:sticky xl:top-24 xl:col-start-3 xl:row-start-1">
        {exportPlan ? (
          <TileLayoutPassportCard
            passport={exportPlan.passport}
            stacked
            className="mb-4"
            visual={(
              <TileRoomPreviewSVG
                result={result}
                groutMm={normalizedInput.groutMm}
                surfaceView={surfaceView}
                surfaceW={normalizedInput.surfaceW}
                surfaceH={normalizedInput.surfaceH}
                visualFinish={visualFinish}
                lightingPreset={lightingPreset}
                groutColor={groutColor}
                textureSource={textureSource}
                textureScalePercent={textureScalePercent}
                textureRotationDeg={textureRotationDeg}
                customTextureDataUrl={customTextureDataUrl}
              />
            )}
          />
        ) : (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-[11px] leading-relaxed text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/25 dark:text-rose-200">
            Исправьте фасовку коробки — количество упаковок временно не рассчитывается.
          </div>
        )}

        {layoutMode !== "diagonal" && (
          <div data-testid="tile-edge-cuts" className="mb-4 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Крайние подрезки</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">{tileStartLabel(result.startMode)}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${narrowPerimeterCuts.length === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                {narrowPerimeterCuts.length === 0 ? "Без узких краёв" : `Узких: ${narrowPerimeterCuts.length}`}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-4 gap-1.5">
              {perimeterCuts.map((cut) => (
                <div key={cut.label} className="rounded-lg bg-slate-50 px-1.5 py-2 text-center dark:bg-slate-800">
                  <dt className="text-[8px] uppercase tracking-wide text-slate-400">{cut.label}</dt>
                  <dd className="mt-0.5 text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-100">{cut.value > 0.5 ? `${Math.round(cut.value)} мм` : "целая"}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-2 xl:grid-cols-1">
          {[
            { label: result.opening ? "Площадь облицовки" : "Площадь поверхности", value: `${surfaceAreaM2} м²`, icon: "м²", iconClass: "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300" },
            ...(result.opening ? [{ label: "Площадь проёма", value: `${Math.round((result.openingAreaMm2 / 1_000_000) * 100) / 100} м²`, icon: "□", iconClass: "bg-stone-100 text-stone-600 dark:bg-slate-700 dark:text-slate-200" }] : []),
            { label: "Плиток по схеме", value: `${result.totalTiles} шт`, icon: "▦", iconClass: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
            { label: "Запас", value: `${result.purchaseReserveTiles} шт · ${result.reservePercent}%`, icon: "+", iconClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
            { label: "С подрезкой", value: `${result.cutTiles} шт`, icon: "◩", iconClass: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
            { label: "Отход материала", value: `${result.wastePercent.toFixed(1)}%`, icon: "%", iconClass: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200" },
          ].map(({ label, value, icon, iconClass }) => (
            <div key={label} className="flex min-h-[72px] flex-col justify-between gap-2 rounded-xl border border-slate-200 p-3 xl:min-h-11 xl:flex-row xl:items-center xl:p-2.5 dark:border-slate-700">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black xl:size-7 ${iconClass}`}>{icon}</span>
                <dt className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{label}</dt>
              </div>
              <dd className="text-base font-bold tabular-nums text-slate-950 xl:text-sm dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Для {surfaceAreaM2} м² облицовки отдельно уточним клей и затирку по формату и толщине слоя.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Link href={tileAdhesiveHref} onClick={() => trackToolRelatedClick("raskladka-plitki", "tile-adhesive-calculator")} className="btn-primary inline-flex min-h-11 w-full items-center justify-center text-center text-sm no-underline">
              Рассчитать клей →
            </Link>
            <Link href={tileGroutHref} onClick={() => trackToolRelatedClick("raskladka-plitki", "tile-grout-calculator")} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-accent-300 px-3 text-center text-sm font-semibold text-accent-700 no-underline transition-colors hover:bg-accent-50 dark:border-accent-700 dark:text-accent-300 dark:hover:bg-accent-950/30">
              Рассчитать затирку →
            </Link>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-1">
              <button
                type="button"
                data-testid="tile-export-pdf"
                disabled={!exportPlan || pdfStatus === "exporting"}
                onClick={handleExportPDF}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-2 text-center text-xs font-semibold text-slate-700 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200 dark:hover:border-accent-700 dark:hover:bg-accent-950/30 dark:hover:text-accent-300"
              >
                {pdfStatus === "exporting" ? "Готовим PDF…" : pdfStatus === "failed" ? "Повторить PDF" : "↓ Скачать PDF"}
              </button>
              <button
                type="button"
                data-testid="tile-share-result"
                aria-label="Поделиться расчётом"
                disabled={!exportPlan || shareStatus === "sharing"}
                onClick={handleShare}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-2 text-center text-xs font-semibold text-slate-700 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200 dark:hover:border-accent-700 dark:hover:bg-accent-950/30 dark:hover:text-accent-300"
              >
                {shareStatus === "sharing" && "Подготовка…"}
                {shareStatus === "shared" && "Отправлено"}
                {shareStatus === "copied" && "Скопировано"}
                {shareStatus === "failed" && "Не удалось"}
                {shareStatus === "idle" && "↗ Поделиться"}
              </button>
              <span role="status" aria-live="polite" className="sr-only">
                {shareStatus === "copied" && "Расчёт и ссылка скопированы"}
                {shareStatus === "shared" && "Расчёт отправлен"}
                {shareStatus === "failed" && "Не удалось поделиться расчётом"}
                {pdfStatus === "exporting" && "Подготавливаем PDF со схемой раскладки"}
                {pdfStatus === "failed" && "Не удалось подготовить PDF. Попробуйте ещё раз"}
              </span>
            </div>
            <div className="sm:col-span-2 xl:col-span-1 [&>div]:!w-full [&_button]:!min-h-11 [&_button]:!w-full">
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

        {(result.notes.length > 0 || perimeterCuts.some((cut) => cut.value > 0.5)) && (
          <details className="group mt-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
            <summary className="cursor-pointer list-none text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-200">
              <span className="flex items-center justify-between gap-3">
                Как получен результат
                <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
              </span>
            </summary>
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              {narrowPerimeterCuts.length > 0 && (
                <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  Узкие края: {narrowPerimeterCuts.map((cut) => `${cut.label.toLocaleLowerCase("ru-RU")} ${Math.round(cut.value)} мм`).join(", ")}. Сравните вариант «По центру» или задайте собственный сдвиг.
                </p>
              )}
              {result.notes.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {result.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              )}
              {perimeterCuts.some((cut) => cut.value > 0.5) && (
                <div className="mt-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {perimeterCuts.filter((cut) => cut.value > 0.5).map((cut) => (
                    <p key={cut.label}>Подрезка {cut.label.toLocaleLowerCase("ru-RU")}: {Math.round(cut.value)} мм ({(cut.value / cut.tileSize * 100).toFixed(0)}% плитки).</p>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
      </div>

      <section data-testid="tile-procurement-plan" className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">Закупочный план</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Плитка → клей → затирка</h2>
          </div>
          <p className="max-w-xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Плитка рассчитана по вашей схеме. Расход смесей уточняется в отдельных калькуляторах — без повторного ввода площади, формата и шва.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link
            href={tileCalculatorHref}
            onClick={() => trackToolRelatedClick("raskladka-plitki", "plitka-calculator")}
            className="group rounded-2xl border border-accent-200 bg-accent-50/60 p-4 no-underline transition-colors hover:border-accent-400 hover:bg-accent-50 dark:border-accent-800/70 dark:bg-accent-950/25 dark:hover:border-accent-600"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">1. Плитка</p>
                <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {packaging ? `${packaging.boxesToBuy} кор.` : "Уточните коробку"}
                </p>
              </div>
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-white text-sm font-black text-accent-700 shadow-sm dark:bg-slate-900 dark:text-accent-300">▦</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {packaging
                ? `${packaging.purchasedTiles} шт. фактически · остаток ${packaging.leftoverTiles} шт.`
                : "Количество коробок появится после исправления площади упаковки."}
            </p>
            <p className="mt-2 text-xs font-bold text-accent-700 group-hover:text-accent-800 dark:text-accent-300">Сверить полный расчёт →</p>
          </Link>

          <Link
            href={tileAdhesiveHref}
            onClick={() => trackToolRelatedClick("raskladka-plitki", "plitka-calculator-adhesive")}
            className="group rounded-2xl border border-slate-200 p-4 no-underline transition-colors hover:border-accent-300 hover:bg-accent-50/40 dark:border-slate-700 dark:hover:border-accent-700 dark:hover:bg-accent-950/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">2. Плиточный клей</p>
                <p className="mt-1 text-base font-bold text-slate-950 group-hover:text-accent-700 dark:text-white dark:group-hover:text-accent-300">Рассчитать расход →</p>
              </div>
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-sm font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">кг</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Учтём формат {normalizedInput.tileW}×{normalizedInput.tileH} мм, площадь и рекомендуемый слой.</p>
          </Link>

          <Link
            href={tileGroutHref}
            onClick={() => trackToolRelatedClick("raskladka-plitki", "plitka-calculator-grout")}
            className="group rounded-2xl border border-slate-200 p-4 no-underline transition-colors hover:border-accent-300 hover:bg-accent-50/40 dark:border-slate-700 dark:hover:border-accent-700 dark:hover:bg-accent-950/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">3. Затирка</p>
                <p className="mt-1 text-base font-bold text-slate-950 group-hover:text-accent-700 dark:text-white dark:group-hover:text-accent-300">Уточнить количество →</p>
              </div>
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{normalizedInput.groutMm}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Ширина шва {normalizedInput.groutMm} мм уже передана; останется проверить глубину и тип состава.</p>
          </Link>
        </div>
      </section>

      <RenovationHubStrip scenarioId="bathroom" showTileLayout compact />
    </div>
  );
}

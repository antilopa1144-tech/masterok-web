"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useCallback, useEffect, useId } from "react";
import SaveToProjectButton from "@/components/calculator/SaveToProjectButton";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import CompactToolWorkspaceNav from "@/components/tools/CompactToolWorkspaceNav";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import {
  trackToolExport,
  trackToolPresetSelect,
  trackToolRelatedClick,
} from "@/lib/analytics";
import {
  calculateDirectionalLaminateLayout,
  LAMINATE_MODE_OPTIONS,
  LAMINATE_SIZE_PRESETS,
  ROOM_SIZE_PRESETS,
  type LaminateMode,
  type LaminateDirection,
  type LaminateLayoutResult,
} from "@/lib/tools/laminate-layout";
import {
  buildLaminateCalculatorHref,
  parseLaminateLayoutSearchParams,
} from "@/lib/tools/laminate-layout-to-calc";

// ── SVG scene ────────────────────────────────────────────────────────────────

function laminateModeLabel(mode: LaminateMode): string {
  return LAMINATE_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? "Раскладка";
}

function laminateDirectionLabel(direction: LaminateDirection): string {
  return direction === "along-length" ? "Вдоль длины" : "Вдоль ширины";
}

type LaminateVisualFinish = "natural-oak" | "white-oak" | "smoked-oak" | "walnut";
type LaminatePresentationMode = "room" | "plan";
type LaminateLightSource = "left" | "center" | "right";
type LaminateRoomDetails = "clear" | "furnished";
type LaminateWorkspaceStage = "parameters" | "layout" | "result";

const LAMINATE_WORKSPACE_STAGES = [
  { value: "parameters", shortLabel: "Параметры", label: "Комната и доска" },
  { value: "layout", shortLabel: "Схема", label: "2.5D и раскладка" },
  { value: "result", shortLabel: "Результат", label: "Итог к покупке" },
] satisfies Array<{ value: LaminateWorkspaceStage; shortLabel: string; label: string }>;

const LAMINATE_VISUAL_FINISHES: Record<LaminateVisualFinish, {
  label: string;
  description: string;
  textureSrc: string;
  seam: string;
  room: string;
}> = {
  "natural-oak": { label: "Натуральный дуб", description: "Тёплый дуб с живым, но спокойным рисунком волокон.", textureSrc: "/images/laminate-textures/natural-oak.webp", seam: "#765132", room: "#b99770" },
  "white-oak": { label: "Светлый дуб", description: "Холодный светлый декор для скандинавских интерьеров.", textureSrc: "/images/laminate-textures/white-oak.webp", seam: "#9d9589", room: "#d9d2c7" },
  "smoked-oak": { label: "Дымчатый дуб", description: "Глубокий коричневый тон с сдержанным контрастом.", textureSrc: "/images/laminate-textures/smoked-oak.webp", seam: "#2d211b", room: "#59483d" },
  walnut: { label: "Орех", description: "Тёмный орех с длинным плавным рисунком древесины.", textureSrc: "/images/laminate-textures/walnut.webp", seam: "#4c2e1d", room: "#74513b" },
};

async function cloneSvgWithEmbeddedImages(svg: SVGSVGElement): Promise<SVGSVGElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const images = Array.from(clone.querySelectorAll("image"));
  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute("href");
    if (!href || href.startsWith("data:")) return;
    const response = await fetch(href);
    if (!response.ok) throw new Error("Не удалось загрузить фактуру для экспорта");
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

function LaminateDimensions({ width, height, surfaceW, surfaceH }: { width: number; height: number; surfaceW: number; surfaceH: number }) {
  return (
    <g fill="#475569" stroke="#64748b" strokeWidth="0.7">
      <line x1="0" y1="-12" x2={width} y2="-12" />
      <line x1="0" y1="-16" x2="0" y2="-8" />
      <line x1={width} y1="-16" x2={width} y2="-8" />
      <rect x={width * 0.36} y="-19" width={width * 0.28} height="13" rx="5" fill="#f8fafc" stroke="none" />
      <text x={width / 2} y="-12" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="650" stroke="none">{surfaceW.toLocaleString("ru-RU")} мм</text>
      <line x1="-12" y1="0" x2="-12" y2={height} />
      <line x1="-16" y1="0" x2="-8" y2="0" />
      <line x1="-16" y1={height} x2="-8" y2={height} />
      <text x="-22" y={height / 2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 -22 ${height / 2})`} fontSize="8" fontWeight="650" stroke="none">{surfaceH.toLocaleString("ru-RU")} мм</text>
    </g>
  );
}

function LaminateSceneBase({ width, height, result, finish }: { width: number; height: number; result: LaminateLayoutResult; finish: LaminateVisualFinish }) {
  const palette = LAMINATE_VISUAL_FINISHES[finish];
  return (
    <>
      <rect x="-34" y="-52" width={width + 68} height={height + 84} rx="12" fill="url(#lam-scene-bg)" />
      <text x="0" y="-34" fill="#0f172a" fontSize="13" fontWeight="750">Вид пола сверху</text>
      <text x="0" y="-22" fill="#64748b" fontSize="7.5">{laminateModeLabel(result.mode)} · доска {result.boardW}×{result.boardH} мм</text>
      <LaminateDimensions width={width} height={height} surfaceW={result.surfaceW} surfaceH={result.surfaceH} />
      <rect x="-8" y="-8" width={width + 16} height={height + 16} rx="10" fill={palette.room} stroke={palette.seam} strokeWidth="1" filter="url(#lam-room-shadow)" />
      <rect width={width} height={height} fill={palette.room} stroke={palette.seam} strokeWidth="1.4" />
    </>
  );
}

// ── Deck SVG (прямые ряды со смещением) ─────────────────────────────────────

function DeckSVG({ result, finish }: { result: LaminateLayoutResult; finish: LaminateVisualFinish }) {
  const rows = result.rows;
  if (!rows) return null;
  const scale = Math.min(600 / Math.max(result.surfaceW, 1), 450 / Math.max(result.surfaceH, 1), 1);
  const svgW = result.surfaceW * scale;
  const svgH = result.surfaceH * scale;
  const padX = 34;
  const padTop = 52;
  const padBottom = 32;
  const clipId = "laminate-deck-surface-clip";
  const palette = LAMINATE_VISUAL_FINISHES[finish];

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label={`Ламинат в комнате: ${laminateModeLabel(result.mode).toLowerCase()}`}
    >
      <defs>
        <linearGradient id="lam-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="1" stopColor="#f5eadb" /></linearGradient>
        <pattern id="lam-wood-texture" width="1" height="1" patternUnits="objectBoundingBox">
          <image href={palette.textureSrc} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <pattern id="lam-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#9a3412" strokeWidth="1.2" opacity="0.55" /></pattern>
        <clipPath id={clipId}><rect width={svgW} height={svgH} /></clipPath>
        <filter id="lam-room-shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.22" /></filter>
      </defs>
      <LaminateSceneBase width={svgW} height={svgH} result={result} finish={finish} />
      <g clipPath={`url(#${clipId})`}>
        {rows.flatMap((row, ri) =>
          row.map((board, ci) => {
            const x = board.x * scale + 0.45;
            const y = board.y * scale + 0.45;
            const width = Math.max(board.widthMm * scale - 0.9, 0.45);
            const height = Math.max(board.heightMm * scale - 0.9, 0.45);
            return (
              <g key={`${ri}-${ci}`}>
                <rect x={x} y={y} width={width} height={height} rx="1.1" fill="url(#lam-wood-texture)" stroke={board.type === "cut" ? "#c2410c" : palette.seam} strokeWidth={board.type === "cut" ? 0.9 : 0.52} />
                <rect x={x} y={y} width={width} height={height} rx="1.1" fill={(ri + ci) % 3 === 0 ? "#ffffff" : "#000000"} opacity={(ri + ci) % 3 === 0 ? 0.05 : 0.025} />
                {board.type === "cut" && <rect x={x} y={y} width={width} height={height} rx="1.1" fill="url(#lam-cut-hatch)" />}
                {board.type === "cut" && width > 42 && height > 14 && <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fill="#7c2d12" fontSize="6.2" fontWeight="750">{Math.round(board.widthMm)} мм</text>}
              </g>
            );
          }),
        )}
      </g>
      <g transform={`translate(${Math.max(8, svgW - 96)} ${svgH + 18})`}><line x1="0" y1="0" x2="70" y2="0" stroke="#92400e" strokeWidth="1.2" /><path d="M 70 0 l -6 -3 v 6 z" fill="#92400e" /><text x="35" y="10" textAnchor="middle" fill="#64748b" fontSize="6.5">длинная сторона</text></g>
    </svg>
  );
}

// ── Herringbone SVG (доски под ±45°) ────────────────────────────────────────

function HerringboneSVG({ result, finish }: { result: LaminateLayoutResult; finish: LaminateVisualFinish }) {
  const boards = result.herringbone;
  if (!boards) return null;
  const scale = Math.min(600 / Math.max(result.surfaceW, 1), 450 / Math.max(result.surfaceH, 1), 1);
  const svgW = result.surfaceW * scale;
  const svgH = result.surfaceH * scale;
  const clipId = "laminate-herringbone-surface-clip";
  const padX = 34;
  const padTop = 52;
  const padBottom = 32;
  const patternStep = Math.max(42, Math.min(170, result.boardW * scale / Math.SQRT2));
  const edgeBand = Math.max(8, Math.min(patternStep * 0.18, Math.min(svgW, svgH) * 0.12));
  const palette = LAMINATE_VISUAL_FINISHES[finish];

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${svgW + padX * 2} ${svgH + padTop + padBottom}`}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700"
      role="img"
      aria-label="Ламинат в комнате: ёлочка под 45 градусов"
    >
      <defs>
        <linearGradient id="lam-scene-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="1" stopColor="#f5eadb" /></linearGradient>
        <pattern id="lam-herr-cut-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#9a3412" strokeWidth="1.2" opacity="0.55" /></pattern>
        <pattern id="lam-herr-floor-pattern" width={patternStep * 2} height={patternStep * 2} patternUnits="userSpaceOnUse">
          <image href={palette.textureSrc} width={patternStep * 2} height={patternStep * 2} preserveAspectRatio="xMidYMid slice" />
          <path d={`M 0 ${patternStep} L ${patternStep} 0 L ${patternStep * 2} ${patternStep} M 0 ${patternStep * 2} L ${patternStep} ${patternStep} L ${patternStep * 2} ${patternStep * 2}`} fill="none" stroke={palette.seam} strokeWidth="1.25" />
          <path d={`M ${patternStep * 0.25} ${patternStep * 0.75} l ${patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 0.68} ${patternStep * 0.32} l ${patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 1.15} ${patternStep * 0.15} l ${-patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 1.58} ${patternStep * 0.58} l ${-patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 0.25} ${patternStep * 1.75} l ${patternStep * 0.18} ${patternStep * 0.18} M ${patternStep * 1.58} ${patternStep * 1.58} l ${-patternStep * 0.18} ${patternStep * 0.18}`} fill="none" stroke="#7c4a24" strokeWidth="0.75" opacity="0.75" />
          <path d={`M 0 ${patternStep * 0.9} C ${patternStep * 0.38} ${patternStep * 0.7}, ${patternStep * 0.6} ${patternStep * 0.35}, ${patternStep} ${patternStep * 0.1} M ${patternStep} ${patternStep * 0.1} C ${patternStep * 1.35} ${patternStep * 0.38}, ${patternStep * 1.62} ${patternStep * 0.7}, ${patternStep * 2} ${patternStep * 0.9}`} fill="none" stroke="#f6d79e" strokeWidth="0.6" opacity="0.45" />
        </pattern>
        <clipPath id={clipId}><rect x={0} y={0} width={svgW} height={svgH} /></clipPath>
        <filter id="lam-room-shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.22" /></filter>
      </defs>
      <LaminateSceneBase width={svgW} height={svgH} result={result} finish={finish} />
      <g clipPath={`url(#${clipId})`}>
        <rect width={svgW} height={svgH} fill="url(#lam-herr-floor-pattern)" />
        <path d={`M 0 0 H ${svgW} V ${svgH} H 0 Z M ${edgeBand} ${edgeBand} V ${svgH - edgeBand} H ${svgW - edgeBand} V ${edgeBand} Z`} fill="url(#lam-herr-cut-hatch)" fillRule="evenodd" opacity="0.8" />
        <rect x={edgeBand} y={edgeBand} width={Math.max(0, svgW - edgeBand * 2)} height={Math.max(0, svgH - edgeBand * 2)} fill="none" stroke="#9a3412" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.7" />
      </g>
    </svg>
  );
}

function LaminateRoomSVG({
  result,
  finish,
  lightSource,
  roomDetails,
  title,
}: {
  result: LaminateLayoutResult;
  finish: LaminateVisualFinish;
  lightSource: LaminateLightSource;
  roomDetails: LaminateRoomDetails;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const palette = LAMINATE_VISUAL_FINISHES[finish];
  const textureId = `lam-room-texture-${uid}`;
  const floorClipId = `lam-room-floor-${uid}`;
  const herringboneId = `lam-room-herringbone-${uid}`;
  const windowGradientId = `lam-room-window-${uid}`;
  const floor = { topY: 142, bottomY: 396, topLeft: 128, topRight: 632, bottomLeft: 40, bottomRight: 720 };
  const project = (x: number, y: number) => {
    const tx = Math.min(1, Math.max(0, x / Math.max(result.surfaceW, 1)));
    const ty = Math.min(1, Math.max(0, y / Math.max(result.surfaceH, 1)));
    const left = floor.topLeft + (floor.bottomLeft - floor.topLeft) * ty;
    const right = floor.topRight + (floor.bottomRight - floor.topRight) * ty;
    return { x: left + (right - left) * tx, y: floor.topY + (floor.bottomY - floor.topY) * ty };
  };
  const polygon = (points: Array<{ x: number; y: number }>) => points.map((point) => `${point.x},${point.y}`).join(" ");
  const floorPolygon = `${floor.topLeft},${floor.topY} ${floor.topRight},${floor.topY} ${floor.bottomRight},${floor.bottomY} ${floor.bottomLeft},${floor.bottomY}`;
  const windowCenter = lightSource === "left" ? 250 : lightSource === "right" ? 510 : 380;
  const windowX = windowCenter - 58;
  const lightShift = lightSource === "left" ? 150 : lightSource === "right" ? -150 : 0;
  const boards = result.rows?.flat() ?? [];
  const doorOnLeft = lightSource === "right";
  const doorX = doorOnLeft ? 112 : 586;
  const sofaX = doorOnLeft ? 420 : 166;
  const plantX = doorOnLeft ? 652 : 108;

  return (
    <svg data-testid="laminate-room-preview" viewBox="0 0 760 430" className="w-full rounded-xl border border-slate-200 bg-[#ede9e2] dark:border-slate-700" role="img" aria-label={`Объёмная модель комнаты: ${laminateModeLabel(result.mode).toLowerCase()}, ${palette.label.toLowerCase()}`}>
      <defs>
        <pattern id={textureId} width="1" height="1" patternUnits="objectBoundingBox">
          <image href={palette.textureSrc} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <pattern id={herringboneId} width="58" height="58" patternUnits="userSpaceOnUse">
          <image href={palette.textureSrc} width="58" height="58" preserveAspectRatio="xMidYMid slice" />
          <rect width="58" height="58" fill="#ffffff" opacity="0.08" />
          <path d="M -29 29 L 0 0 L 29 29 L 58 0 L 87 29 M -29 58 L 0 29 L 29 58 L 58 29 L 87 58" fill="none" stroke={palette.seam} strokeWidth="1.6" opacity="0.82" />
        </pattern>
        <clipPath id={floorClipId}><polygon points={floorPolygon} /></clipPath>
        <linearGradient id={windowGradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e7f5ff" /><stop offset="1" stopColor="#fff7d6" /></linearGradient>
        <filter id={`room-shadow-${uid}`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1f2937" floodOpacity="0.22" /></filter>
      </defs>

      <rect width="760" height="430" fill="#eeeae3" />
      <polygon points="80,52 680,52 632,142 128,142" fill="#ded8cf" />
      <polygon points="80,52 128,142 40,396 20,116" fill="#d1cac0" />
      <polygon points="680,52 740,116 720,396 632,142" fill="#c8c0b5" />
      <rect x="80" y="52" width="600" height="90" fill="#e8e3dc" />
      <line x1="80" y1="142" x2="680" y2="142" stroke="#aaa095" strokeWidth="2" />

      <rect x={windowX} y="67" width="116" height="58" rx="3" fill={`url(#${windowGradientId})`} stroke="#8d969d" strokeWidth="3" />
      <line x1={windowCenter} y1="68" x2={windowCenter} y2="124" stroke="#aeb6bc" strokeWidth="2" />
      <line x1={windowX + 2} y1="96" x2={windowX + 114} y2="96" stroke="#aeb6bc" strokeWidth="2" />
      <polygon points={`${windowX + 6},125 ${windowX + 110},125 ${windowCenter + lightShift + 170},${floor.bottomY} ${windowCenter + lightShift - 170},${floor.bottomY}`} fill="#fff7c7" opacity="0.22" clipPath={`url(#${floorClipId})`} />

      <polygon points={floorPolygon} fill={result.herringbone ? `url(#${herringboneId})` : palette.room} stroke={palette.seam} strokeWidth="2" filter={`url(#room-shadow-${uid})`} />
      {!result.herringbone && (
        <g clipPath={`url(#${floorClipId})`}>
          {boards.map((board, index) => {
            const p1 = project(board.x, board.y);
            const p2 = project(board.x + board.widthMm, board.y);
            const p3 = project(board.x + board.widthMm, board.y + board.heightMm);
            const p4 = project(board.x, board.y + board.heightMm);
            return (
              <polygon
                key={`${board.x}-${board.y}-${index}`}
                points={polygon([p1, p2, p3, p4])}
                fill={`url(#${textureId})`}
                stroke={board.type === "cut" ? "#bd5a28" : palette.seam}
                strokeWidth={board.type === "cut" ? 1.1 : 0.62}
                opacity={index % 3 === 0 ? 0.96 : 1}
              />
            );
          })}
        </g>
      )}
      <polygon points={floorPolygon} fill="none" stroke="#51483f" strokeWidth="2.4" />
      <path d="M 40 396 L 720 396" stroke="#fff" strokeWidth="5" opacity="0.45" />

      {roomDetails === "furnished" && (
        <g data-testid="laminate-room-furnishings" aria-label="Ориентиры масштаба комнаты">
          <g filter={`url(#room-shadow-${uid})`}>
            <rect x={doorX} y="70" width="62" height="72" rx="2" fill="#9d8266" stroke="#66523f" strokeWidth="2" />
            <rect x={doorX + 7} y="78" width="48" height="26" rx="1.5" fill="#af9478" stroke="#765f49" />
            <rect x={doorX + 7} y="110" width="48" height="24" rx="1.5" fill="#a98d71" stroke="#765f49" />
            <circle cx={doorOnLeft ? doorX + 50 : doorX + 12} cy="108" r="2.6" fill="#e0bd6f" stroke="#6f5a3e" strokeWidth="0.8" />
          </g>

          <g filter={`url(#room-shadow-${uid})`}>
            <ellipse cx={sofaX + 86} cy="235" rx="104" ry="16" fill="#2f2924" opacity="0.2" />
            <polygon points={`${sofaX},174 ${sofaX + 172},174 ${sofaX + 180},207 ${sofaX - 8},207`} fill="#9d9388" stroke="#675f57" strokeWidth="1.4" />
            <polygon points={`${sofaX - 8},207 ${sofaX + 180},207 ${sofaX + 160},236 ${sofaX + 10},236`} fill="#b4aaa0" stroke="#675f57" strokeWidth="1.4" />
            <polygon points={`${sofaX - 8},188 ${sofaX + 8},186 ${sofaX + 18},231 ${sofaX + 4},238`} fill="#887f76" stroke="#675f57" />
            <polygon points={`${sofaX + 164},186 ${sofaX + 180},188 ${sofaX + 168},238 ${sofaX + 154},231`} fill="#887f76" stroke="#675f57" />
            <line x1={sofaX + 86} y1="177" x2={sofaX + 86} y2="205" stroke="#71685f" strokeWidth="1" opacity="0.75" />
            <line x1={sofaX + 86} y1="208" x2={sofaX + 86} y2="233" stroke="#81776e" strokeWidth="1" opacity="0.72" />
            <path d={`M ${sofaX + 12} 180 Q ${sofaX + 44} 170 ${sofaX + 78} 180 M ${sofaX + 95} 180 Q ${sofaX + 127} 170 ${sofaX + 160} 180`} fill="none" stroke="#c8c0b8" strokeWidth="2" opacity="0.62" />
            <line x1={sofaX + 18} y1="235" x2={sofaX + 16} y2="243" stroke="#4d4036" strokeWidth="4" />
            <line x1={sofaX + 155} y1="235" x2={sofaX + 157} y2="243" stroke="#4d4036" strokeWidth="4" />
          </g>

          <g filter={`url(#room-shadow-${uid})`}>
            <path d={`M ${plantX} 204 C ${plantX - 3} 179, ${plantX + 2} 164, ${plantX + 1} 148 M ${plantX} 188 C ${plantX - 12} 176, ${plantX - 16} 165, ${plantX - 18} 154 M ${plantX + 1} 183 C ${plantX + 12} 170, ${plantX + 16} 160, ${plantX + 18} 150`} fill="none" stroke="#486248" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx={plantX - 19} cy="151" rx="12" ry="6" transform={`rotate(28 ${plantX - 19} 151)`} fill="#657d5c" />
            <ellipse cx={plantX + 19} cy="148" rx="12" ry="6" transform={`rotate(-32 ${plantX + 19} 148)`} fill="#587553" />
            <ellipse cx={plantX + 1} cy="145" rx="7" ry="13" fill="#718968" />
            <ellipse cx={plantX - 12} cy="168" rx="10" ry="5.5" transform={`rotate(22 ${plantX - 12} 168)`} fill="#506e4d" />
            <ellipse cx={plantX + 13} cy="166" rx="10" ry="5.5" transform={`rotate(-26 ${plantX + 13} 166)`} fill="#6b8561" />
            <polygon points={`${plantX - 18},201 ${plantX + 18},201 ${plantX + 12},228 ${plantX - 12},228`} fill="#b1784c" stroke="#75472d" strokeWidth="1.2" />
            <ellipse cx={plantX} cy="201" rx="18" ry="5" fill="#c99162" stroke="#75472d" strokeWidth="1.2" />
          </g>
        </g>
      )}

      <g transform="translate(28 24)">
        <rect width="188" height="28" rx="14" fill="#111827" opacity="0.86" />
        <text x="16" y="18" fill="#fff" fontSize="11" fontWeight="750">{title ?? "ОБЪЁМНЫЙ ВИД"}</text>
      </g>
      <g transform="translate(565 24)">
        <rect width="167" height="28" rx="14" fill="#fff" opacity="0.9" />
        <text x="83.5" y="18" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="700">{result.surfaceW.toLocaleString("ru-RU")} × {result.surfaceH.toLocaleString("ru-RU")} мм</text>
      </g>
    </svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function LaminateLayoutGenerator() {
  const [activeStage, setActiveStage] = useState<LaminateWorkspaceStage>("layout");
  const [surfaceW, setSurfaceW] = useState(3000);
  const [surfaceH, setSurfaceH] = useState(4000);
  const [boardW, setBoardW] = useState(1285);
  const [boardH, setBoardH] = useState(192);
  const [mode, setMode] = useState<LaminateMode>("deck-third");
  const [visualFinish, setVisualFinish] = useState<LaminateVisualFinish>("natural-oak");
  const [direction, setDirection] = useState<LaminateDirection>("along-width");
  const [presentationMode, setPresentationMode] = useState<LaminatePresentationMode>("room");
  const [lightSource, setLightSource] = useState<LaminateLightSource>("center");
  const [roomDetails, setRoomDetails] = useState<LaminateRoomDetails>("furnished");
  const [compareMode, setCompareMode] = useState(false);
  const [compareFinish, setCompareFinish] = useState<LaminateVisualFinish>("white-oak");
  const [compareDirection, setCompareDirection] = useState<LaminateDirection>("along-length");
  const hydratedFromUrl = useRef(false);
  const workspaceTopRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { markStarted, selectMode } = useToolAnalytics(
    "raskladka-laminata",
    resultRef,
  );

  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;
    const parsed = parseLaminateLayoutSearchParams(new URLSearchParams(window.location.search));
    if (parsed.surfaceW != null) setSurfaceW(parsed.surfaceW);
    if (parsed.surfaceH != null) setSurfaceH(parsed.surfaceH);
    if (parsed.mode != null) setMode(parsed.mode);
  }, []);

  const changeStage = useCallback((stage: LaminateWorkspaceStage) => {
    setActiveStage(stage);
    window.requestAnimationFrame(() => workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const result = useMemo(
    () => calculateDirectionalLaminateLayout(surfaceW, surfaceH, boardW, boardH, mode, direction),
    [surfaceW, surfaceH, boardW, boardH, mode, direction],
  );

  const compareResult = useMemo(
    () => calculateDirectionalLaminateLayout(surfaceW, surfaceH, boardW, boardH, mode, compareDirection),
    [surfaceW, surfaceH, boardW, boardH, mode, compareDirection],
  );

  const surfaceAreaM2 = useMemo(
    () => Math.round(((surfaceW * surfaceH) / 1_000_000) * 100) / 100,
    [surfaceW, surfaceH],
  );

  const handleExportPNG = useCallback(async () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    trackToolExport("raskladka-laminata", "png");
    const exportSvg = await cloneSvgWithEmbeddedImages(svgEl);
    const svgData = new XMLSerializer().serializeToString(exportSvg);
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

  const laminatCalcHref = buildLaminateCalculatorHref({
    surfaceW,
    surfaceH,
    mode,
  });

  return (
    <div ref={workspaceTopRef} className="space-y-4 scroll-mt-24">
      <RenovationHubStrip scenarioId="room" compact />
      <div className="xl:hidden">
        <CompactToolWorkspaceNav activeStage={activeStage} ariaLabel="Этапы раскладки ламината" stages={LAMINATE_WORKSPACE_STAGES} onChange={changeStage} metrics={[
          { label: "Площадь", value: `${surfaceAreaM2} м²` },
          { label: mode === "herringbone" ? "Чистая оценка" : "По схеме", value: `${mode === "herringbone" ? result.basePurchaseBoards : result.totalBoards} шт.` },
          { label: "Подрезка", value: `${result.wastePercent.toFixed(1)}%` },
          { label: "Купить", value: `${result.purchaseBoards} шт.`, accent: true },
        ]} />
      </div>
      <div className="laminate-workspace grid items-start gap-4">
      <div ref={parametersRef} className={`card scroll-mt-24 space-y-5 p-4 sm:p-5 xl:sticky xl:top-20 ${activeStage === "parameters" ? "block" : "hidden xl:block"}`}>
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
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
        <button type="button" onClick={() => changeStage("layout")} className="btn-primary min-h-12 w-full justify-center text-sm xl:hidden">Посмотреть комнату →</button>
      </div>

      {/* Визуализация */}
      <div ref={layoutRef} className={`card scroll-mt-24 flex-col gap-4 p-4 sm:p-5 ${activeStage === "layout" ? "flex" : "hidden xl:flex"}`}>
        <div className="order-1 flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Как ламинат ляжет в комнате</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Видны рисунок пола, смещение рядов, направление досок и подрезки.</p></div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900" aria-label="Режим визуализации">
              <button type="button" aria-pressed={presentationMode === "room"} onClick={() => setPresentationMode("room")} className={`min-h-11 rounded-md px-3 text-xs font-semibold ${presentationMode === "room" ? "bg-white text-accent-700 shadow-sm dark:bg-slate-800 dark:text-accent-300" : "text-slate-500"}`}>2.5D</button>
              <button type="button" aria-pressed={presentationMode === "plan"} onClick={() => { setPresentationMode("plan"); setCompareMode(false); }} className={`min-h-11 rounded-md px-3 text-xs font-semibold ${presentationMode === "plan" ? "bg-white text-accent-700 shadow-sm dark:bg-slate-800 dark:text-accent-300" : "text-slate-500"}`}>План</button>
            </div>
            <button type="button" aria-pressed={compareMode} onClick={() => { setCompareMode((value) => !value); setPresentationMode("room"); }} className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors ${compareMode ? "border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300"}`}>Сравнить</button>
            <button type="button" onClick={handleExportPNG} className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-400">{compareMode ? "PNG варианта A" : "Скачать PNG"}</button>
          </div>
        </div>

        <div data-testid="laminate-texture-controls" className="order-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60 xl:order-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Декор покрытия</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Меняет только внешний вид схемы, не влияет на расчёт.</p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">Реальная фактура</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Декор ламината">
            {(Object.entries(LAMINATE_VISUAL_FINISHES) as [LaminateVisualFinish, (typeof LAMINATE_VISUAL_FINISHES)[LaminateVisualFinish]][]).map(([value, finish]) => (
              <button
                key={value}
                type="button"
                aria-pressed={visualFinish === value}
                onClick={() => setVisualFinish(value)}
                className={`min-h-16 rounded-xl border p-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${visualFinish === value ? "border-accent-500 bg-white shadow-sm ring-1 ring-accent-500/20 dark:bg-slate-900" : "border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60"}`}
              >
                <span className="block h-7 rounded-lg bg-cover bg-center shadow-inner" style={{ backgroundImage: `url(${finish.textureSrc})` }} />
                <span className="mt-1.5 block truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{finish.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{LAMINATE_VISUAL_FINISHES[visualFinish].description}</p>

          <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-3 dark:border-slate-700">
            <div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Направление досок</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5" aria-label="Направление длинной стороны доски">
                <button type="button" disabled={mode === "herringbone"} aria-pressed={direction === "along-width"} onClick={() => setDirection("along-width")} className={`min-h-11 rounded-lg border px-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${direction === "along-width" ? "border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>Вдоль ширины ↔</button>
                <button type="button" disabled={mode === "herringbone"} aria-pressed={direction === "along-length"} onClick={() => setDirection("along-length")} className={`min-h-11 rounded-lg border px-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${direction === "along-length" ? "border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>Вдоль длины ↕</button>
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Поворот на 90° меняет ряды, подрезку и итог к покупке.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Окно и свет</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5" aria-label="Положение окна в модели">
                {(["left", "center", "right"] as LaminateLightSource[]).map((value) => (
                  <button key={value} type="button" aria-pressed={lightSource === value} onClick={() => setLightSource(value)} className={`min-h-11 rounded-lg border px-1 text-[10px] font-semibold ${lightSource === value ? "border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>{value === "left" ? "Слева" : value === "right" ? "Справа" : "Центр"}</button>
                ))}
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Помогает оценить рисунок относительно естественного света.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Ориентиры масштаба</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5" aria-label="Детализация комнаты">
                <button type="button" aria-pressed={roomDetails === "clear"} onClick={() => setRoomDetails("clear")} className={`min-h-11 rounded-lg border px-2 text-[10px] font-semibold ${roomDetails === "clear" ? "border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>Без мебели</button>
                <button type="button" aria-pressed={roomDetails === "furnished"} onClick={() => setRoomDetails("furnished")} className={`min-h-11 rounded-lg border px-2 text-[10px] font-semibold ${roomDetails === "furnished" ? "border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>С мебелью</button>
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Дверь, диван и растение показывают масштаб и не участвуют в расчёте.</p>
            </div>
          </div>

          {compareMode && (
            <div className="mt-3 rounded-xl border border-accent-200 bg-accent-50/60 p-3 dark:border-accent-800/60 dark:bg-accent-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wide text-accent-700 dark:text-accent-300">Вариант B</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-[9px] font-semibold text-slate-500">Декор
                  <select value={compareFinish} onChange={(event) => setCompareFinish(event.target.value as LaminateVisualFinish)} className="input-field mt-1 min-h-11 w-full text-xs">
                    {(Object.entries(LAMINATE_VISUAL_FINISHES) as [LaminateVisualFinish, (typeof LAMINATE_VISUAL_FINISHES)[LaminateVisualFinish]][]).map(([value, finish]) => <option key={value} value={value}>{finish.label}</option>)}
                  </select>
                </label>
                <label className="text-[9px] font-semibold text-slate-500">Направление
                  <select value={compareDirection} disabled={mode === "herringbone"} onChange={(event) => setCompareDirection(event.target.value as LaminateDirection)} className="input-field mt-1 min-h-11 w-full text-xs disabled:opacity-50">
                    <option value="along-width">Вдоль ширины</option>
                    <option value="along-length">Вдоль длины</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        <div ref={svgRef} className="order-2 xl:order-3">
          {presentationMode === "room" ? (
            compareMode ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <LaminateRoomSVG result={result} finish={visualFinish} lightSource={lightSource} roomDetails={roomDetails} title="ВАРИАНТ A" />
                <LaminateRoomSVG result={compareResult} finish={compareFinish} lightSource={lightSource} roomDetails={roomDetails} title="ВАРИАНТ B" />
              </div>
            ) : <LaminateRoomSVG result={result} finish={visualFinish} lightSource={lightSource} roomDetails={roomDetails} />
          ) : result.herringbone ? <HerringboneSVG result={result} finish={visualFinish} /> : <DeckSVG result={result} finish={visualFinish} />}
        </div>

        {presentationMode === "room" && compareMode && (
          <div data-testid="laminate-comparison-summary" className="order-4 grid gap-2 sm:grid-cols-2">
            {[
              { title: "Вариант A", finish: visualFinish, direction, result },
              { title: "Вариант B", finish: compareFinish, direction: compareDirection, result: compareResult },
            ].map((variant) => (
              <div key={variant.title} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{variant.title}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100">{LAMINATE_VISUAL_FINISHES[variant.finish].label} · {laminateDirectionLabel(variant.direction)}</p>
                  </div>
                  <p className="text-lg font-bold text-slate-950 dark:text-white">{variant.result.purchaseBoards} шт</p>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Подрезка: {variant.result.cutBoards} шт · отход: {variant.result.wastePercent.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        )}

        <div className="order-5 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3 dark:bg-slate-900 dark:text-slate-300">
          {mode === "herringbone" ? (
            <>
              <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-amber-900 bg-gradient-to-r from-amber-700 via-amber-300 to-amber-800" /><span>Рисунок ёлочки</span></div>
              <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-orange-800 bg-[repeating-linear-gradient(45deg,#fed7aa,#fed7aa_3px,#c2410c_3px,#c2410c_4px)]" /><span>Периметр подрезки</span></div>
              <div className="text-slate-500">Схема показывает направление; закупка считается по площади с запасом 12%.</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-amber-900 bg-gradient-to-r from-amber-700 via-amber-300 to-amber-800" /><span>{`Целая доска (${result.wholeBoards} шт)`}</span></div>
              {result.cutBoards > 0 && <div className="flex items-center gap-1.5"><span className="h-4 w-8 rounded-sm border border-orange-800 bg-[repeating-linear-gradient(45deg,#fed7aa,#fed7aa_3px,#c2410c_3px,#c2410c_4px)]" /><span>{`С подрезкой (${result.cutBoards} шт)`}</span></div>}
              <div className="flex items-center gap-1.5"><span className="relative h-4 w-8 after:absolute after:left-0 after:top-1/2 after:h-0.5 after:w-7 after:bg-amber-800 after:content-['']" /><span>Направление длинной стороны</span></div>
            </>
          )}
        </div>
        <div className="order-6 grid gap-2 sm:grid-cols-2 xl:hidden"><button type="button" onClick={() => changeStage("parameters")} className="min-h-12 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">← Изменить параметры</button><button type="button" onClick={() => changeStage("result")} className="btn-primary min-h-12 w-full justify-center text-sm">Посмотреть результат →</button></div>
      </div>

      {/* Результат */}
      <div ref={resultRef} data-testid="laminate-result" className={`card scroll-mt-24 p-4 sm:p-5 xl:sticky xl:top-20 ${activeStage === "result" ? "block" : "hidden xl:block"}`}>
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
        {mode === "herringbone" ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.basePurchaseBoards}</p><p className="text-xs text-slate-500">По чистой площади</p></div><div><p className="text-2xl font-bold text-amber-700 dark:text-amber-500">{result.purchaseReserveBoards}</p><p className="text-xs text-slate-500">Запас на ёлочку</p></div><div><p className="text-2xl font-bold text-amber-600">12%</p><p className="text-xs text-slate-500">Запас на подрезку</p></div><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{surfaceAreaM2}</p><p className="text-xs text-slate-500">Площадь пола, м²</p></div></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.totalBoards}</p><p className="text-xs text-slate-500">Элементов по схеме</p></div><div><p className="text-2xl font-bold text-amber-700 dark:text-amber-500">{result.wholeBoards}</p><p className="text-xs text-slate-500">Целых по схеме</p></div><div><p className="text-2xl font-bold text-amber-600">{result.cutBoards}</p><p className="text-xs text-slate-500">С подрезкой</p></div><div><p className="text-2xl font-bold text-red-500">{result.wastePercent.toFixed(1)}%</p><p className="text-xs text-slate-500">Отход материала</p></div></div>}

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
        <button type="button" onClick={() => changeStage("layout")} className="mt-4 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 xl:hidden">← Вернуться к комнате</button>
      </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Maximize2, Scissors, SlidersHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import type { ConstructorRoom, RoomCalculation, TileRect, Wall } from "@/lib/constructor/core";
import { formatNumber } from "@/lib/constructor/presentation";
import { partDimensions, wallSvg } from "@/lib/constructor/wall-presentation";
import { connectedTileParts } from "@/lib/constructor/wall-cuts";
import { useDrawingViewport } from "./useDrawingViewport";
import styles from "./constructor.module.css";

export default function WallElevation({ room, calculation, wall, onSelectWall, selectedTileId, onSelectTile, focusToken, focusBounds, onReviewCuts, canReviewCuts, onConfigure }: {
  room: ConstructorRoom; calculation: RoomCalculation; wall: Wall; onSelectWall: (wall: Wall) => void;
  selectedTileId?: string; onSelectTile: (id?: string) => void; focusToken: number; focusBounds?: TileRect;
  onReviewCuts: () => void; canReviewCuts: boolean;
  onConfigure: () => void;
}) {
  const [numbers, setNumbers] = useState(false);
  const current = calculation.walls.find((item) => item.wall === wall);
  const viewport = useDrawingViewport({ focus: focusToken && focusBounds && current ? { token: focusToken, x: focusBounds.xMm + focusBounds.widthMm / 2, y: current.heightMm - focusBounds.yMm - focusBounds.heightMm / 2 } : undefined });
  const { drawing, zoom, changeZoom, fit } = viewport;
  const markup = useMemo(() => wallSvg(room, wall, current, { numbers, selectedTileId, idPrefix: "elevation" }), [room, wall, current, numbers, selectedTileId]);
  const cell = current?.cells.find((item) => item.id === selectedTileId);
  const parts = useMemo(() => connectedTileParts(cell?.fragments ?? []), [cell]);
  return <div className={styles.elevationWorkspace}>
    <div className={styles.elevationHeading}><div><strong>Стена {wall + 1} · Развёртка</strong><span>{current ? `${formatNumber(current.coveredAreaM2)} м² плитки · ${current.baseTiles} исходных шт.` : "Выберите плитку в параметрах стены"}</span></div><div className={styles.drawingTools} role="group" aria-label="Инструменты развёртки"><button type="button" aria-label="Приблизить развёртку" disabled={zoom >= 4} onClick={() => changeZoom(zoom + .5)}><ZoomIn size={16} /></button><button type="button" aria-label="Отдалить развёртку" disabled={zoom <= 1} onClick={() => changeZoom(zoom - .5)}><ZoomOut size={16} /></button><button type="button" aria-label="Поместить развёртку в экран" onClick={fit}><Maximize2 size={16} /></button><button type="button" aria-label="Настроить раскладку" title="Настроить раскладку" disabled={!canReviewCuts || !current} onClick={onConfigure}><SlidersHorizontal size={16} /></button><button type="button" aria-label="Проверить подрезки" title="Проверить подрезки" disabled={!canReviewCuts} onClick={onReviewCuts}><Scissors size={16} /></button></div><label><input type="checkbox" checked={numbers} onChange={(event) => setNumbers(event.target.checked)} />Номера</label></div>
    <div ref={drawing} tabIndex={0} role="region" aria-label={`Чертёж стены ${wall + 1}`} className={styles.elevationDrawing} data-testid="wall-elevation" data-zoomed={zoom > 1} data-panning={viewport.panning} {...viewport.handlers} onClick={(event) => { if (viewport.isPanClick()) return; const target = (event.target as Element).closest("[data-tile-id]"); onSelectTile(target?.getAttribute("data-tile-id") ?? undefined); }}>
      <div className={styles.elevationCanvas} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
    {cell && <div className={styles.tileSelection} role="status" aria-label="Выбранная плитка"><strong>Плитка {current!.cells.indexOf(cell) + 1} · {cell.isCut ? "подрезка" : "целая"}</strong><span>{parts.map((part) => `${partDimensions(part)}${part.rectangular ? "" : " · фигурная, габариты"}`).join("; ")}</span>{parts.some((part) => !part.rectangular) && <small>Вырезы и ширину перемычек смотрите на развёртке.</small>}{parts.length > 1 && <small>Отдельных частей: {parts.length}. Одна исходная плитка в закупке.</small>}<button type="button" onClick={() => onSelectTile(undefined)} aria-label="Убрать выделение плитки">×</button></div>}
    <div className={styles.elevationStrip} aria-label="Последовательная развёртка стен">{([0, 1, 2, 3] as const).map((item) => <button type="button" key={item} className={wall === item ? styles.active : ""} aria-label={`Развёртка стены ${item + 1}`} aria-pressed={wall === item} onClick={() => { onSelectTile(undefined); onSelectWall(item); }}><strong>Стена {item + 1}</strong><span dangerouslySetInnerHTML={{ __html: wallSvg(room, item, calculation.walls.find((value) => value.wall === item), { idPrefix: "elevation-strip" }) }} /><small>{formatNumber(item % 2 === 0 ? room.widthMm : room.lengthMm)} мм</small></button>)}</div>
    <p className={styles.elevationNote}>{room.continuousWallTiles ? "Сетка продолжается через углы по часовой стрелке. Замыкание на стыке стен 4 и 1 проверьте отдельно." : "Стены идут по часовой стрелке. Старт раскладки задаётся для каждой стены отдельно."}</p>
  </div>;
}

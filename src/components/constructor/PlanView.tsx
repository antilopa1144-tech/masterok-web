"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Move, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ConstructorRoom, FurnishingPosition, RoomCalculation } from "@/lib/constructor/core";
import { clampFurnishingPosition, furnishingName, interiorWithPosition, layoutFurnishings, positionForPlacement, rotatedFurnishingPosition } from "@/lib/constructor/interiors";
import { planSvg } from "@/lib/constructor/presentation";
import styles from "./constructor.module.css";

type Drag = { pointerId: number; room: ConstructorRoom; id: string; start: { x: number; y: number }; startClient: { x: number; y: number }; initial: FurnishingPosition; position: FurnishingPosition; moved: boolean };

export default function PlanView({ room, calculation, numbers, furnished, selectedPieceId, onSelect, editing = false, blocked = false, selectedId, onSelectFurnishing, onPosition, onConfigure, onGesture }: {
  room: ConstructorRoom; calculation: RoomCalculation; numbers: boolean; furnished: boolean; selectedPieceId?: string;
  onSelect: (id: string) => void;
  editing?: boolean; blocked?: boolean; selectedId?: string;
  onSelectFurnishing?: (id: string) => void; onPosition?: (id: string, position: FurnishingPosition) => void;
  onConfigure?: () => void; onGesture?: (active: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null), drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ id: string; position: FurnishingPosition }>();
  const displayRoom = useMemo(() => preview ? { ...room, interior: interiorWithPosition(room, preview.id, preview.position) } : room, [room, preview]);
  const active = editing && furnished;
  const markup = useMemo(() => planSvg(displayRoom, calculation, { numbers: !active && numbers, selectedPieceId: active ? undefined : selectedPieceId, furnished,
    interior: active ? { interactive: true, selectedId } : undefined }), [displayRoom, calculation, numbers, selectedPieceId, furnished, active, selectedId]);
  const selected = useMemo(() => layoutFurnishings(displayRoom).placements.find((item) => item.id === selectedId), [displayRoom, selectedId]);

  const cancel = () => {
    const previous = drag.current; drag.current = null;
    if (previous && ref.current?.hasPointerCapture(previous.pointerId)) ref.current.releasePointerCapture(previous.pointerId);
    setPreview(undefined); onGesture?.(false);
  };
  useEffect(() => {
    if (drag.current && (drag.current.room !== room || !active || blocked)) {
      drag.current = null; setPreview(undefined); onGesture?.(false);
    }
  }, [room, active, blocked, onGesture]);
  useEffect(() => () => onGesture?.(false), [onGesture]);

  const point = (event: ReactPointerEvent) => {
    const svg = ref.current?.querySelector("svg"), matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const result = svg.createSVGPoint(); result.x = event.clientX; result.y = event.clientY;
    return result.matrixTransform(matrix.inverse());
  };
  const turn = () => { if (selected && !blocked && !drag.current) onPosition?.(selected.id, rotatedFurnishingPosition(room, selected)); };

  return <div ref={ref} className={`${styles.plan} ${active ? styles.placementPlan : ""} ${preview ? styles.draggingPlacement : ""}`} tabIndex={active ? 0 : undefined}
    role={active ? "group" : undefined} aria-label={active ? "Редактор расстановки предметов" : undefined}
    onPointerDown={(event) => {
      if (!active || blocked || !event.isPrimary || event.button !== 0 || drag.current) return;
      const kind = (event.target as Element).closest("[data-furnishing-id]")?.getAttribute("data-furnishing-id") as string | null;
      const item = layoutFurnishings(room).placements.find((value) => value.id === kind), start = point(event);
      if (!item || !start) return;
      event.preventDefault(); ref.current?.focus({ preventScroll: true }); onSelectFurnishing?.(item.id);
      const initial = positionForPlacement(item);
      drag.current = { pointerId: event.pointerId, room, id: item.id, start, startClient: { x: event.clientX, y: event.clientY }, initial, position: initial, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId); onGesture?.(true);
    }}
    onPointerMove={(event) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const next = point(event); if (!next) return;
      if (!current.moved && Math.hypot(event.clientX - current.startClient.x, event.clientY - current.startClient.y) < 3) return;
      current.moved = true;
      current.position = clampFurnishingPosition(current.room, current.id, { ...current.initial,
        xMm: Math.round((current.initial.xMm + next.x - current.start.x) / 10) * 10,
        yMm: Math.round((current.initial.yMm + next.y - current.start.y) / 10) * 10 });
      setPreview({ id: current.id, position: current.position });
    }}
    onPointerUp={(event) => {
      const current = drag.current; if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null; setPreview(undefined); onGesture?.(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (current.moved && (current.position.xMm !== current.initial.xMm || current.position.yMm !== current.initial.yMm)) onPosition?.(current.id, current.position);
    }}
    onPointerCancel={cancel} onLostPointerCapture={() => { if (drag.current) cancel(); }}
    onKeyDown={(event) => {
      if (!active) return;
      if (drag.current && (event.key === "Escape" || ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())))) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
      if (drag.current) { event.preventDefault(); return; }
      if (blocked || (event.target as Element).closest("button, input, select") || event.ctrlKey || event.metaKey) return;
      const targetKind = (event.target as Element).closest("[data-furnishing-id]")?.getAttribute("data-furnishing-id") as string | null;
      const item = targetKind ? layoutFurnishings(room).placements.find((value) => value.id === targetKind) : selected;
      if (!item) return;
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); ref.current?.focus({ preventScroll: true }); onSelectFurnishing?.(item.id); return; }
      if (event.key.toLowerCase() === "r" || event.key.toLowerCase() === "к") { event.preventDefault(); ref.current?.focus({ preventScroll: true }); onSelectFurnishing?.(item.id); onPosition?.(item.id, rotatedFurnishingPosition(room, item)); return; }
      const direction = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[event.key];
      if (!direction) return;
      event.preventDefault(); ref.current?.focus({ preventScroll: true }); onSelectFurnishing?.(item.id);
      const step = event.altKey ? 1 : event.shiftKey ? 100 : 10, position = positionForPlacement(item);
      const next = clampFurnishingPosition(room, item.id, { ...position, xMm: position.xMm + direction[0] * step, yMm: position.yMm + direction[1] * step });
      if (next.xMm !== position.xMm || next.yMm !== position.yMm) onPosition?.(item.id, next);
    }}
    onClick={(event) => {
      if (active) return;
      const piece = (event.target as Element).closest("[data-piece-id]");
      if (piece) onSelect(piece.getAttribute("data-piece-id")!);
    }}>
    <div className={styles.planDrawing} dangerouslySetInnerHTML={{ __html: markup }} />
    {active && <div className={styles.placementToolbar}>
      <Move size={16} /><span>{selected ? furnishingName(room, selected.id) : "Выберите предмет"}</span>
      {selected && <><button type="button" title="Повернуть на 90° (R)" aria-label="Повернуть выбранный предмет на 90°" disabled={blocked || !!preview} onClick={turn}><RotateCcw size={18} /></button><button type="button" title="Точные координаты" aria-label="Параметры выбранного предмета" disabled={blocked || !!preview} onClick={onConfigure}><SlidersHorizontal size={18} /></button></>}
    </div>}
  </div>;
}

"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Move, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ConstructorRoom, FurnishingPosition, RoomCalculation } from "@/lib/constructor/core";
import { clampFurnishingPosition, furnishingName, interiorWithPosition, layoutFurnishings, positionForPlacement, rotatedFurnishingPosition } from "@/lib/constructor/interiors";
import { formatNumber, planSvg } from "@/lib/constructor/presentation";
import { nudgeFurnishingPosition, type FurnishingDirection, type FurnishingMovementStep } from "@/lib/constructor/furnishing-movement";
import PlanMovementControls from "./PlanMovementControls";
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
  const [movementStep, setMovementStep] = useState<FurnishingMovementStep>(10);
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
    const svg = ref.current?.querySelector<SVGSVGElement>(`.${styles.planDrawing} > svg`), matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const result = svg.createSVGPoint(); result.x = event.clientX; result.y = event.clientY;
    return result.matrixTransform(matrix.inverse());
  };
  const turn = () => { if (selected && !blocked && !drag.current) onPosition?.(selected.id, rotatedFurnishingPosition(room, selected)); };
  const canMove = (direction: FurnishingDirection) => {
    if (!selected) return false;
    const next = nudgeFurnishingPosition(room, selected, direction, movementStep);
    return next.xMm !== selected.xMm || next.yMm !== selected.yMm;
  };
  const move = (direction: FurnishingDirection) => {
    if (selected && !blocked && !drag.current && canMove(direction)) onPosition?.(selected.id, nudgeFurnishingPosition(room, selected, direction, movementStep));
  };

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
      const direction = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as Record<string, FurnishingDirection>)[event.key];
      if (!direction) return;
      event.preventDefault(); ref.current?.focus({ preventScroll: true }); onSelectFurnishing?.(item.id);
      const step = event.altKey ? 1 : event.shiftKey ? 100 : movementStep, position = positionForPlacement(item);
      const next = nudgeFurnishingPosition(room, item, direction, step);
      if (next.xMm !== position.xMm || next.yMm !== position.yMm) onPosition?.(item.id, next);
    }}
    onClick={(event) => {
      if (active) return;
      const piece = (event.target as Element).closest("[data-piece-id]");
      if (piece) onSelect(piece.getAttribute("data-piece-id")!);
    }}>
    {active && <div className={styles.placementToolbar}>
      <div className={styles.placementSelection}><Move size={16} /><span title={selected ? furnishingName(room, selected.id) : undefined}><strong>{selected ? furnishingName(room, selected.id) : "Выберите предмет"}</strong>{selected && <small aria-label="Положение выбранного предмета">X {formatNumber(positionForPlacement(selected).xMm, 6)} · Y {formatNumber(positionForPlacement(selected).yMm, 6)} мм</small>}</span>
        {selected && <><button type="button" title="Повернуть на 90° (R)" aria-label="Повернуть выбранный предмет на 90°" disabled={blocked || !!preview} onClick={turn}><RotateCcw size={18} /></button><button type="button" title="Точные координаты" aria-label="Параметры выбранного предмета" disabled={blocked || !!preview} onClick={onConfigure}><SlidersHorizontal size={18} /></button></>}
      </div>
      {selected && <PlanMovementControls step={movementStep} onStep={setMovementStep} blocked={blocked || !!preview} canMove={canMove} onMove={move} />}
    </div>}
    <div className={styles.planDrawing} dangerouslySetInnerHTML={{ __html: markup }} />
  </div>;
}

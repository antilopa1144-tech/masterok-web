"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { ConstructorProject, ConstructorRoom, Opening, Wall } from "@/lib/constructor/core";
import { OPENING_CORNERS, OPENING_WALLS, openingDraftIssues, openingOnWall, openingWallLength, openingWithWidth } from "@/lib/constructor/opening-draft";
import { formatNumber, openingPlanPosition } from "@/lib/constructor/presentation";
import { NumberField } from "./DraftFields";
import styles from "./OpeningCreationForm.module.css";
import common from "./constructor.module.css";

function OpeningPlan({ room, opening }: { room: ConstructorRoom; opening: Opening }) {
  const scale = Math.min(200 / room.widthMm, 120 / room.lengthMm);
  const width = room.widthMm * scale, height = room.lengthMm * scale;
  const left = (280 - width) / 2, top = (172 - height) / 2;
  const line = (wall: Wall, offset: number, length: number) => {
    const points = openingPlanPosition(room, wall, offset, length);
    return { x1: left + points.x1 * scale, y1: top + points.y1 * scale, x2: left + points.x2 * scale, y2: top + points.y2 * scale };
  };
  const start = line(opening.wall, 0, 0);
  const labels = [
    { x: 140, y: top - 13, text: "1 →" }, { x: left + width + 19, y: 86, text: "2 ↓" },
    { x: 140, y: top + height + 22, text: "← 3" }, { x: left - 19, y: 86, text: "↑ 4" },
  ];
  return <figure className={styles.plan}>
    <figcaption>Вид сверху · стены по часовой стрелке</figcaption>
    <svg viewBox="0 0 280 180" role="img" aria-label={`Схема помещения. Выбрана стена ${opening.wall + 1}. Отступ от ${OPENING_CORNERS[opening.wall]} угла.`}>
      <rect x={left} y={top} width={width} height={height} rx="2" className={styles.planRoom} />
      <line {...line(opening.wall, 0, openingWallLength(room, opening.wall))} className={styles.selectedWall} />
      {room.openings.filter((item) => item.id !== opening.id).map((item) => <line key={item.id} {...line(item.wall, item.offsetMm, item.widthMm)} className={styles.existingOpening} />)}
      <line {...line(opening.wall, opening.offsetMm, opening.widthMm)} className={styles.draftOpening} />
      <circle cx={start.x1} cy={start.y1} r="5" className={styles.corner} />
      {labels.map((label, wall) => <text key={wall} x={label.x} y={label.y} textAnchor="middle" className={wall === opening.wall ? styles.activeLabel : undefined}>{label.text}</text>)}
    </svg>
    <p className={styles.legend}><span />Ваш проём <i />Уже в проекте</p>
  </figure>;
}

function OpeningElevation({ room, opening }: { room: ConstructorRoom; opening: Opening }) {
  const clipId = useId();
  const length = openingWallLength(room, opening.wall), scale = Math.min(260 / length, 120 / room.heightMm);
  const width = length * scale, height = room.heightMm * scale;
  const left = (320 - width) / 2, top = (140 - height) / 2, bottom = top + height;
  const openings = [...room.openings.filter((item) => item.wall === opening.wall && item.id !== opening.id), opening];
  return <figure className={styles.elevation}>
    <figcaption>Стена {opening.wall + 1} · {formatNumber(length)} × {formatNumber(room.heightMm)} мм</figcaption>
    <svg viewBox="0 0 320 170" role="img" aria-label={`Проём на стене ${opening.wall + 1}. Ширина ${formatNumber(opening.widthMm)}, высота ${formatNumber(opening.heightMm)}, отступ ${formatNumber(opening.offsetMm)} миллиметров.`}>
      <defs><clipPath id={clipId}><rect x={left} y={top} width={width} height={height} /></clipPath></defs>
      <rect x={left} y={top} width={width} height={height} className={styles.elevationWall} />
      <g clipPath={`url(#${clipId})`}>{openings.map((item) => <rect key={item.id} x={left + item.offsetMm * scale} y={bottom - (item.sillMm + item.heightMm) * scale} width={item.widthMm * scale} height={item.heightMm * scale} className={item.id === opening.id ? styles.elevationDraft : styles.elevationExisting} />)}</g>
      <path d={`M${left} ${bottom + 6}v14m0 -7h${opening.offsetMm * scale}m0 -7v14`} className={styles.offsetLine} />
      <text x={Math.max(45, left + opening.offsetMm * scale / 2)} y={bottom + 34} textAnchor="middle">Отступ {formatNumber(opening.offsetMm)} мм</text>
    </svg>
  </figure>;
}

export default function OpeningCreationForm({ project, room, initialOpening, editing, blocked, onConfirm, onCancel }: {
  project: ConstructorProject; room: ConstructorRoom; initialOpening: Opening; editing: boolean; blocked: boolean;
  onConfirm: (opening: Opening) => string | undefined; onCancel: () => void;
}) {
  const [opening, setOpening] = useState(() => ({ ...initialOpening }));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const onStatus = useCallback((id: string, message: string | null) => setDrafts((previous) => {
    if (previous[id] === message || (!message && !(id in previous))) return previous;
    const next = { ...previous }; if (message) next[id] = message; else delete next[id]; return next;
  }), []);
  const pending = Object.values(drafts)[0];
  const issues = useMemo(() => openingDraftIssues(project, room.id, opening, editing), [project, room.id, opening, editing]);
  const length = openingWallLength(room, opening.wall);
  const setNumber = (field: "widthMm" | "heightMm" | "offsetMm" | "sillMm", value: number) => {
    setOpening((current) => field === "widthMm" ? openingWithWidth(room, current, value) : { ...current, [field]: value }); setError("");
  };
  return <div className={styles.form}>
    <div className={styles.body}>
      <div className={styles.location}>
        <p className={styles.roomName}>{room.name}</p>
        <h3>Выберите стену</h3>
        <OpeningPlan room={room} opening={opening} />
        <div className={styles.wallPicker} role="group" aria-label="Стена для проёма">{OPENING_WALLS.map((wall) =>
          <button type="button" key={wall} aria-label={`Стена ${wall + 1} для проёма`} aria-pressed={opening.wall === wall} disabled={blocked || !!pending} onClick={() => {
            if (wall !== opening.wall) setOpening((current) => openingOnWall(room, current, wall)); setError("");
          }}><strong>Стена {wall + 1}</strong><span>{formatNumber(openingWallLength(room, wall))} мм</span></button>)}</div>
        <p className={styles.note}>Точка на схеме — начало выбранной стены. Отступ идёт по стрелке от {OPENING_CORNERS[opening.wall]} угла плана.</p>
      </div>
      <div className={styles.parameters}>
        <h3>Размеры и положение</h3>
        <OpeningElevation room={room} opening={opening} />
        <div className={styles.sizes}>
          <NumberField label="Ширина проёма" value={opening.widthMm} min={100} max={length} unit="мм" onStatus={onStatus} onCommit={(value) => setNumber("widthMm", value)} />
          <NumberField label="Высота проёма" value={opening.heightMm} min={100} max={Math.max(100, room.heightMm - opening.sillMm)} unit="мм" onStatus={onStatus} onCommit={(value) => setNumber("heightMm", value)} />
        </div>
        <NumberField label="Отступ от угла" value={opening.offsetMm} max={Math.max(0, length - opening.widthMm)} unit="мм" onStatus={onStatus} onCommit={(value) => setNumber("offsetMm", value)} />
        {opening.type === "window" && <NumberField label="Высота подоконника" value={opening.sillMm} max={Math.max(0, room.heightMm - opening.heightMm)} unit="мм" onStatus={onStatus} onCommit={(value) => setNumber("sillMm", value)} />}
        <p className={styles.note}>Размеры самого проёма в миллиметрах. Нажмите на значение для точного ввода. При увеличении ширины отступ уменьшается, если проём перестаёт помещаться. Проёмы могут касаться краями, но не пересекаться.</p>
      </div>
    </div>
    <div className={styles.footer}>
      {(error || (!pending && issues[0])) && <p className={styles.error} role="alert">{error || issues[0]} Измените стену, размеры или отступ.</p>}
      <button type="button" className={common.primaryButton} disabled={blocked || !!pending || !!issues.length} onClick={() => setError(onConfirm(opening) ?? "")}>
        {editing ? <Check size={18} /> : <Plus size={18} />}{editing ? "Сохранить проём" : opening.type === "door" ? "Добавить дверь" : "Добавить окно"}
      </button>
      <button type="button" className={common.secondaryButton} onClick={onCancel}>Отмена</button>
      <p className={styles.note} role={pending ? "status" : undefined}>{pending || (editing ? "Изменения применятся после сохранения проёма." : "Проём появится в проекте после добавления.")}</p>
    </div>
  </div>;
}

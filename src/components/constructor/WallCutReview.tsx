"use client";

import { useMemo, useState } from "react";
import { NumberField } from "./DraftFields";
import { ArrowUpRight, Scissors } from "lucide-react";
import type { ConstructorRoom, Wall } from "@/lib/constructor/core";
import { cutDimension, partDimensions } from "@/lib/constructor/wall-presentation";
import type { WallCutEntry } from "@/lib/constructor/wall-cuts";
import styles from "./WallCutReview.module.css";

const PAGE_SIZE = 20;
const ignoreDraftStatus = () => {};

function TilePreview({ entry }: { entry: WallCutEntry }) {
  const { cell, narrowestPart } = entry;
  const margin = Math.max(cell.widthMm, cell.heightMm) * .06;
  return <svg viewBox={`${-margin} ${-margin} ${cell.widthMm + margin * 2} ${cell.heightMm + margin * 2}`} role="img" aria-label={`Форма подрезки плитки ${entry.tileNumber}`}>
    <rect x={0} y={0} width={cell.widthMm} height={cell.heightMm} fill="none" stroke="currentColor" strokeWidth={margin * .045} strokeDasharray={`${margin * .15} ${margin * .12}`} opacity={.35} />
    {entry.parts.map((part, index) => <path key={index} d={part.fragments.map((p) => `M${p.xMm - cell.xMm} ${cell.heightMm - (p.yMm - cell.yMm) - p.heightMm}h${p.widthMm}v${p.heightMm}h${-p.widthMm}z`).join(" ")} fill={part === narrowestPart ? "var(--c-accent)" : "var(--c-secondary)"} opacity={part === narrowestPart ? .85 : .5} />)}
  </svg>;
}

export default function WallCutReview({ room, entries, assignedWalls, onShowTile }: {
  room: ConstructorRoom; entries: WallCutEntry[]; assignedWalls: Wall[]; onShowTile: (entry: WallCutEntry) => void;
}) {
  const [wall, setWall] = useState<Wall | "all">("all");
  const [limit, setLimit] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const filtered = useMemo(() => entries.filter((entry) => (wall === "all" || entry.wall === wall) && (limit === 0 || entry.minSideMm < limit)), [entries, wall, limit]);
  const smallest = filtered[0];
  return <div className={styles.body}>
    <div className={styles.intro}><div><p className={styles.roomName}>{room.name}</p><p>Самые узкие части — сверху. Номер относится к одной исходной плитке, даже если вырез разделил её на части.</p></div><div className={styles.metric}><Scissors size={18} /><strong>{smallest ? `${cutDimension(smallest.minSideMm)} мм` : "—"}</strong><span>наименьшая сторона<br />среди найденных габаритов</span></div></div>
    <div className={styles.filters}>
      <div className={styles.walls} role="group" aria-label="Стены для проверки подрезок"><button type="button" aria-pressed={wall === "all"} onClick={() => { setWall("all"); setPageSize(PAGE_SIZE); }}>Все стены</button>{([0, 1, 2, 3] as const).map((item) => <button key={item} type="button" disabled={!assignedWalls.includes(item)} aria-pressed={wall === item} onClick={() => { setWall(item); setPageSize(PAGE_SIZE); }}>Стена {item + 1}</button>)}</div>
      <div className={styles.limit}><NumberField label="Сторона меньше" value={limit} unit="мм" zeroLabel="Любая" emptyValue={0} onStatus={ignoreDraftStatus} onCommit={(value) => { setLimit(value); setPageSize(PAGE_SIZE); }} /><small>0 — любые размеры. Порог задаёте вы.</small></div>
    </div>
    <p className={styles.caution}>У фигурной части указаны габариты. Вырезы и перемычки смотрите на развёртке. Допустимость реза не оценивается.</p>
    <div className={styles.listHeading}><strong>Исходные плитки с подрезкой</strong><span role="status">{filtered.length} из {entries.length}</span></div>
    {filtered.length ? <ul className={styles.list}>{filtered.slice(0, pageSize).map((entry) => <li key={entry.cell.id}>
      <div className={styles.preview}><TilePreview entry={entry} /></div>
      <div className={styles.detail}><strong>Стена {entry.wall + 1} · плитка {entry.tileNumber}</strong><span className={styles.dimensions}>{partDimensions(entry.narrowestPart)}</span><small>{entry.narrowestPart.rectangular ? "Прямоугольная часть" : "Фигурная часть · габариты"}{entry.parts.length > 1 && ` · частей из одной плитки: ${entry.parts.length}`}</small>{entry.parts.length > 1 && <details><summary>Размеры всех частей</summary><ol>{entry.parts.map((part, index) => <li key={index}>{partDimensions(part)}{!part.rectangular && " · фигурная"}</li>)}</ol></details>}</div>
      <button type="button" className={styles.show} aria-label={`Показать плитку ${entry.tileNumber} на стене ${entry.wall + 1}`} onClick={() => onShowTile(entry)}><span>На развёртке</span><ArrowUpRight size={16} /></button>
    </li>)}</ul> : <div className={styles.empty}>{!assignedWalls.length ? "Назначьте плитку в параметрах стены — здесь появятся подрезки." : !entries.length ? "В этой комнате все плитки укладываются целиком." : "Подрезок с такими условиями нет. Выберите другую стену или очистите порог."}</div>}
    {filtered.length > pageSize && <button type="button" className={styles.more} onClick={() => setPageSize((current) => current + PAGE_SIZE)}>Показать ещё {Math.min(PAGE_SIZE, filtered.length - pageSize)} · осталось {filtered.length - pageSize}</button>}
  </div>;
}

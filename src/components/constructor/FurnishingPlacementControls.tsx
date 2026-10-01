"use client";

import { Copy, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { MAX_FURNISHINGS_PER_ROOM, MIN_FURNISHING_MM, MAX_FURNISHING_MM, type ConstructorRoom, type FurnishingDimensions, type FurnishingPosition } from "@/lib/constructor/core";
import { clampFurnishingPosition, dimensionsFor, furnishingName, furnishingIssues, interiorFor, layoutFurnishings, placementForPosition, positionForPlacement, rotatedFurnishingPosition } from "@/lib/constructor/interiors";
import { formatNumber } from "@/lib/constructor/presentation";
import { NumberField, type DraftStatus } from "./DraftFields";
import styles from "./RoomInteriorControls.module.css";
import common from "./constructor.module.css";

export default function FurnishingPlacementControls({ room, selectedId, blocked, onSelect, onPosition, onReset, onResetAll, onDimensions, onDuplicate, onRemove, onStatus }: {
  room: ConstructorRoom; selectedId?: string; blocked: boolean; onSelect: (id: string | undefined) => void;
  onPosition: (id: string, position: FurnishingPosition) => void; onReset: (id: string) => void;
  onResetAll: () => void; onDimensions: (id: string, dimensions?: FurnishingDimensions) => void;
  onDuplicate: (id: string) => void; onRemove: (id: string) => void; onStatus: DraftStatus;
}) {
  const interior = interiorFor(room), layout = layoutFurnishings(room);
  const instance = interior.items.find((item) => item.id === selectedId), id = instance?.id;
  const placed = layout.placements.find((item) => item.id === id);
  const issues = furnishingIssues(room, layout), selectedIssues = issues.filter((issue) => issue.id === id);
  const position = placed ? positionForPlacement(placed) : undefined;
  const hasManual = interior.items.some((item) => !!item.position);
  const atLimit = interior.items.length >= MAX_FURNISHINGS_PER_ROOM;
  if (!interior.items.length) return null;
  const dimensions = instance ? dimensionsFor(instance) : undefined;
  return <section className={styles.placementControls} aria-label="Положение предметов">
    <label className={styles.typeLabel}><span>Предмет для расстановки</span><select aria-label="Предмет для расстановки" value={id ?? ""} disabled={blocked} onChange={(event) => onSelect(event.target.value || undefined)}>
      <option value="">Выберите предмет…</option>{interior.items.map((item) => <option key={item.id} value={item.id}>{furnishingName(room, item.id)}{layout.omitted.includes(item.id) ? " · не размещён" : issues.some((issue) => issue.id === item.id) ? " · проверьте положение" : ""}</option>)}
    </select></label>
    {instance && dimensions && <div key={room.id + instance.id} className={styles.positionFields}>
      <div className={styles.instanceActions}>
        <button type="button" disabled={blocked || atLimit} onClick={() => onDuplicate(instance.id)}><Copy size={15} />Ещё такой же</button>
        <button type="button" aria-label="Удалить выбранный предмет" title="Удалить выбранный предмет" disabled={blocked} onClick={() => onRemove(instance.id)}><Trash2 size={16} /></button>
      </div>
      {atLimit && <p className={styles.explanation}>В помещении уже {MAX_FURNISHINGS_PER_ROOM} предметов. Удалите лишний, чтобы добавить новый.</p>}
      <div className={styles.positionCaption}><strong>Габариты предмета</strong><span>{instance.dimensions ? "Свои размеры" : "Стартовый образец"}</span></div>
      <div className={styles.dimensionsFields}>
        {([['widthMm', 'Ширина предмета'], ['depthMm', 'Глубина предмета'], ['heightMm', 'Высота предмета']] as const).map(([field, label]) => <NumberField key={field} label={label} value={dimensions[field]} min={MIN_FURNISHING_MM} max={MAX_FURNISHING_MM} unit="мм" onStatus={onStatus} onCommit={(value) => onDimensions(instance.id, { ...dimensions, [field]: value })} />)}
      </div>
      {instance.dimensions && <button className={styles.resetPosition} type="button" disabled={blocked} onClick={() => onDimensions(instance.id)}><Undo2 size={14} />Вернуть размеры образца</button>}
      <p className={styles.explanation}>Задайте размеры по товару. Для комплекта с зеркалом или стульями укажите общий габарит. Форма модели условная.</p>
      {placed && position ? <>
        <div className={styles.positionCaption}><span>{instance.position ? "Ручная расстановка" : "Автоматическое положение"}</span><span>На плане: {formatNumber(placed.widthMm)} × {formatNumber(placed.depthMm)} мм</span></div>
        <div className={common.fieldRow}>
          <NumberField label="X от левой стены" value={position.xMm} max={Math.max(0, room.widthMm - placed.widthMm)} unit="мм" onStatus={onStatus} onCommit={(xMm) => onPosition(instance.id, { ...position, xMm })} />
          <NumberField label="Y от верхней стены" value={position.yMm} max={Math.max(0, room.lengthMm - placed.depthMm)} unit="мм" onStatus={onStatus} onCommit={(yMm) => onPosition(instance.id, { ...position, yMm })} />
        </div>
        <div className={styles.rotationRow}><span>Поворот · {position.rotationDeg}°</span><button type="button" disabled={blocked} onClick={() => onPosition(instance.id, rotatedFurnishingPosition(room, placed))}><RotateCcw size={16} />На 90°</button></div>
        <p className={styles.explanation}>Отступы до верхнего левого угла габарита на плане. Изменение размера сохраняет этот угол на месте; толстая линия показывает переднюю сторону.</p>
        {instance.position && <button className={styles.resetPosition} type="button" disabled={blocked} onClick={() => onReset(instance.id)}><Undo2 size={14} />Разместить этот предмет автоматически</button>}
      </> : <><p className={styles.explanation}>Для предмета не нашлось свободного места. Можно уменьшить габариты или разместить его вручную и передвинуть соседей.</p><button className={common.secondaryButton} type="button" disabled={blocked} onClick={() => {
        const rotationDeg = dimensions.widthMm <= room.widthMm && dimensions.depthMm <= room.lengthMm ? 0 : 90;
        const item = placementForPosition(instance, { xMm: 0, yMm: 0, rotationDeg });
        onPosition(instance.id, clampFurnishingPosition(room, instance.id, { xMm: (room.widthMm - item.widthMm) / 2, yMm: (room.lengthMm - item.depthMm) / 2, rotationDeg }));
      }}>Разместить выбранный предмет</button></>}
    </div>}
    {selectedIssues.length > 0 && <div className={styles.fitNotice} role="status">{selectedIssues.slice(0, 3).map((issue, index) => <p key={index}>{issue.message}</p>)}{selectedIssues.length > 3 && <p>Ещё замечаний: {selectedIssues.length - 3}.</p>}</div>}
    {hasManual && <button className={styles.resetPosition} type="button" disabled={blocked} onClick={onResetAll}><Undo2 size={14} />Авторасстановка всей комнаты</button>}
    <p className={styles.explanation}>На плане: стрелки — 10 мм, Shift — 100 мм, Alt — 1 мм; R — поворот. Свободное место у проёмов показано условно, реальные проходы и монтажные зазоры нужно проверить по выбранной мебели и технике.</p>
  </section>;
}

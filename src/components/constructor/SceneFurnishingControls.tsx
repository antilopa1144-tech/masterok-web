import { Box, Copy, Pencil, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { MAX_FURNISHINGS_PER_ROOM, type FurnishingDimensions } from "@/lib/constructor/core";
import { formatNumber } from "@/lib/constructor/presentation";
import styles from "./constructor.module.css";

export default function SceneFurnishingControls({ name, dimensions, placed, atLimit, hasIssues, blocked, onConfigure, onInspect, onRotate, onDuplicate, onRemove }: {
  name: string; dimensions: FurnishingDimensions; placed: boolean; atLimit: boolean; hasIssues: boolean; blocked: boolean;
  onConfigure: () => void; onInspect: () => void; onRotate: () => void; onDuplicate: () => void; onRemove: () => void;
}) {
  return <div className={`${styles.sceneDimensions} ${styles.sceneObject}`} role="group" aria-label={`Выбранный предмет: ${name}`}>
    <button type="button" className={styles.sceneObjectSummary} aria-label="Параметры выбранного предмета" onClick={onConfigure}>
      <Box size={16} /><span><strong>{name}</strong><span>{!placed && "Не размещён · "}{formatNumber(dimensions.widthMm)} × {formatNumber(dimensions.depthMm)} × {formatNumber(dimensions.heightMm)} мм</span></span><Pencil size={14} />
    </button>
    <div className={styles.sceneObjectActions} role="group" aria-label="Действия с выбранным предметом">
      <button type="button" disabled={blocked || !placed} aria-label="Повернуть выбранный предмет на 90°" title={placed ? "Повернуть на 90°" : "Сначала разместите предмет в параметрах"} onClick={onRotate}><RotateCcw size={16} /><span>90°</span></button>
      <button type="button" disabled={blocked || atLimit} aria-label="Дублировать выбранный предмет" title="Создать ещё один такой предмет" onClick={onDuplicate}><Copy size={16} /><span>Копия</span></button>
      <button type="button" disabled={blocked} aria-label="Удалить предмет из 3D" title="Удалить предмет. Действие можно отменить" onClick={onRemove}><Trash2 size={16} /><span>Удалить</span></button>
    </div>
    {hasIssues && <button type="button" className={styles.sceneObjectIssue} onClick={onInspect}><TriangleAlert size={15} />Проверить положение</button>}
    {atLimit && <p className={styles.sceneObjectLimit} role="status">В комнате уже {MAX_FURNISHINGS_PER_ROOM} предметов. Удалите лишний, чтобы создать копию.</p>}
  </div>;
}

import { useMemo } from "react";
import type { ConstructorRoom, RoomCalculation } from "@/lib/constructor/core";
import { interiorFor, layoutFurnishings } from "@/lib/constructor/interiors";
import { reviewFurnishings } from "@/lib/constructor/furnishing-review";
import { formatNumber, planSvg } from "@/lib/constructor/presentation";
import styles from "./VariantComparison.module.css";

export default function VariantRoomPreview({ room, calculation }: { room?: ConstructorRoom; calculation?: RoomCalculation }) {
  const preview = useMemo(() => {
    if (!room || !calculation) return null;
    const layout = layoutFurnishings(room);
    return { markup: planSvg(room, calculation, { furnished: true }), placed: layout.placements.length,
      total: interiorFor(room).items.length, remarks: reviewFurnishings(room, layout).length };
  }, [room, calculation]);
  if (!room) return <div className={styles.previewEmpty}>Этой комнаты нет в варианте.</div>;
  if (!preview) return <div className={styles.previewEmpty}>План появится после исправления параметров.</div>;
  return <figure className={styles.roomPreview} aria-label={`План комнаты: ${room.name}`}>
    <div className={styles.previewDrawing} dangerouslySetInnerHTML={{ __html: preview.markup }} />
    <figcaption><strong>{room.name}</strong><span>{formatNumber(room.widthMm)} × {formatNumber(room.lengthMm)} мм · высота {formatNumber(room.heightMm)} мм</span>
      <span>Предметы на плане: {preview.placed} из {preview.total}{preview.remarks > 0 ? ` · с замечаниями: ${preview.remarks}` : ""}</span></figcaption>
  </figure>;
}

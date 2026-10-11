"use client";

import type { ReactNode } from "react";
import { Bath, BedDouble, BriefcaseBusiness, DoorOpen, CookingPot, Sofa, Square, Move, type LucideIcon } from "lucide-react";
import { MAX_FURNISHINGS_PER_ROOM, type ConstructorRoom, type RoomInterior, type RoomType } from "@/lib/constructor/core";
import { defaultInterior, dimensionsFor, FURNISHINGS, frozenInterior, INTERIOR_PRESETS, interiorFor, layoutFurnishings, presetFor } from "@/lib/constructor/interiors";
import { formatNumber } from "@/lib/constructor/presentation";
import { reviewFurnishings } from "@/lib/constructor/furnishing-review";
import FurnishingReview from "./FurnishingReview";
import styles from "./RoomInteriorControls.module.css";

const ICONS: Record<RoomType, LucideIcon> = { living: Sofa, bathroom: Bath, kitchen: CookingPot, bedroom: BedDouble, office: BriefcaseBusiness, hallway: DoorOpen, empty: Square };
export function RoomTypeIcon({ type, size = 18 }: { type: RoomType; size?: number }) { const Icon = ICONS[type]; return <Icon size={size} aria-hidden="true" />; }

export function RoomTypePicker({ value, onChange }: { value: RoomType; onChange: (type: RoomType) => void }) {
  return <div className={styles.picker} role="group" aria-label="Тип нового помещения">{INTERIOR_PRESETS.map((preset) => <button type="button" key={preset.type} aria-pressed={value === preset.type} onClick={() => onChange(preset.type)} className={value === preset.type ? styles.chosen : ""}>
    <RoomTypeIcon type={preset.type} size={23} /><span><strong>{preset.name}</strong><small>{preset.description}</small></span>
  </button>)}</div>;
}

export default function RoomInteriorControls({ room, onChange, blocked, onArrange, onInspect, children }: { room: ConstructorRoom; onChange: (interior: RoomInterior) => void; blocked: boolean; onArrange: () => void; onInspect: (id: string) => void; children?: ReactNode }) {
  const interior = interiorFor(room), preset = presetFor(interior.type);
  const layout = layoutFurnishings(room), { omitted } = layout;
  const review = reviewFurnishings(room, layout);
  const kinds = [...preset.items, ...(preset.optionalItems ?? [])];
  return <div className={styles.controls}>
    <label className={styles.typeLabel}><span>Тип помещения</span><select aria-label="Тип помещения" value={interior.type} disabled={blocked} onChange={(event) => onChange(defaultInterior(event.target.value as RoomType))}>
      {INTERIOR_PRESETS.map((item) => <option key={item.type} value={item.type}>{item.name}</option>)}
    </select></label>
    {interior.items.length > 0 && <button className={styles.arrangeButton} type="button" disabled={blocked} onClick={onArrange}><Move size={17} />Расставить на плане</button>}
    {interior.items.length > 0 && <FurnishingReview items={review} blocked={blocked} onInspect={onInspect} />}
    {children}
    {kinds.length > 0 && <fieldset className={styles.items}><legend>Обстановка</legend>{kinds.map((kind) => {
      const spec = FURNISHINGS[kind], instances = interior.items.filter((item) => item.kind === kind), dimensions = instances.length === 1 ? dimensionsFor(instances[0]) : spec;
      return <label key={kind}><input type="checkbox" checked={instances.length > 0} disabled={blocked || (!instances.length && interior.items.length >= MAX_FURNISHINGS_PER_ROOM)} onChange={(event) => {
        const existing = frozenInterior(room);
        const items = event.target.checked ? [...existing.items, { id: crypto.randomUUID(), kind }] : existing.items.filter((item) => item.kind !== kind);
        // Ванна и душ — альтернативы; переключение сохраняется одним действием.
        onChange({ ...existing, items: event.target.checked && (kind === "bathtub" || kind === "shower") ? items.filter((item) => item.kind !== (kind === "shower" ? "bathtub" : "shower")) : items });
      }} /><span>{spec.name}<small>{instances.length > 1 ? `${instances.length} шт. · снять галочку, чтобы убрать все` : `${formatNumber(dimensions.widthMm)} × ${formatNumber(dimensions.depthMm)} мм`}{instances.some((item) => omitted.includes(item.id)) ? " · не размещён" : ""}</small></span></label>;
    })}</fieldset>}
    <p className={styles.explanation}>{interior.items.length > 0 ? "У выбранного предмета можно изменить габариты, создать ещё один экземпляр и расставить их на плане." : kinds.length > 0 ? "Отметьте предметы, которые хотите добавить в комнату." : "Чтобы добавить мебель и технику, выберите тип помещения."} Обстановка не входит в ведомость и не уменьшает площадь отделки.</p>
  </div>;
}

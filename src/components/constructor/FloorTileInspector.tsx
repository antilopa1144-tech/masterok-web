"use client";

import { Check } from "lucide-react";
import type { FloorTileCalculation, FloorTileSpec } from "@/lib/constructor/core";
import { TILE_DECORS } from "@/lib/constructor/wall-presentation";
import { formatNumber } from "@/lib/constructor/presentation";
import { NumberField, TextField, type DraftStatus } from "./DraftFields";
import styles from "./constructor.module.css";

export default function FloorTileInspector({ spec, calculation, onChange, onStatus }: {
  spec: FloorTileSpec; calculation?: FloorTileCalculation; onChange: (value: FloorTileSpec) => void; onStatus: DraftStatus;
}) {
  const update = (field: keyof FloorTileSpec, value: FloorTileSpec[keyof FloorTileSpec]) => onChange({ ...spec, [field]: value });
  const number = (field: keyof FloorTileSpec, label: string, min: number, max: number, unit: string, integer = false) => <NumberField label={label} value={spec[field] as number} min={min} max={max} unit={unit} integer={integer} onStatus={onStatus} onCommit={(next) => update(field, next)} />;
  return <>
    <div className={styles.sectionHeading}><h3>Образец поверхности</h3><span>4 образца</span></div>
    <div className={styles.materials}>{TILE_DECORS.map((decor) => <button type="button" key={decor.id} aria-label={decor.name} aria-pressed={spec.decor === decor.id} className={spec.decor === decor.id ? styles.selectedMaterial : ""} onClick={() => update("decor", decor.id)}><span className={styles.tileSwatch} style={{ backgroundImage: `url(/images/tile-textures/${decor.id}.webp)`, backgroundColor: decor.color }} />{spec.decor === decor.id && <span className={styles.materialCheck}><Check size={12} /></span>}<span>{decor.name}</span></button>)}</div>
    <label className={styles.field}><span>Формат напольной плитки</span><select aria-label="Формат напольной плитки" value={[[600, 300], [600, 600], [300, 300], [1200, 600]].some(([w, h]) => w === spec.tileWidthMm && h === spec.tileHeightMm) ? `${spec.tileWidthMm}x${spec.tileHeightMm}` : "custom"} onChange={(event) => {
      if (event.target.value === "custom") return; const [tileWidthMm, tileHeightMm] = event.target.value.split("x").map(Number); onChange({ ...spec, tileWidthMm, tileHeightMm });
    }}><option value="600x600">600 × 600 мм</option><option value="600x300">600 × 300 мм</option><option value="300x300">300 × 300 мм</option><option value="1200x600">1200 × 600 мм</option><option value="custom">Свой размер — ползунки ниже</option></select></label>
    <div className={styles.fieldRow}>{number("tileWidthMm", "Ширина напольной плитки", 50, 1600, "мм")}{number("tileHeightMm", "Длина напольной плитки", 50, 1600, "мм")}</div>
    <div className={styles.field}><span>Направление · прямая укладка</span><div className={styles.directionOptions}>{(["horizontal", "vertical"] as const).map((value) => <button type="button" key={value} aria-pressed={spec.orientation === value} className={spec.orientation === value ? styles.active : ""} onClick={() => update("orientation", value)}>{value === "horizontal" ? "Вдоль ширины" : "Вдоль длины"}</button>)}</div></div>
    <div className={styles.fieldRow}>{number("jointMm", "Шов напольной плитки", 0, 20, "мм")}{number("edgeGapMm", "Зазор плитки у стен", 0, 100, "мм")}</div>
    <div className={styles.field}><span>Старт раскладки пола</span><div className={styles.directionOptions}>{(["edge", "center"] as const).map((value) => <button type="button" key={value} className={spec.alignment === value ? styles.active : ""} aria-pressed={spec.alignment === value} onClick={() => update("alignment", value)}>{value === "edge" ? "От края" : "По центру"}</button>)}</div></div>
    {number("reservePercent", "Запас напольной плитки", 0, 100, "%")}
    <details className={styles.details} open><summary>Упаковка и стоимость</summary><div className={styles.detailsContent}>
      <TextField label="Товар или артикул напольной плитки" value={spec.materialKey} onStatus={onStatus} onCommit={(value) => update("materialKey", value)} />
      <div className={styles.fieldRow}>{number("tilesPerPack", "Напольных плиток в упаковке", 1, 1000, "шт.", true)}{number("packPriceRub", "Цена упаковки напольной плитки", 0, 10000000, "₽")}</div>
      <p className={styles.hint}>Образец служит для визуализации. Формат, фасовку, шов и зазор уточните по выбранному товару.</p>
    </div></details>
    {calculation && <div className={styles.wallCalculation}>
      <div><span>Площадь укладки со швами</span><strong>{formatNumber(calculation.netAreaM2, 3)} м²</strong></div>
      <div><span>Площадь самой плитки</span><strong>{formatNumber(calculation.coveredAreaM2, 3)} м²</strong></div>
      <div><span>По раскладке / с подрезкой</span><strong>{calculation.baseTiles} / {calculation.cutTiles} шт.</strong></div>
      <div><span>Неуложенная часть</span><strong>{formatNumber(calculation.unlaidAreaM2, 3)} м²</strong></div>
      <p className={styles.hint}>По одной исходной плитке на ячейку; обрезки повторно не используются. В раскрое показаны детали пола. Уклоны, трапы и пороги нужно проектировать отдельно.</p>
    </div>}
  </>;
}

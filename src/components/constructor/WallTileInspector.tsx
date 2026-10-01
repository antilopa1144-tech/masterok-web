"use client";

import { Check, Grid2X2, Plus, Scissors, SlidersHorizontal } from "lucide-react";
import { createWallTileSpec, type ConstructorRoom, type Wall, type WallTileCalculation, type WallTileSpec } from "@/lib/constructor/core";
import { TILE_DECORS } from "@/lib/constructor/wall-presentation";
import { formatNumber } from "@/lib/constructor/presentation";
import { NumberField, TextField } from "./DraftFields";
import styles from "./constructor.module.css";

export default function WallTileInspector({ room, wall, calculation, onSelectWall, onChange, onAll, onContinuation, onStatus, onReviewCuts, canReviewCuts, onConfigure }: {
  room: ConstructorRoom; wall: Wall; calculation?: WallTileCalculation; onSelectWall: (wall: Wall) => void;
  onChange: (spec: WallTileSpec | null) => void; onAll: () => void; onContinuation: (value: boolean) => void;
  onStatus: (id: string, message: string | null) => void;
  onReviewCuts: () => void; canReviewCuts: boolean;
  onConfigure: () => void;
}) {
  const spec = room.wallTiles[wall];
  const update = (key: keyof WallTileSpec, value: WallTileSpec[keyof WallTileSpec]) => { if (spec) onChange({ ...spec, [key]: value }); };
  const number = (key: keyof WallTileSpec, label: string, min: number, max: number, unit: string, integer = false) => <NumberField label={label} value={spec![key] as number} min={min} max={max} unit={unit} integer={integer} onCommit={(value) => update(key, value)} onStatus={onStatus} />;
  return <>
    <div className={styles.wallSelector} role="group" aria-label="Выбор стены">{([0, 1, 2, 3] as const).map((item) => <button type="button" key={item} className={wall === item ? styles.active : ""} aria-pressed={wall === item} onClick={() => onSelectWall(item)}>Стена {item + 1}<small>{room.wallTiles[item] ? "Плитка" : "Без плитки"}</small></button>)}</div>
    {!spec ? <div className={styles.wallEmpty}><Grid2X2 size={34} /><h3>Облицовка стены</h3><p>Назначьте плитку, чтобы увидеть раскладку, подрезки у проёмов и количество упаковок.</p><button type="button" className={styles.primaryButton} onClick={() => onChange(createWallTileSpec())}><Plus size={17} />Добавить плитку</button></div> : <>
      <div className={styles.wallActions}><button type="button" className={styles.secondaryButton} aria-label="Настроить раскладку" disabled={!canReviewCuts} onClick={onConfigure}><SlidersHorizontal size={16} />Раскладка</button><button type="button" className={styles.secondaryButton} aria-label="Проверить подрезки" disabled={!canReviewCuts} onClick={onReviewCuts}><Scissors size={16} />Подрезки</button></div>
      <div className={styles.sectionHeading}><h3>Образец поверхности</h3><button type="button" className={styles.textAction} onClick={() => onChange(null)}>Убрать плитку</button></div>
      <div className={styles.materials}>{TILE_DECORS.map((decor) => <button type="button" key={decor.id} aria-label={decor.name} aria-pressed={spec.decor === decor.id} className={spec.decor === decor.id ? styles.selectedMaterial : ""} onClick={() => update("decor", decor.id)}><span className={styles.tileSwatch} style={{ backgroundImage: `url(/images/tile-textures/${decor.id}.webp)`, backgroundColor: decor.color }} />{spec.decor === decor.id && <span className={styles.materialCheck}><Check size={12} /></span>}<span>{decor.name}</span></button>)}</div>
      <label className={styles.field}><span>Формат плитки</span><select aria-label="Формат плитки" value={[[600, 300], [600, 600], [300, 300], [1200, 600]].some(([w, h]) => w === spec.tileWidthMm && h === spec.tileHeightMm) ? `${spec.tileWidthMm}x${spec.tileHeightMm}` : "custom"} onChange={(event) => { if (event.target.value === "custom") return; const [width, height] = event.target.value.split("x").map(Number); onChange({ ...spec, tileWidthMm: width, tileHeightMm: height }); }}><option value="600x300">600 × 300 мм</option><option value="600x600">600 × 600 мм</option><option value="300x300">300 × 300 мм</option><option value="1200x600">1200 × 600 мм</option><option value="custom">Свой размер — поля ниже</option></select></label>
      <div className={styles.fieldRow}>{number("tileWidthMm", "Ширина плитки", 50, 1600, "мм")}{number("tileHeightMm", "Высота плитки", 50, 1600, "мм")}</div>
      <div className={styles.field}><span>Ориентация · прямая укладка</span><div className={styles.directionOptions}>{(["horizontal", "vertical"] as const).map((value) => <button type="button" key={value} aria-pressed={spec.orientation === value} className={spec.orientation === value ? styles.active : ""} onClick={() => update("orientation", value)}>{value === "horizontal" ? "Горизонтально" : "Вертикально"}</button>)}</div></div>
      <div className={styles.fieldRow}>{number("jointMm", "Межплиточный шов", 0, 20, "мм")}{number("reservePercent", "Запас плитки", 0, 100, "%")}</div>
      <div className={styles.field}><span>Старт раскладки</span><div className={styles.directionOptions}>{(["edge", "center"] as const).map((value) => <button type="button" key={value} className={spec.alignment === value ? styles.active : ""} aria-pressed={spec.alignment === value} onClick={() => update("alignment", value)}>{value === "edge" ? "От края и пола" : "По центру"}</button>)}</div></div>
      <button type="button" className={styles.secondaryButton} onClick={onAll}>Применить к четырём стенам</button>
      <label className={styles.checkbox}><input type="checkbox" checked={room.continuousWallTiles} onChange={(event) => onContinuation(event.target.checked)} /><span>Продолжить сетку через углы</span></label>
      <p className={styles.hint}>{room.continuousWallTiles ? "Параметры плитки общие для четырёх стен. Поворот в углу разделяет исходную плитку; её обрезки между стенами не объединяются." : "Каждая стена имеет собственный старт. Продолжение через углы применит эту плитку ко всем стенам."}</p>
      <details className={styles.details} open><summary>Упаковка и стоимость</summary><div className={styles.detailsContent}><TextField label="Товар или артикул плитки" value={spec.materialKey} onCommit={(value) => update("materialKey", value)} onStatus={onStatus} /><div className={styles.fieldRow}>{number("tilesPerPack", "Плиток в упаковке", 1, 1000, "шт.", true)}{number("packPriceRub", "Цена упаковки плитки", 0, 10000000, "₽")}</div></div></details>
      {calculation && <div className={styles.wallCalculation}><div><span>Площадь стены без проёмов</span><strong>{formatNumber(calculation.netAreaM2)} м²</strong></div><div><span>Площадь самой плитки</span><strong>{formatNumber(calculation.coveredAreaM2)} м²</strong></div><div><span>По раскладке / с подрезкой</span><strong>{calculation.baseTiles} / {calculation.cutTiles} шт.</strong></div><div><span>Неуложенная часть</span><strong>{formatNumber(calculation.unlaidAreaM2, 3)} м²</strong></div><p className={styles.hint}>Одна исходная плитка на каждую занятую ячейку. Обрезки повторно не используются; неуложенная часть включает потери при резке. Откосы и ниши не учтены. Клей и затирка настраиваются ниже для плиточных поверхностей комнаты.</p></div>}
    </>}
  </>;
}

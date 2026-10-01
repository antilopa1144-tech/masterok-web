"use client";

import { useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { ArrowRight, Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { calculateProject, type ConstructorProject, type ConstructorRoom, type ProjectCalculation } from "@/lib/constructor/core";
import { compareFinish, summarizeFinish, type FinishComparison } from "@/lib/constructor/comparison";
import { MAX_VARIANTS, type ConstructorVariant } from "@/lib/constructor/workspace";
import { decorFor, formatMoney, formatNumber } from "@/lib/constructor/presentation";
import { tileDecorFor } from "@/lib/constructor/wall-presentation";
import MaterialSwatch from "./MaterialSwatch";
import shared from "./constructor.module.css";
import styles from "./VariantComparison.module.css";

interface Props {
  project: ConstructorProject;
  calculation: ProjectCalculation | null;
  variants: ConstructorVariant[];
  selectedRoomId: string;
  blocked: boolean;
  initialSelection?: string[];
  onSelectionChange: (ids: string[]) => void;
  onSave: (name: string) => string;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onApply: (variant: ConstructorVariant) => void;
  onContinue: () => void;
}

function FinishSamples({ room }: { room?: ConstructorRoom }) {
  if (!room) return null;
  const tiles = room.wallTiles.filter((spec) => spec !== null);
  const formats = [...new Set(tiles.map((spec) => `${formatNumber(spec.tileWidthMm)} × ${formatNumber(spec.tileHeightMm)}`))];
  const tile = room.floor.kind === "tile" ? room.floor.tile : undefined;
  const sample = tile ? <span className={styles.floorSample} style={{ backgroundImage: `url(/images/tile-textures/${tile.decor}.webp)`, backgroundSize: "cover", backgroundColor: tileDecorFor(tile.decor).color }} aria-hidden="true" /> : <MaterialSwatch decor={room.floor.decor} className={styles.floorSample} />;
  return <details className={styles.samples}><summary>{sample}<span>Материалы: {room.name}</span><ChevronDown size={15} /></summary><div className={styles.sampleDetails}>
    <div>{sample}<p><strong>{tile ? `Плитка · ${tileDecorFor(tile.decor).name}` : decorFor(room.floor.decor).name}</strong><span>{tile ? `${formatNumber(tile.tileWidthMm)} × ${formatNumber(tile.tileHeightMm)} мм · шов ${tile.jointMm} мм` : `${formatNumber(room.floor.boardLengthMm)} × ${formatNumber(room.floor.boardWidthMm)} мм · ${room.floor.pattern === "third" ? "1/3" : "1/2"}`}</span><span>{tile ? tile.alignment === "center" ? "По центру пола" : "От края пола" : room.floor.direction === "width" ? "Вдоль ширины" : "Вдоль длины"}</span></p></div>
    {tiles.length > 0 ? <div><span className={styles.wallSamples} aria-hidden="true">{room.wallTiles.map((spec, index) => <i key={index} style={{ backgroundColor: spec ? tileDecorFor(spec.decor).color : "transparent" }} />)}</span><p><strong>Плитка на стенах</strong><span>{formats.join("; ")} мм</span></p></div> : <p className={styles.noTiles}>Стены без плитки</p>}
  </div></details>;
}

function Metric({ label, children, note }: { label: string; children: ReactNode; note: string }) {
  return <div><dt>{label}</dt><dd>{children}<small>{note}</small></dd></div>;
}

function FinishCard({ name, rooms, selectedRoomId, summary, reference, matchesCurrent, blocked, focused, children }: {
  name: string; rooms: ConstructorRoom[]; selectedRoomId: string; summary: FinishComparison | null;
  reference?: FinishComparison | null; matchesCurrent?: boolean; blocked: boolean; focused: boolean; children: ReactNode;
}) {
  const comparison = summary && reference ? compareFinish(reference, summary) : null;
  const difference = comparison?.costDifferenceRub;
  const room = rooms.find((item) => item.id === selectedRoomId) ?? rooms[0];
  const isCurrent = reference === undefined;
  return <article aria-label={name} data-focused={focused} className={`${styles.card} ${isCurrent ? styles.currentCard : ""}`}>
    <div className={styles.cardHeading}><span>{isCurrent ? "Сейчас в редакторе" : matchesCurrent ? "Совпадает с текущим" : "Сохранённый вариант"}</span><h3>{name}</h3></div>
    {summary ? <>
      <div className={styles.cost}>
        <strong>{summary.cost.hasPrices ? `${summary.cost.complete ? "" : summary.cost.estimated ? "Оценка: " : "Учтено: "}${formatMoney(summary.cost.knownRub)}` : "Цена не задана"}</strong>
        <span>{summary.cost.unconfiguredMixtures ? `Расход не задан: ${summary.cost.unconfiguredMixtures} смесей` : summary.cost.complete ? "Все позиции по введённым ценам" : summary.cost.estimated ? "Цены различаются или частично не заданы; взяты максимальные" : summary.cost.hasPrices ? `Без цены: ${summary.cost.missingLines} поз.` : "Введите цены в параметрах материалов"}</span>
        {comparison && !comparison.sameScope ? <p className={styles.scopeWarning}>Отличаются размеры, проёмы или состав работ</p> : blocked ? null : difference !== null && difference !== undefined ? <p className={difference < 0 ? styles.saving : styles.priceDifference}>{difference === 0 ? "Стоимость как у текущего" : `${difference > 0 ? "+" : "−"}${formatMoney(Math.abs(difference))} к текущему`}</p> : comparison ? <p className={styles.priceDifference}>Разница в стоимости появится после уточнения всех цен</p> : null}
      </div>
      <p className={styles.scope}>{summary.roomCount} помещ. · пол {formatNumber(summary.floorAreaM2)} м²{summary.tileFloorCount > 0 && <span>Плиточный пол: {summary.tileFloorCount} помещ. · {formatNumber(summary.tileFloorAreaM2)} м²</span>}{summary.tileWallCount > 0 && <span>Стены с плиткой: {summary.tileWallCount} · {formatNumber(summary.tileWallAreaM2)} м²</span>}</p>
      <dl className={styles.metrics}>
        <Metric label="Ламинат к покупке" note={`Досок: ${summary.laminate.purchasedBoards}, включая резерв и округление`}>{summary.laminate.packs} упак. ламината</Metric>
        <Metric label="Раскрой пола" note={`${summary.laminate.sourceBoards} исходных досок · избыток упаковок ${summary.laminate.surplusBoards} шт.`}>{formatNumber(summary.laminate.wasteAreaM2, 3)} м² остатков и пропила</Metric>
        <Metric label="Плитка к покупке" note={summary.tileWallCount || summary.tileFloorCount ? `Плиток: ${summary.tiles.purchasedTiles} · избыток упаковок ${summary.tiles.surplusTiles} шт.` : "Плитка не назначена"}>{summary.tileWallCount || summary.tileFloorCount ? `${summary.tiles.packs} упак. плитки` : "—"}</Metric>
        <Metric label="Раскладка плитки" note={summary.tileWallCount || summary.tileFloorCount ? `${summary.tiles.sourceTiles} исходных плиток · ${summary.tiles.cutTiles} с подрезкой` : "Добавьте плитку в редакторе"}>{summary.tileWallCount || summary.tileFloorCount ? `${formatNumber(summary.tiles.wasteAreaM2, 3)} м² не уложено` : "—"}</Metric>
      </dl>
      <FinishSamples room={room} />
    </> : <p className={shared.hint}>Исправьте параметры проекта, чтобы сравнить текущий расход.</p>}
    <div className={styles.cardAction}>{children}</div>
  </article>;
}

export default function VariantComparison({ project, calculation, variants, selectedRoomId, blocked, initialSelection, onSelectionChange, onSave, onRename, onRemove, onApply, onContinue }: Props) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => initialSelection ?? variants.slice(0, 2).map((variant) => variant.id));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const roomData = useMemo(() => JSON.stringify(project.rooms), [project.rooms]);
  const matches = useMemo(() => new Set(variants.filter((variant) => JSON.stringify(variant.rooms) === roomData).map((variant) => variant.id)), [variants, roomData]);
  const current = useMemo(() => calculation ? summarizeFinish(project, calculation) : null, [project, calculation]);
  const selected = useMemo(() => selectedIds.map((id) => variants.find((variant) => variant.id === id)).filter((variant): variant is ConstructorVariant => !!variant).slice(0, 2), [variants, selectedIds]);
  // Calculate only the two selected snapshots, not every saved variant on each keystroke.
  const comparisons = useMemo(() => selected.map((variant) => {
    try {
      const savedProject = { ...project, rooms: variant.rooms };
      return { variant, summary: summarizeFinish(savedProject, calculateProject(savedProject)) };
    } catch { return { variant, summary: null }; }
  }), [project, selected]);
  const canSave = !!calculation && project.rooms.length > 0 && !blocked && matches.size === 0 && variants.length < MAX_VARIANTS;
  const select = (ids: string[]) => { setSelectedIds(ids); onSelectionChange(ids); };
  const currentFocused = !selected.some((variant) => variant.id === focusedId);
  const focus = (id: string | null) => { setFocusedId(id); cardsRef.current?.scrollIntoView({ block: "start" }); };
  const save = () => {
    if (!canSave) return;
    const savedName = name.trim() || `Вариант ${variants.length + 1}`;
    const id = onSave(savedName);
    select([...selected.slice(0, 1).map((variant) => variant.id), id]);
    setName(""); setMessage("");
  };

  return <div className={shared.modalBody}>
    <p className={styles.lead}>Сравнивается весь проект; образцы показаны для выбранной комнаты. Выберите до двух сохранённых вариантов.</p>
    {matches.size > 0 && !blocked ? <div className={styles.savedMatch}><Check size={17} /><p>Текущая раскладка сохранена.<span>Для нового варианта измените материал или укладку в редакторе.</span></p></div> : <form className={styles.saveForm} onSubmit={(event) => { event.preventDefault(); save(); }}>
      <label>Название варианта<input type="text" placeholder="Например, вдоль окна" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <button className={shared.primaryButton} type="submit" disabled={!canSave}><Plus size={17} />Сохранить вариант</button>
    </form>}
    {blocked && <p className={styles.help}>Завершите ввод параметров. Здесь показана последняя рассчитанная раскладка.</p>}
    {project.rooms.length === 0 && <p className={styles.help}>Добавьте помещение в редакторе, чтобы сохранить новую раскладку.</p>}
    {variants.length >= MAX_VARIANTS && <p className={styles.help}>Достигнут предел: {MAX_VARIANTS} вариантов. Удалите ненужный, чтобы сохранить новый.</p>}
    <div className={styles.feedback} role="status">{message}</div>

    {variants.length > 0 && <div className={styles.selectors}>{[0, 1].map((index) => <label key={index}>Для сравнения · вариант {index + 1}<select value={selected[index]?.id ?? ""} onChange={(event) => {
      const ids = selected.map((variant) => variant.id); ids[index] = event.target.value; select(ids.filter(Boolean));
    }}><option value="">Не выбран</option>{variants.map((variant) => <option key={variant.id} value={variant.id} disabled={selected.some((item, slot) => slot !== index && item.id === variant.id)}>{variant.name}</option>)}</select></label>)}</div>}
    <div className={styles.mobileSwitch} role="group" aria-label="Показать вариант">
      <button type="button" aria-pressed={currentFocused} onClick={() => focus(null)}>Текущая</button>{selected.map((variant, index) => <button type="button" key={variant.id} aria-pressed={focusedId === variant.id} onClick={() => focus(variant.id)}>Вариант {index + 1}</button>)}
    </div>
    <div ref={cardsRef} className={`${styles.grid} ${comparisons.length === 0 ? styles.single : ""}`} style={{ "--comparison-count": comparisons.length + 1 } as CSSProperties}>
      <FinishCard name="Текущая раскладка" rooms={project.rooms} selectedRoomId={selectedRoomId} summary={current} blocked={blocked} focused={currentFocused}><button type="button" className={shared.secondaryButton} onClick={onContinue}>Продолжить редактирование<ArrowRight size={16} /></button></FinishCard>
      {comparisons.map(({ variant, summary }) => <FinishCard key={variant.id} name={variant.name} rooms={variant.rooms} selectedRoomId={selectedRoomId} summary={summary} reference={current} matchesCurrent={matches.has(variant.id)} blocked={blocked} focused={focusedId === variant.id}>
        <button type="button" className={shared.primaryButton} disabled={blocked || !summary || matches.has(variant.id)} onClick={() => onApply(variant)}>{matches.has(variant.id) ? <><Check size={16} />Применён</> : <>Применить<ArrowRight size={16} /></>}</button>
      </FinishCard>)}
    </div>
    <p className={styles.explanation}>Площадь стен указана без проёмов. Остатки и пропил пола, неуложенные части плиток — потери раскроя. Резерв и избыток упаковок учтены отдельно. Подложка и плинтус входят в стоимость, если включены. Применение и удаление варианта можно отменить.</p>

    <div className={styles.libraryHeader}><h3>Сохранённые варианты</h3><span>{variants.length} / {MAX_VARIANTS}</span></div>
    {variants.length === 0 ? <p className={styles.empty}>Сохраните первую раскладку, затем попробуйте другой материал, формат или направление укладки.</p> : <>
      <p className={styles.selectionHint}>Выбрано {selected.length} из 2. {selected.length === 2 ? "Снимите выбор с одного варианта, чтобы сравнить другой." : "Отметьте варианты для сравнения."}</p>
      <ul className={styles.library}>{variants.map((variant) => {
        const checked = selected.some((item) => item.id === variant.id);
        return <li key={variant.id}>
          {editingId === variant.id ? <form className={styles.renameForm} onSubmit={(event) => {
            event.preventDefault(); const nextName = editingName.trim(); if (!nextName) { setMessage("Введите название варианта."); return; }
            onRename(variant.id, nextName); setEditingId(null); setMessage(`Вариант переименован в «${nextName}».`);
          }}><label>Новое название варианта<input autoFocus type="text" maxLength={120} value={editingName} onChange={(event) => setEditingName(event.target.value)} /></label><button type="submit" className={shared.iconButton} aria-label="Сохранить название варианта" disabled={!editingName.trim()}><Check size={18} /></button><button type="button" className={shared.iconButton} aria-label="Отменить переименование" onClick={() => setEditingId(null)}><X size={18} /></button></form> : <>
            <label className={styles.variantChoice}><input type="checkbox" checked={checked} disabled={!checked && selected.length >= 2} onChange={() => {
              select(checked ? selected.filter((item) => item.id !== variant.id).map((item) => item.id) : [...selected.map((item) => item.id), variant.id]);
            }} /><span><strong>{variant.name}</strong><small>{variant.rooms.length} помещ. · {new Date(variant.savedAt).toLocaleDateString("ru-RU")}{matches.has(variant.id) ? " · текущая раскладка" : ""}</small></span></label>
            <button type="button" className={shared.iconButton} aria-label={`Переименовать вариант ${variant.name}`} onClick={() => { setEditingId(variant.id); setEditingName(variant.name); }}><Pencil size={17} /></button>
            <button type="button" className={shared.iconButton} aria-label={`Удалить вариант ${variant.name}`} onClick={() => { select(selected.filter((item) => item.id !== variant.id).map((item) => item.id)); onRemove(variant.id); setMessage(`Вариант «${variant.name}» удалён. Кнопка «Отменить действие» в редакторе вернёт его.`); }}><Trash2 size={17} /></button>
          </>}
        </li>;
      })}</ul>
    </>}
  </div>;
}

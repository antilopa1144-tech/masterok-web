"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookmarkPlus, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { ConstructorProject, ProjectCalculation, TileRect, Wall } from "@/lib/constructor/core";
import { MAX_VARIANTS, type ConstructorVariant } from "@/lib/constructor/workspace";
import { previewWallLayout, summarizeWallLayout, type WallLayoutDraft } from "@/lib/constructor/wall-layout";
import { connectedTileParts, reviewWallCuts } from "@/lib/constructor/wall-cuts";
import { cutDimension, partDimensions, wallSvg } from "@/lib/constructor/wall-presentation";
import { formatMoney } from "@/lib/constructor/presentation";
import { useDrawingViewport, type DrawingFocus } from "./useDrawingViewport";
import styles from "./WallLayoutPreview.module.css";
import shared from "./constructor.module.css";

type Summary = ReturnType<typeof summarizeWallLayout>;
const priceLabel = (cost: Summary["cost"]) => !cost.hasPrices ? "Цена не задана" : `${cost.complete ? "" : cost.estimated ? "Оценка: " : "Учтено: "}${formatMoney(cost.knownRub)}`;

function ChangeRow({ label, before, after, note }: { label: string; before: ReactNode; after: ReactNode; note?: string }) {
  return <div className={styles.changeRow}><div><span>{label}</span>{note && <small>{note}</small>}</div><span>{before}</span><strong>{after}</strong></div>;
}

export default function WallLayoutPreview({ project, calculation, roomId, wall, variants, onApply, onClose }: {
  project: ConstructorProject; calculation: ProjectCalculation; roomId: string; wall: Wall; variants: ConstructorVariant[];
  onApply: (candidate: ConstructorProject, variantName?: string) => void; onClose: () => void;
}) {
  const room = project.rooms.find((item) => item.id === roomId)!;
  const spec = room.wallTiles[wall]!;
  const initial = useMemo<WallLayoutDraft>(() => ({ orientation: spec.orientation, alignment: spec.alignment, continuous: room.continuousWallTiles }), [spec.orientation, spec.alignment, room.continuousWallTiles]);
  const [draft, setDraft] = useState(initial);
  const [showCurrent, setShowCurrent] = useState(false);
  const [section, setSection] = useState<"settings" | "drawing" | "results">("settings");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<{ id: string; calculation: ProjectCalculation }>();
  const [focus, setFocus] = useState<DrawingFocus & { calculation: ProjectCalculation }>();
  const focusSequence = useRef(0);
  const preview = useMemo(() => previewWallLayout(project, roomId, wall, draft), [project, roomId, wall, draft]);
  const before = useMemo(() => summarizeWallLayout(project, calculation, roomId, wall), [project, calculation, roomId, wall]);
  const after = useMemo(() => preview.calculation ? summarizeWallLayout(preview.project, preview.calculation, roomId, wall) : null, [preview, roomId, wall]);
  const candidateRooms = useMemo(() => JSON.stringify(preview.project.rooms), [preview.project.rooms]);
  const unchanged = useMemo(() => candidateRooms === JSON.stringify(project.rooms), [candidateRooms, project.rooms]);
  const duplicate = useMemo(() => variants.find((variant) => JSON.stringify(variant.rooms) === candidateRooms), [variants, candidateRooms]);
  const canSave = !!after && !duplicate && variants.length < MAX_VARIANTS;
  const visibleProject = showCurrent ? project : preview.project;
  const visibleCalculation = showCurrent ? calculation : preview.calculation;
  const visibleRoom = visibleProject.rooms.find((item) => item.id === roomId)!;
  const visibleWall = visibleCalculation?.rooms.find((item) => item.roomId === roomId)?.walls.find((item) => item.wall === wall);
  const viewport = useDrawingViewport({ focus: focus?.calculation === visibleCalculation ? focus : undefined, resetKey: visibleCalculation });
  const cuts = useMemo(() => visibleWall ? reviewWallCuts([visibleWall]) : [], [visibleWall]);
  const cell = selected?.calculation === visibleCalculation ? visibleWall?.cells.find((item) => item.id === selected.id) : undefined;
  const selectedParts = useMemo(() => connectedTileParts(cell?.fragments ?? []), [cell]);
  const markup = useMemo(() => visibleCalculation ? wallSvg(visibleRoom, wall, visibleWall, { numbers: true, selectedTileId: cell?.id, idPrefix: "layout-preview" }) : "", [visibleCalculation, visibleRoom, wall, visibleWall, cell?.id]);
  const update = (value: Partial<WallLayoutDraft>) => { setDraft((current) => ({ ...current, ...value })); setShowCurrent(false); setSelected(undefined); setFocus(undefined); };
  const chooseView = (current: boolean) => { if (current === showCurrent) return; setShowCurrent(current); setSelected(undefined); setFocus(undefined); };
  const showBounds = (bounds: TileRect) => {
    if (!visibleCalculation || !visibleWall) return;
    setFocus({ calculation: visibleCalculation, token: ++focusSequence.current, x: bounds.xMm + bounds.widthMm / 2, y: visibleWall.heightMm - bounds.yMm - bounds.heightMm / 2, reveal: true });
  };
  const showCut = (entry: (typeof cuts)[number]) => {
    if (!visibleCalculation) return;
    setSelected({ id: entry.cell.id, calculation: visibleCalculation }); showBounds(entry.narrowestPart.bounds);
  };
  const savedName = name.trim() || `Вариант ${variants.length + 1}`;
  const invalidName = savedName.length > 120;

  return <>
    <div className={styles.body}>
      <div className={styles.lead}><strong>{room.name} · стена {wall + 1}</strong><p>Попробуйте настройки. Проект изменится после применения; отмена вернёт предыдущую раскладку.</p></div>
      <div className={styles.sections} role="group" aria-label="Разделы настройки раскладки">{(["settings", "drawing", "results"] as const).map((value) => <button type="button" key={value} aria-pressed={section === value} onClick={() => setSection(value)}>{value === "settings" ? "Настройки" : value === "drawing" ? "Чертёж" : "Расход"}</button>)}</div>
      {preview.error && <p className={styles.error} role="alert">{preview.error}</p>}
      <div className={styles.layout} data-section={section}>
        <div className={styles.drawingColumn}>
          <div className={styles.drawingHeading}>
            <div className={styles.viewChoice} role="group" aria-label="Чертёж для сравнения"><button type="button" aria-pressed={showCurrent} onClick={() => chooseView(true)}>Сейчас</button><button type="button" aria-pressed={!showCurrent} onClick={() => chooseView(false)}>Предпросмотр</button></div>
            <div className={styles.viewportTools} role="group" aria-label="Масштаб чертежа">
              <button type="button" aria-label="Приблизить предпросмотр" title="Приблизить" disabled={!visibleCalculation || viewport.zoom >= 4} onClick={() => viewport.changeZoom(viewport.zoom + .5)}><ZoomIn size={16} /></button>
              <button type="button" aria-label="Отдалить предпросмотр" title="Отдалить" disabled={!visibleCalculation || viewport.zoom <= 1} onClick={() => viewport.changeZoom(viewport.zoom - .5)}><ZoomOut size={16} /></button>
              <button type="button" aria-label="Поместить предпросмотр в экран" title="Вся стена" disabled={!visibleCalculation} onClick={viewport.fit}><Maximize2 size={16} /></button>
              <span role="status" aria-label="Масштаб предпросмотра">{viewport.zoom * 100}%</span>
            </div>
          </div>
          <p className={styles.format}>{cutDimension(spec.tileWidthMm)} × {cutDimension(spec.tileHeightMm)} мм · шов {cutDimension(spec.jointMm)} мм</p>
          <div ref={viewport.drawing} className={styles.drawing} data-testid="wall-layout-preview" role="region" aria-label="Чертёж для настройки раскладки" aria-describedby="wall-preview-navigation" tabIndex={visibleCalculation ? 0 : undefined} data-zoomed={viewport.zoom > 1} data-panning={viewport.panning} {...viewport.handlers} onClick={(event) => { if (viewport.isPanClick()) return; const target = (event.target as Element).closest("[data-tile-id]"); const id = target?.getAttribute("data-tile-id"); setSelected(id && visibleCalculation ? { id, calculation: visibleCalculation } : undefined); setFocus(undefined); }}>
            {visibleCalculation ? <div className={styles.drawingCanvas} style={{ width: `${viewport.zoom * 100}%`, height: `${viewport.zoom * 100}%` }} dangerouslySetInnerHTML={{ __html: markup }} /> : <p>Измените настройки, чтобы построить предпросмотр.</p>}
          </div>
          <p className={styles.navigation} id="wall-preview-navigation">Перемещайте увеличенный чертёж мышью или пальцем. На клавиатуре: стрелки, +/− для масштаба, 0 — вся стена.</p>
          {cell && <div className={styles.selected}><p role="status" aria-label="Плитка в предпросмотре"><strong>Плитка {visibleWall!.cells.indexOf(cell) + 1}</strong> · {selectedParts.map((part) => `${partDimensions(part)}${part.rectangular ? "" : " · фигурная, габариты"}`).join("; ")}</p><button type="button" className={styles.selectionZoom} aria-label="Рассмотреть выбранную плитку" onClick={() => { const bounds = cuts.find((entry) => entry.cell.id === cell.id)?.narrowestPart.bounds ?? selectedParts[0]?.bounds; if (bounds) showBounds(bounds); }}><ZoomIn size={14} />Крупнее</button></div>}
          <div className={styles.cutChoices}><span>Самые узкие части этой стены · нажмите для увеличения</span>{cuts.length ? <div>{cuts.slice(0, 5).map((entry) => <button type="button" key={entry.cell.id} aria-label={`Выделить плитку ${entry.tileNumber} в предпросмотре`} aria-pressed={cell?.id === entry.cell.id} onClick={() => showCut(entry)}><span>№ {entry.tileNumber}</span>{partDimensions(entry.narrowestPart)}{!entry.narrowestPart.rectangular && <small>Фигурная</small>}</button>)}</div> : <p>{visibleCalculation ? "Все плитки этой стены укладываются целиком." : "Верните допустимые настройки, чтобы увидеть подрезки."}</p>}</div>
          <p className={styles.hint}>Размеры фигурных частей — габариты. Вырезы и перемычки проверьте на чертеже; допустимость реза не оценивается.</p>
        </div>
        <div className={styles.settings}>
          <div className={styles.controls}>
          <fieldset><legend>Ориентация плитки</legend><div className={styles.options}>{(["horizontal", "vertical"] as const).map((value) => <button type="button" key={value} aria-pressed={draft.orientation === value} onClick={() => update({ orientation: value })}>{value === "horizontal" ? "Горизонтально" : "Вертикально"}</button>)}</div></fieldset>
          <fieldset><legend>Старт раскладки</legend><div className={styles.options}>{(["edge", "center"] as const).map((value) => <button type="button" key={value} aria-pressed={draft.alignment === value} onClick={() => update({ alignment: value })}>{value === "edge" ? "От края и пола" : "По центру"}</button>)}</div></fieldset>
          <label className={styles.continuation}><input type="checkbox" checked={draft.continuous} onChange={(event) => update({ continuous: event.target.checked })} /><span>Продолжить сетку через углы</span></label>
          <p className={styles.hint}>{draft.continuous ? "Плитка и все её параметры выбранной стены применятся к четырём стенам комнаты. Замыкание стен 4 и 1 проверьте отдельно." : room.continuousWallTiles ? "Продолжение через углы отключится для комнаты; ориентация и старт изменятся только у выбранной стены." : "Ориентация и старт изменятся только у выбранной стены. Остальные стены сохранят свои параметры."}</p>
          <button type="button" className={styles.reset} disabled={unchanged} onClick={() => update(initial)}><RotateCcw size={14} />Вернуть текущие настройки</button>
          <button type="button" className={styles.previewLink} onClick={() => setSection("drawing")}>Посмотреть чертёж<ArrowRight size={14} /></button>
          </div>
          <div className={styles.changes} aria-label="Результат изменения раскладки">
            <div className={styles.changeHeading}><span>Что изменится</span><span>Сейчас</span><strong>После</strong></div>
            <ChangeRow label={`Исходные плитки · стена ${wall + 1}`} before={`${before.sourceTiles} шт.`} after={after ? `${after.sourceTiles} шт.` : "—"} />
            <ChangeRow label="Из них с подрезкой" before={`${before.cutTiles} шт.`} after={after ? `${after.cutTiles} шт.` : "—"} />
            <ChangeRow label="Меньшая сторона подрезки" note="По габаритам частей этой стены" before={before.smallestCut ? `${cutDimension(before.smallestCut.minSideMm)} мм` : "Нет"} after={after ? after.smallestCut ? `${cutDimension(after.smallestCut.minSideMm)} мм` : "Нет" : "—"} />
            <ChangeRow label="Плитка к покупке · весь проект" before={`${before.packs} упак.`} after={after ? `${after.packs} упак.` : "—"} />
            <ChangeRow label="Стоимость материалов · весь проект" before={priceLabel(before.cost)} after={after ? priceLabel(after.cost) : "—"} />
          </div>
          {after && !after.cost.complete && <p className={`${styles.hint} ${styles.costHint}`}>{after.cost.estimated ? "Цены одного товара различаются: для закупки взяты максимальные. Незаполненные цены в сумму не входят." : after.cost.hasPrices ? "Показана сумма позиций с заданной ценой. Остальные материалы в неё не входят." : "Для оценки стоимости задайте цены в параметрах материалов."}</p>}
        </div>
      </div>
      {saving && canSave && <form id="save-wall-layout" className={styles.saveForm} onSubmit={(event) => { event.preventDefault(); if (!invalidName && canSave) onApply(preview.project, savedName); }}><label><span>Название варианта · сохраняется весь проект</span><input autoFocus type="text" aria-label="Название варианта раскладки" maxLength={120} value={name} placeholder={`Вариант ${variants.length + 1}`} onChange={(event) => setName(event.target.value)} /></label><button type="submit" className={shared.primaryButton} disabled={invalidName}>{unchanged ? "Сохранить вариант" : "Сохранить и применить"}</button></form>}
      {duplicate && <p className={styles.saveHint}>Эта раскладка уже есть в варианте «{duplicate.name}».</p>}
      {variants.length >= MAX_VARIANTS && !duplicate && <p className={styles.saveHint}>Достигнут предел: {MAX_VARIANTS} вариантов. Удалите ненужный в сравнении, чтобы сохранить новый.</p>}
    </div>
    <div className={styles.actions}><button type="button" className={styles.cancel} onClick={onClose}>Отмена</button><button type="button" className={styles.save} disabled={!canSave} aria-expanded={saving && canSave} onClick={() => setSaving((value) => !value)}><BookmarkPlus size={16} />{saving && canSave ? "Скрыть сохранение" : "Сохранить вариантом"}</button><button type="button" className={shared.primaryButton} disabled={!after || unchanged} onClick={() => onApply(preview.project)}>Применить раскладку<ArrowRight size={16} /></button></div>
  </>;
}

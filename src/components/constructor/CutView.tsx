"use client";

import type { ConstructorRoom, RoomCalculation } from "@/lib/constructor/core";
import { decorFor, formatNumber } from "@/lib/constructor/presentation";
import { tileDecorFor } from "@/lib/constructor/tile-materials";
import styles from "./constructor.module.css";

export default function CutView({ room, calculation, onSelect }: {
  room: ConstructorRoom; calculation: RoomCalculation; onSelect: (id: string) => void;
}) {
  if (calculation.floorTiles) {
    const floor = calculation.floorTiles, decor = tileDecorFor(room.floor.tile!.decor);
    const cuts = floor.cells.map((cell, index) => ({ cell, number: index + 1 })).filter(({ cell }) => cell.isCut);
    return <div className={styles.cutView}>
      <div className={styles.cutIntro}><h2>Подрезки плиточного пола</h2><p>{floor.baseTiles} исходных плиток, {floor.cutTiles} с подрезкой. Номера соответствуют плану пола. Обрезки повторно не используются; резерв и округление пачек в эти карты не входят.</p></div>
      {cuts.slice(0, 200).map(({ cell, number }) => <div className={styles.cutBoard} key={cell.id}>
        <div className={styles.cutLabel}><strong>Плитка {number}</strong><span>{formatNumber(cell.widthMm)} × {formatNumber(cell.heightMm)} мм</span></div>
        <svg viewBox={`0 0 ${cell.widthMm} ${cell.heightMm}`} style={{ maxHeight: 170 }} role="img" aria-label={`Подрезка плитки пола ${number}`}>
          <rect width={cell.widthMm} height={cell.heightMm} fill="#e6e9ed" />
          {cell.fragments.map((p, index) => <rect key={index} x={p.xMm - cell.xMm} y={p.yMm - cell.yMm} width={p.widthMm} height={p.heightMm} fill={decor.color} stroke="#f97316" strokeWidth={2} />)}
        </svg>
        <div className={styles.cutDetails}><button type="button" onClick={() => onSelect(cell.id)}>Плитка {number} на плане · {cell.fragments.map((p) => `${formatNumber(p.widthMm)} × ${formatNumber(p.heightMm)} мм`).join("; ")}</button></div>
      </div>)}
      {!cuts.length && <p>Все плитки целые — подрезки в текущей раскладке нет.</p>}
      {cuts.length > 200 && <p className={styles.hint}>Показаны первые 200 подрезок. Полный список деталей доступен в XLSX.</p>}
      <p className={styles.hint}>Серым показана неуложенная часть исходной плитки, цветом — нужная деталь. Ширина реза отдельно не рассчитана. Допустимость подрезки и необходимые монтажные зазоры проверьте по товару.</p>
    </div>;
  }
  const decor = decorFor(room.floor.decor);
  const pieces = new Map(calculation.pieces.map((piece, index) => [piece.id, { ...piece, number: index + 1 }]));
  return <div className={styles.cutView}>
    <div className={styles.cutIntro}><h2>Карты реза</h2><p>{calculation.baseBoards} исходных досок, {calculation.pieces.length} деталей. Номер на плане соответствует исходной доске. Резерв в эти карты не входит.</p></div>
    {calculation.sourceBoards.map((board, index) => <div className={styles.cutBoard} key={board.id}>
      <div className={styles.cutLabel}><strong>Доска {index + 1}</strong><span>{formatNumber(room.floor.boardLengthMm)} × {formatNumber(room.floor.boardWidthMm)} мм</span></div>
      <svg viewBox={`0 0 ${room.floor.boardLengthMm} ${room.floor.boardWidthMm}`} role="img" aria-label={`Раскрой доски ${index + 1}`}>
        <rect width={room.floor.boardLengthMm} height={room.floor.boardWidthMm} fill="#e6e9ed" />
        {board.pieceIds.map((id) => {
          const piece = pieces.get(id)!;
          return <g key={id} onClick={() => onSelect(id)} style={{ cursor: "pointer" }}>
            <title>{`Деталь ${piece.number}, ряд ${piece.row + 1}: ${formatNumber(piece.sourceLengthMm)} × ${formatNumber(piece.sourceWidthMm)} мм`}</title>
            <rect x={piece.sourceStartMm} y={0} width={piece.sourceLengthMm} height={piece.sourceWidthMm} fill={decor.color} stroke={decor.dark} strokeWidth={1} />
            <text x={piece.sourceStartMm + piece.sourceLengthMm / 2} y={piece.sourceWidthMm / 2} dominantBaseline="central" textAnchor="middle" fontSize={Math.min(32, piece.sourceWidthMm * 0.36)} fill={room.floor.decor === "dark" ? "#fff" : "#382b1c"}>{formatNumber(piece.sourceLengthMm)}</text>
          </g>;
        })}
      </svg>
      <div className={styles.cutDetails}>{board.pieceIds.map((id) => {
        const piece = pieces.get(id)!;
        return <button type="button" key={id} onClick={() => onSelect(id)}>Деталь {piece.number} · ряд {piece.row + 1} · {formatNumber(piece.sourceLengthMm)} × {formatNumber(piece.sourceWidthMm)} мм</button>;
      })}<span>Остатки: {formatNumber(board.offcuts.reduce((sum, cut) => sum + cut.areaM2, 0), 3)} м²; пропил: {formatNumber(board.kerfAreaM2, 4)} м²</span></div>
    </div>)}
    <p className={styles.hint}>Сохраняются нужные заводские торцы. Продольные полосы и средние обрезки в схеме повторно не используются. Согласуйте рисунок и крайние детали с инструкцией покрытия.</p>
  </div>;
}

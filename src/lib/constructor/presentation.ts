import type { ConstructorRoom, RoomCalculation } from "./core";
import { interiorPlanSvg, type InteriorPlanOptions } from "./interior-plan";
import { tileDecorFor, tileGroutColor } from "./tile-materials";

export const DECORS = [
  { id: "natural", name: "Натуральный дуб", color: "#bd8c52", light: "#d7b27a", dark: "#a27644" },
  { id: "light", name: "Светлый дуб", color: "#d4c5aa", light: "#e7dcc8", dark: "#b9aa91" },
  { id: "grey", name: "Серый дуб", color: "#a29d93", light: "#c5c0b6", dark: "#817b72" },
  { id: "dark", name: "Тёмный дуб", color: "#6f5137", light: "#997752", dark: "#523c29" },
] as const;

export const formatNumber = (value: number, maximumFractionDigits = 2): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);
export const formatMoney = (value: number): string => `${formatNumber(value, 2)} ₽`;
export const decorFor = (id: ConstructorRoom["floor"]["decor"]) => DECORS.find((decor) => decor.id === id) ?? DECORS[0];

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

/** Coordinates go clockwise from the top left; opening offsets follow the same convention in every view. */
export function openingPlanPosition(room: ConstructorRoom, wall: number, offset: number, width: number) {
  if (wall === 0) return { x1: offset, y1: 0, x2: offset + width, y2: 0 };
  if (wall === 1) return { x1: room.widthMm, y1: offset, x2: room.widthMm, y2: offset + width };
  if (wall === 2) return { x1: room.widthMm - offset, y1: room.lengthMm, x2: room.widthMm - offset - width, y2: room.lengthMm };
  return { x1: 0, y1: room.lengthMm - offset, x2: 0, y2: room.lengthMm - offset - width };
}

export function planSvg(room: ConstructorRoom, calculation: RoomCalculation, options: { numbers?: boolean; selectedPieceId?: string; furnished?: boolean; interior?: InteriorPlanOptions } = {}): string {
  const margin = Math.max(room.widthMm, room.lengthMm) * 0.13;
  const fontSize = margin * 0.19;
  const line = margin * 0.012;
  const decor = decorFor(room.floor.decor);
  const sourceNumbers = new Map(calculation.sourceBoards.map((board, index) => [board.id, index + 1]));
  const pieces = calculation.floorTiles ? calculation.floorTiles.cells.map((cell, index) => {
    const decor = tileDecorFor(room.floor.tile!.decor);
    const jointColor = tileGroutColor(room.floor.tile!.decor);
    const selected = cell.id === options.selectedPieceId;
    const title = `Плитка пола ${index + 1}: ${cell.fragments.map((p) => `${formatNumber(p.widthMm)} × ${formatNumber(p.heightMm)} мм`).join("; ")}${cell.isCut ? ", с подрезкой" : ", целая"}.`;
    return `<g data-piece-id="${escapeXml(cell.id)}"><title>${escapeXml(title)}</title>${cell.fragments.map((p) => `<rect x="${p.xMm}" y="${p.yMm}" width="${p.widthMm}" height="${p.heightMm}" fill="${index % 4 ? decor.color : decor.light}" ${selected ? `stroke="#f97316" stroke-width="${line * 3}"` : room.floor.tile!.jointMm > 0 ? `stroke="${jointColor}" stroke-width=".75" vector-effect="non-scaling-stroke"` : ""}/>${options.numbers && calculation.floorTiles!.cells.length < 500 ? `<text x="${p.xMm + p.widthMm / 2}" y="${p.yMm + p.heightMm / 2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(fontSize * .72, p.widthMm * .3, p.heightMm * .3)}" fill="${room.floor.tile!.decor === "graphite" ? "#fff" : "#39404a"}">${index + 1}</text>` : ""}`).join("")}</g>`;
  }).join("") : calculation.pieces.map((piece, index) => {
    const fill = [decor.color, decor.light, decor.color, decor.dark, decor.light][index % 5];
    const selected = piece.id === options.selectedPieceId;
    const title = `Деталь ${index + 1}: ${formatNumber(piece.sourceLengthMm)} × ${formatNumber(piece.sourceWidthMm)} мм. Исходная доска ${sourceNumbers.get(piece.sourceBoardId)}.`;
    return `<g data-piece-id="${escapeXml(piece.id)}"><title>${escapeXml(title)}</title><rect x="${piece.xMm}" y="${piece.yMm}" width="${piece.widthMm}" height="${piece.heightMm}" fill="${fill}" stroke="${selected ? "#f97316" : "#715c43"}" stroke-width="${selected ? line * 3 : line * 0.4}"/>${options.numbers && calculation.pieces.length < 500 ? `<text x="${piece.xMm + piece.widthMm / 2}" y="${piece.yMm + piece.heightMm / 2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(fontSize * 0.72, piece.sourceWidthMm * 0.58)}" fill="${room.floor.decor === "dark" ? "#ffffff" : "#3e3429"}">${sourceNumbers.get(piece.sourceBoardId)}</text>` : ""}</g>`;
  }).join("");
  const openings = room.openings.map((opening) => {
    const p = openingPlanPosition(room, opening.wall, opening.offsetMm, opening.widthMm);
    return `<g><title>${opening.type === "door" ? "Дверь" : "Окно"}, ${opening.widthMm} мм, стена ${opening.wall + 1}</title><line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="#f5f7fa" stroke-width="${line * 7}"/><line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${opening.type === "window" ? "#77b5cf" : "#f97316"}" stroke-width="${line * 2.5}"/></g>`;
  }).join("");
  const dimY = room.lengthMm + margin * 0.55;
  const dimX = room.widthMm + margin * 0.5;
  const tick = margin * 0.08;
  return `<svg width="${1600 * (room.widthMm + margin * 2) / Math.max(room.widthMm + margin * 2, room.lengthMm + margin * 1.7)}" height="${1600 * (room.lengthMm + margin * 1.7) / Math.max(room.widthMm + margin * 2, room.lengthMm + margin * 1.7)}" xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin * 0.7} ${room.widthMm + margin * 2} ${room.lengthMm + margin * 1.7}" role="${options.interior?.interactive ? "group" : "img"}" aria-label="${options.interior?.interactive ? "План расстановки" : "План пола"} ${escapeXml(room.name)}" style="font-family:Inter,Arial,sans-serif"><rect x="0" y="0" width="${room.widthMm}" height="${room.lengthMm}" fill="${calculation.floorTiles ? tileGroutColor(room.floor.tile!.decor) : "#dce3e9"}"/>${pieces}${options.furnished ? interiorPlanSvg(room, line, fontSize, options.interior) : ""}<rect x="0" y="0" width="${room.widthMm}" height="${room.lengthMm}" fill="none" stroke="#455162" stroke-width="${line * 5}"/>${openings}<g fill="#566174" font-size="${fontSize * 0.75}" text-anchor="middle"><text x="${room.widthMm / 2}" y="${-margin * 0.16}">Стена 1</text><text x="${room.widthMm / 2}" y="${room.lengthMm + margin * 0.22}">Стена 3</text><text x="${-margin * 0.25}" y="${room.lengthMm / 2}" transform="rotate(-90 ${-margin * 0.25} ${room.lengthMm / 2})">Стена 4</text><text x="${room.widthMm + margin * 0.21}" y="${room.lengthMm / 2}" transform="rotate(90 ${room.widthMm + margin * 0.21} ${room.lengthMm / 2})">Стена 2</text></g><g stroke="#677488" stroke-width="${line}" fill="none"><path d="M 0 ${room.lengthMm + tick} V ${dimY + tick} M ${room.widthMm} ${room.lengthMm + tick} V ${dimY + tick} M 0 ${dimY} H ${room.widthMm}"/><path d="M ${room.widthMm + tick} 0 H ${dimX + tick} M ${room.widthMm + tick} ${room.lengthMm} H ${dimX + tick} M ${dimX} 0 V ${room.lengthMm}"/></g><g fill="#172033" font-size="${fontSize}" text-anchor="middle"><text x="${room.widthMm / 2}" y="${dimY + fontSize * 1.3}">${formatNumber(room.widthMm)} мм</text><text x="${dimX + fontSize * 1.4}" y="${room.lengthMm / 2}" transform="rotate(90 ${dimX + fontSize * 1.4} ${room.lengthMm / 2})">${formatNumber(room.lengthMm)} мм</text></g></svg>`;
}

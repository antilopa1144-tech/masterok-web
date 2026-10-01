import type { ConstructorRoom, Wall, WallTileCalculation } from "./core";
import { escapeXml, formatNumber } from "./presentation";
import { connectedTileParts, type TilePart } from "./wall-cuts";
import { tileDecorFor, tileGroutColor } from "./tile-materials";
export { TILE_DECORS, tileDecorFor } from "./tile-materials";

export const cutDimension = (value: number) => formatNumber(value, value < 1 ? 6 : 2);
export const partDimensions = (part: TilePart) => `${cutDimension(part.bounds.widthMm)} × ${cutDimension(part.bounds.heightMm)} мм`;


/** The same clipped cells used by 3D and purchasing. Rectangular fragments form a single tile. */
export function wallSvg(room: ConstructorRoom, wall: Wall, calculation?: WallTileCalculation, options: { numbers?: boolean; selectedTileId?: string; idPrefix?: string } = {}): string {
  const width = wall % 2 === 0 ? room.widthMm : room.lengthMm;
  const height = room.heightMm;
  const margin = Math.max(width, height) * .12;
  const font = margin * .18;
  const spec = room.wallTiles[wall];
  const decor = tileDecorFor(spec?.decor ?? "limestone");
  const prefix = `${escapeXml(options.idPrefix ?? "wall")}-${wall}`;
  const cells = calculation?.cells.map((cell, index) => {
    const selected = options.selectedTileId === cell.id;
    const paths = cell.fragments.map((p) => `M${p.xMm} ${height - p.yMm - p.heightMm}h${p.widthMm}v${p.heightMm}h${-p.widthMm}z`).join(" ");
    const largest = [...cell.fragments].sort((a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm)[0];
    const title = `Плитка ${index + 1}, ряд ${cell.row + 1}: ${cell.isCut ? "подрезка" : "целая"}. ${connectedTileParts(cell.fragments).map((part) => `${partDimensions(part)}${part.rectangular ? "" : ", габариты фигурной части"}`).join("; ")}`;
    const outline = selected ? `stroke="#f97316" stroke-width="${margin * .017}"` : spec && spec.jointMm > 0 ? `stroke="${tileGroutColor(spec.decor)}" stroke-width=".75" vector-effect="non-scaling-stroke"` : "";
    return `<g data-tile-id="${escapeXml(cell.id)}"><title>${escapeXml(title)}</title><path d="${paths}" fill="${selected ? "#fed7aa" : (cell.row * 17 + cell.column * 13) % 11 < 2 ? decor.light : decor.color}"/><clipPath id="${prefix}-${index}"><path d="${paths}"/></clipPath><g clip-path="url(#${prefix}-${index})"><path d="M${cell.xMm} ${height - cell.yMm - cell.heightMm * .24}q${cell.widthMm * .33} ${-cell.heightMm * .12} ${cell.widthMm * .65} ${cell.heightMm * .17}t${cell.widthMm * .36} ${cell.heightMm * .22}" fill="none" stroke="${spec?.decor === "graphite" ? "#929495" : "#968f82"}" stroke-width="${spec?.decor === "marble" ? 2.6 : .7}" opacity=".23"/><rect x="${cell.xMm}" y="${height - cell.yMm - cell.heightMm}" width="${cell.widthMm}" height="${cell.heightMm}" fill="none" ${outline}/></g>${options.numbers && calculation.cells.length < 600 && largest ? `<text x="${largest.xMm + largest.widthMm / 2}" y="${height - largest.yMm - largest.heightMm / 2}" text-anchor="middle" dominant-baseline="central" fill="${spec?.decor === "graphite" ? "#fff" : "#403b35"}" font-size="${Math.min(font * .7, largest.widthMm * .25, largest.heightMm * .35)}">${index + 1}</text>` : ""}</g>`;
  }).join("") ?? "";
  const openings = room.openings.filter((o) => o.wall === wall).map((o) => `<g><title>${o.type === "door" ? "Дверь" : "Окно"}: ${o.widthMm} × ${o.heightMm} мм; отступ ${o.offsetMm} мм; низ ${o.sillMm} мм</title><rect x="${o.offsetMm}" y="${height - o.sillMm - o.heightMm}" width="${o.widthMm}" height="${o.heightMm}" fill="${o.type === "window" ? "#dfeef3" : "#e4ded4"}" stroke="#65717c" stroke-width="2"/>${o.type === "window" ? `<path d="M${o.offsetMm + o.widthMm / 2} ${height - o.sillMm - o.heightMm}v${o.heightMm}" stroke="#8598a3" stroke-width="3"/>` : ""}<text x="${o.offsetMm + o.widthMm / 2}" y="${height - o.sillMm - o.heightMm / 2}" text-anchor="middle" fill="#465260" font-size="${font * .65}">${o.type === "door" ? "Дверь" : "Окно"}</text></g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${1600 * (height + margin * 2) / (width + margin * 2)}" viewBox="${-margin} ${-margin} ${width + margin * 2} ${height + margin * 2}" role="img" aria-label="Стена ${wall + 1}, развёртка ${escapeXml(room.name)}" style="font-family:Inter,Arial,sans-serif"><rect width="${width}" height="${height}" fill="${spec ? tileGroutColor(spec.decor) : "#eeeae4"}"/>${cells}${openings}<rect width="${width}" height="${height}" fill="none" stroke="#65717c" stroke-width="2"/><g stroke="#66717c" stroke-width="1.4" fill="none"><path d="M0 ${-margin * .3}V${-margin * .64}M${width} ${-margin * .3}V${-margin * .64}M0 ${-margin * .5}H${width}M${-margin * .3} 0H${-margin * .64}M${-margin * .3} ${height}H${-margin * .64}M${-margin * .5} 0V${height}"/></g><g fill="#25303d" font-size="${font}" text-anchor="middle"><text x="${width / 2}" y="${-margin * .64}">${formatNumber(width)} мм</text><text x="${-margin * .65}" y="${height / 2}" transform="rotate(-90 ${-margin * .65} ${height / 2})">${formatNumber(height)} мм</text></g></svg>`;
}

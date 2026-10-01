import type { ConstructorRoom } from "./core";
import { furnishingName, furnishingIssues, layoutFurnishings, positionForPlacement } from "./interiors";

const LABELS: Record<string, string> = { "coffee-table": "Стол", "kitchen-unit": "Гарнитур", "dining-table": "Стол и стулья", "towel-rail": "П/с", "office-chair": "Кресло", washer: "Стиралка", vanity: "Раковина", nightstand: "Тумба", console: "Консоль" };

export interface InteriorPlanOptions { interactive?: boolean; selectedId?: string }

/** Те же позиции и направления, что в 3D. Выбор предметов включается только в режиме расстановки. */
export function interiorPlanSvg(room: ConstructorRoom, stroke: number, maxFont: number, options: InteriorPlanOptions = {}): string {
  const layout = layoutFurnishings(room);
  const issues = new Set(options.interactive ? furnishingIssues(room, layout).map((issue) => issue.id) : []);
  const selected = layout.placements.find((item) => item.id === options.selectedId);
  const guides = options.interactive && selected ? `<g pointer-events="none" stroke="#ea580c" stroke-width="1" vector-effect="non-scaling-stroke" fill="none" stroke-dasharray="${stroke * 3} ${stroke * 3}"><path d="M 0 ${selected.yMm} H ${selected.xMm} V 0"/></g>` : "";
  return `<g pointer-events="${options.interactive ? "auto" : "none"}" aria-label="Обстановка">${guides}${layout.placements.map((item) => {
    const spec = item.dimensions, name = furnishingName(room, item.id), label = furnishingName(room, item.id, LABELS[item.kind]);
    const font = Math.min(maxFont, item.widthMm / Math.max(7, label.length * .7), item.depthMm / 4);
    const rounded = ["bathtub", "toilet", "coffee-table", "plant"].includes(item.kind);
    const radius = rounded ? Math.min(item.widthMm, item.depthMm) * .2 : 28;
    const isSelected = item.id === options.selectedId, issue = issues.has(item.id), position = positionForPlacement(item);
    const color = issue ? "#b84236" : isSelected ? "#ea580c" : "#697c7d";
    const x = -spec.widthMm / 2, y = -spec.depthMm / 2;
    return `<g data-furnishing-id="${item.id}" data-furnishing-kind="${item.kind}" data-furnishing-x="${item.xMm}" data-furnishing-y="${item.yMm}" data-furnishing-rotation="${position.rotationDeg}"${options.interactive ? ` role="button" tabindex="0" aria-label="${name}" aria-pressed="${isSelected}"` : ""}><title>${name}: ${spec.widthMm} × ${spec.depthMm} × ${spec.heightMm} мм, габаритная модель; X ${item.xMm}, Y ${item.yMm}, поворот ${position.rotationDeg}°</title><g transform="translate(${item.centerXmm} ${item.centerYmm}) rotate(-${position.rotationDeg})"><rect x="${x}" y="${y}" width="${spec.widthMm}" height="${spec.depthMm}" rx="${radius}" fill="${issue ? "#fff0ed" : isSelected ? "#fff0dc" : "#edf1ef"}" fill-opacity=".94" stroke="${color}" stroke-width="${isSelected ? 2.3 : 1.2}" vector-effect="non-scaling-stroke"/>${item.kind === "bathtub" || item.kind === "toilet" ? `<rect x="${x + spec.widthMm * .13}" y="${y + spec.depthMm * .13}" width="${spec.widthMm * .74}" height="${spec.depthMm * .74}" rx="${radius}" fill="none" stroke="#9babad" stroke-width="${stroke}"/>` : ""}<path d="M ${-spec.widthMm * .22} ${spec.depthMm * .36} H ${spec.widthMm * .22}" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>${isSelected ? `<path d="M -32 ${spec.depthMm * .22} L 0 ${spec.depthMm * .32} L 32 ${spec.depthMm * .22}" fill="none" stroke="${color}" stroke-width="${stroke * 1.3}"/>` : ""}</g><text x="${item.centerXmm}" y="${item.centerYmm}" fill="#405459" text-anchor="middle" dominant-baseline="central" font-size="${font}" pointer-events="none">${label}</text></g>`;
  }).join("")}</g>`;
}

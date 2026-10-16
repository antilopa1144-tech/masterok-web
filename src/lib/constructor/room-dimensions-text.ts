import type { ConstructorRoom } from "./core";

/** A text snapshot of the current room; no derived quantities or purchase totals. */
export function roomDimensionsText(room: ConstructorRoom): string {
  const mm = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 20 });
  return [
    `Мастерок · ${room.name}`,
    `Размеры внутри помещения: ширина ${mm(room.widthMm)} мм, длина ${mm(room.lengthMm)} мм, высота ${mm(room.heightMm)} мм.`,
    "",
    "Двери и окна (ширина × высота):",
    ...room.openings.map(opening => `${opening.type === "door" ? "Дверь" : "Окно"} · стена ${opening.wall + 1}: ${mm(opening.widthMm)} × ${mm(opening.heightMm)} мм; отступ ${mm(opening.offsetMm)} мм${opening.type === "window" ? `; подоконник от пола ${mm(opening.sillMm)} мм` : ""}.`),
    ...(room.openings.length ? ["Стены и отступы идут по часовой стрелке от верхнего левого угла плана: 1 — сверху, 2 — справа, 3 — снизу, 4 — слева. Отступ проёма — от начала его стены."] : ["Проёмы не добавлены."]),
    "",
    "Только выбранная комната. Параметры проекта — сверьте с замерами на месте.",
  ].join("\n");
}

import type { LaminateDirection, LaminateMode } from "@/lib/tools/laminate-layout";
import type { LayoutMode, TileStartMode } from "@/lib/tools/tile-layout";
import type { ConstructorWorkspace } from "./workspace";

interface SurfaceInput { surfaceW: number; surfaceH: number }
export interface LaminateConstructorInput extends SurfaceInput {
  material: "laminate";
  boardW: number;
  boardH: number;
  mode: LaminateMode;
  direction: LaminateDirection;
}
export interface TileConstructorInput extends SurfaceInput {
  material: "tile";
  surfaceView: "wall" | "floor";
  tileW: number;
  tileH: number;
  groutMm: number;
  reservePercent: number;
  layoutMode: LayoutMode;
  startMode: TileStartMode;
  /** Only a confirmed count from the product label, never an estimate from pack area. */
  tilesPerPack?: number;
}
export type ConstructorLayoutInput = LaminateConstructorInput | TileConstructorInput;

const within = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;

/** Lightweight UI guard. The destination engine validates the complete project before saving. */
export function getLayoutTransferIssue(input: ConstructorLayoutInput): string | null {
  if (input.material === "tile" && input.surfaceView !== "floor") return "Для переноса размеров выберите «Пол». Размеров одной стены недостаточно, чтобы задать комнату.";
  if (!within(input.surfaceW, 300, 30_000) || !within(input.surfaceH, 300, 30_000)) return "В конструктор можно перенести пол с длиной и шириной от 300 до 30 000 мм.";
  if (input.material === "laminate") {
    if (input.mode !== "deck-third" && input.mode !== "deck-half") return "Ёлочка пока доступна только в этом инструменте. Для переноса выберите «Палуба 1/3» или «Палуба 1/2».";
    if (input.direction !== "along-width" && input.direction !== "along-length") return "Выберите направление досок перед переносом.";
    if (!within(input.boardW, 100, 3000) || !within(input.boardH, 40, 600)) return "Проверьте формат доски: длина от 100 до 3000 мм, ширина от 40 до 600 мм.";
  } else {
    if (input.layoutMode !== "straight") return "В конструкторе пока доступна прямая раскладка плитки. Выберите её для переноса; текущую схему можно сохранить здесь.";
    if (input.startMode !== "edge" && input.startMode !== "center") return "Ручной сдвиг сетки пока не переносится. Выберите старт от края или по центру.";
    if (!within(input.tileW, 50, 1600) || !within(input.tileH, 50, 1600)) return "Конструктор поддерживает стороны плитки от 50 до 1600 мм. Текущую раскладку можно сохранить здесь.";
    if (!within(input.groutMm, 0, 20) || !within(input.reservePercent, 0, 100)) return "Проверьте шов и запас перед переносом: от 0 до 20 мм и от 0 до 100 %.";
    if (input.tilesPerPack !== undefined && (!Number.isInteger(input.tilesPerPack) || !within(input.tilesPerPack, 1, 1000))) return "Укажите целое количество плиток в упаковке от 1 до 1000.";
  }
  return null;
}

/** Transfer inputs, not purchase totals: each engine keeps its own cutting and gap rules. */
export async function createWorkspaceFromLayout(input: ConstructorLayoutInput): Promise<ConstructorWorkspace> {
  const issue = getLayoutTransferIssue(input);
  if (issue) throw new Error(issue);
  // Load the editor engine only when the user chooses to open the constructor.
  const [{ createScenarioWorkspace }, { createFloorTileSpec, validateProject }] = await Promise.all([
    import("./scenarios"), import("./core"),
  ]);
  const workspace = createScenarioWorkspace("laminate");
  const room = workspace.project.rooms[0];
  room.widthMm = input.surfaceW;
  room.lengthMm = input.surfaceH;
  workspace.project.name = input.material === "laminate" ? "Комната из раскладки ламината" : "Пол из раскладки плитки";
  if (input.material === "laminate") {
    room.floor = { ...room.floor, kind: "laminate", boardLengthMm: input.boardW, boardWidthMm: input.boardH,
      pattern: input.mode === "deck-half" ? "half" : "third", direction: input.direction === "along-width" ? "width" : "length" };
  } else {
    room.floor = { ...room.floor, kind: "tile", tile: { ...createFloorTileSpec(), decor: "limestone",
      tileWidthMm: input.tileW, tileHeightMm: input.tileH, orientation: "horizontal", jointMm: input.groutMm,
      reservePercent: input.reservePercent, alignment: input.startMode === "center" ? "center" : "edge",
      ...(input.tilesPerPack === undefined ? {} : { tilesPerPack: input.tilesPerPack }),
    } };
  }
  const errors = validateProject(workspace.project);
  if (errors.length) throw new Error(`Не удалось перенести раскладку: ${errors.join(" ")}`);
  return workspace;
}

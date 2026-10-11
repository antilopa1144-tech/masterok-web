import { validateProject, type ConstructorProject, type ConstructorRoom, type Opening, type Wall } from "./core";

/** Suggestions for the editor, not dimensions or requirements of a real product. */
const OPENING_SUGGESTIONS = {
  door: { widthMm: 900, heightMm: 2100 },
  window: { widthMm: 1400, heightMm: 1400 },
} as const;

export const OPENING_WALLS = [0, 1, 2, 3] as const;
export const OPENING_CORNERS = ["верхнего левого", "верхнего правого", "нижнего правого", "нижнего левого"] as const;

export function openingWallLength(room: ConstructorRoom, wall: Wall): number {
  return wall % 2 === 0 ? room.widthMm : room.lengthMm;
}

/** Prefer the centre, then gaps along this wall. Never silently choose another wall. */
export function suggestedOpeningOffset(room: ConstructorRoom, draft: Pick<Opening, "id" | "wall" | "widthMm">): number {
  const length = openingWallLength(room, draft.wall);
  const maximum = Math.max(0, length - draft.widthMm);
  const occupied = room.openings.filter((item) => item.wall === draft.wall && item.id !== draft.id).sort((a, b) => a.offsetMm - b.offsetMm);
  const centre = Math.min(maximum, Math.round(maximum / 2));
  const candidates = [centre, 0, ...occupied.map((item) => item.offsetMm + item.widthMm)];
  return candidates.find((offset) => offset + draft.widthMm <= length && occupied.every((item) =>
    offset >= item.offsetMm + item.widthMm || offset + draft.widthMm <= item.offsetMm)) ?? centre;
}

export function createOpeningDraft(room: ConstructorRoom, type: Opening["type"], wall: Wall, id: string): Opening {
  const suggestion = OPENING_SUGGESTIONS[type];
  const sillMm = type === "door" ? 0 : Math.min(900, room.heightMm * .3);
  const draft: Opening = {
    id, type, wall, offsetMm: 0,
    widthMm: Math.round(Math.min(suggestion.widthMm, openingWallLength(room, wall) * .6)),
    heightMm: Math.min(suggestion.heightMm, room.heightMm - sillMm), sillMm,
  };
  draft.offsetMm = suggestedOpeningOffset(room, draft);
  return draft;
}

export function openingOnWall(room: ConstructorRoom, opening: Opening, wall: Wall): Opening {
  const draft = { ...opening, wall };
  return { ...draft, offsetMm: suggestedOpeningOffset(room, draft) };
}

/** Enlarging the draft keeps it inside this wall; its exact size is never rounded. */
export function openingWithWidth(room: ConstructorRoom, opening: Opening, widthMm: number): Opening {
  return { ...opening, widthMm, offsetMm: Math.min(opening.offsetMm, Math.max(0, openingWallLength(room, opening.wall) - widthMm)) };
}

function projectWithOpening(project: ConstructorProject, roomId: string, opening: Opening, editing: boolean): ConstructorProject {
  const room = project.rooms.find((item) => item.id === roomId);
  if (!room) throw new Error("Помещение не найдено. Закройте окно и выберите помещение снова.");
  if (editing && !room.openings.some((item) => item.id === opening.id)) throw new Error("Проём не найден. Закройте окно и выберите проём снова.");
  const openings = editing ? room.openings.map((item) => item.id === opening.id ? { ...opening } : item) : [...room.openings, { ...opening }];
  return { ...project, rooms: project.rooms.map((item) => item.id === roomId ? { ...item, openings } : item) };
}

/** Check the complete future project, including intersections and layout complexity. */
export function openingDraftIssues(project: ConstructorProject, roomId: string, opening: Opening, editing: boolean): string[] {
  try { return validateProject(projectWithOpening(project, roomId, opening, editing)); }
  catch (error) { return [error instanceof Error ? error.message : "Не удалось проверить проём."]; }
}

export function applyOpeningDraft(project: ConstructorProject, roomId: string, opening: Opening, editing: boolean): ConstructorProject {
  const next = projectWithOpening(project, roomId, opening, editing);
  const issues = validateProject(next);
  if (issues.length) throw new Error(issues[0]);
  return next;
}

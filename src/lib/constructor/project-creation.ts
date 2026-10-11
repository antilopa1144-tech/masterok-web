import { validateProject, type ConstructorRoom } from "./core";
import { cloneValue, type ConstructorWorkspace } from "./workspace";

/** Commit one prepared room; the template and draft remain untouched on failure. */
export function createProjectFromRoom(template: ConstructorWorkspace, room: ConstructorRoom): ConstructorWorkspace {
  const next = cloneValue(template);
  next.project.rooms = [cloneValue(room)];
  next.project.name = room.name;
  next.project.updatedAt = new Date().toISOString();
  next.variants = [];
  const errors = validateProject(next.project);
  if (errors.length) throw new Error(`Не удалось создать проект: ${errors[0]}`);
  return next;
}

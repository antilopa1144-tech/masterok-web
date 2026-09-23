import { getDbOrNull } from "./db";
import {
  readLegacyProjects,
  writeLegacyProjects,
} from "./legacy";
import type { ProjectWithEntries, StoredProject, StoredProjectEntry, StoredProjectMaterial } from "./types";
import { excludePurchaseMaterial, updatePurchaseMaterial, type PurchaseMaterialEdit } from "@/lib/projects/purchase-edits";

function normalizeProject(project: ProjectWithEntries): StoredProject {
  return {
    id: project.id,
    name: project.name,
    created: project.created,
    updatedAt: project.updatedAt ?? project.created ?? Date.now(),
  };
}

export interface SaveProjectEntryOptions {
  /** Re-save this same calculation instead of creating another one. */
  entryId?: string;
  /** A visible room/calculation label. */
  label?: string;
}

export type SavedProjectEntryInput = Omit<StoredProjectEntry, "id" | "projectId">;

function newEntryId(projectId: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
  return `${projectId}:entry:${Date.now().toString(36)}:${random}`;
}

function normalizeMaterials(entryId: string, materials: StoredProjectMaterial[]): StoredProjectMaterial[] {
  return materials.map((material, index) => ({
    ...material,
    id: material.id ?? `${entryId}:material:${index}`,
  }));
}

function normalizeEntry(
  projectId: string,
  entry: SavedProjectEntryInput | StoredProjectEntry,
  entryId = "id" in entry ? entry.id : undefined,
): StoredProjectEntry {
  const id = entryId ?? newEntryId(projectId);
  return {
    ...entry,
    projectId,
    id,
    materials: normalizeMaterials(id, entry.materials),
  };
}

export async function getProjects(): Promise<ProjectWithEntries[]> {
  const database = await getDbOrNull();
  if (!database) return readLegacyProjects();

  const projects = await database.projects.orderBy("created").reverse().toArray();
  const entries = await database.projectEntries.toArray();

  return projects.map((project) => ({
    ...project,
    entries: entries
      .filter((entry) => entry.projectId === project.id)
      .sort((a, b) => b.ts - a.ts),
  }));
}

export async function putProjects(projects: ProjectWithEntries[]): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    writeLegacyProjects(projects);
    return;
  }

  await database.transaction("rw", database.projects, database.projectEntries, async () => {
    await database.projects.clear();
    await database.projectEntries.clear();
    await database.projects.bulkPut(projects.map(normalizeProject));
    await database.projectEntries.bulkPut(
      projects.flatMap((project) => project.entries.map((entry) => normalizeEntry(project.id, entry)))
    );
  });
}

export async function createProject(name: string): Promise<ProjectWithEntries> {
  const now = Date.now();
  const project: ProjectWithEntries = {
    id: `proj-${now}`,
    name,
    created: now,
    updatedAt: now,
    entries: [],
  };

  const database = await getDbOrNull();
  if (!database) {
    const projects = [project, ...readLegacyProjects()];
    writeLegacyProjects(projects);
    return project;
  }

  await database.projects.put(normalizeProject(project));
  return project;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const database = await getDbOrNull();
  if (!database) {
    const projects = readLegacyProjects();
    const project = projects.find((p) => p.id === id);
    if (project) {
      project.name = trimmed;
      project.updatedAt = Date.now();
      writeLegacyProjects(projects);
    }
    return;
  }

  await database.projects.update(id, { name: trimmed, updatedAt: Date.now() });
}

export async function deleteEntryFromProject(projectId: string, entryId: string): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    const projects = readLegacyProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    project.entries = project.entries.filter((e) => e.id !== entryId);
    project.updatedAt = Date.now();
    writeLegacyProjects(projects);
    return;
  }

  await database.transaction("rw", database.projects, database.projectEntries, async () => {
    await database.projectEntries.delete(entryId);
    await database.projects.update(projectId, { updatedAt: Date.now() });
  });
}

export async function deleteProject(id: string): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    writeLegacyProjects(readLegacyProjects().filter((project) => project.id !== id));
    return;
  }

  await database.transaction("rw", database.projects, database.projectEntries, async () => {
    await database.projects.delete(id);
    await database.projectEntries.where("projectId").equals(id).delete();
  });
}

export async function saveEntryToProject(
  projectId: string,
  entry: SavedProjectEntryInput,
  options: SaveProjectEntryOptions = {},
): Promise<string | null> {
  const normalized = normalizeEntry(projectId, {
    ...entry,
    ...(options.label?.trim() ? { label: options.label.trim() } : {}),
  }, options.entryId);
  const database = await getDbOrNull();
  if (!database) {
    const projects = readLegacyProjects();
    const project = projects.find((item) => item.id === projectId);
    if (!project) return null;
    project.entries = options.entryId && project.entries.some((item) => item.id === options.entryId)
      ? project.entries.map((item) => item.id === options.entryId ? normalized : item)
      : [...project.entries, normalized];
    project.updatedAt = Date.now();
    writeLegacyProjects(projects);
    return normalized.id;
  }

  await database.transaction("rw", database.projects, database.projectEntries, async () => {
    const project = await database.projects.get(projectId);
    if (!project) return;
    await database.projectEntries.put(normalized);
    await database.projects.update(projectId, { updatedAt: Date.now() });
  });
  return normalized.id;
}

export async function updateProjectMaterial(
  projectId: string,
  entryId: string,
  materialId: string,
  patch: PurchaseMaterialEdit,
): Promise<boolean> {
  const apply = (entry: StoredProjectEntry) => {
    if (entry.id !== entryId) return entry;
    return {
      ...entry,
      materials: entry.materials.map((material) => material.id === materialId ? updatePurchaseMaterial(material, patch) : material),
    };
  };
  const database = await getDbOrNull();
  if (!database) {
    const projects = readLegacyProjects();
    const project = projects.find((item) => item.id === projectId);
    if (!project || !project.entries.some((entry) => entry.id === entryId && entry.materials.some((m) => m.id === materialId))) return false;
    project.entries = project.entries.map(apply);
    project.updatedAt = Date.now();
    writeLegacyProjects(projects);
    return true;
  }
  return database.transaction("rw", database.projects, database.projectEntries, async () => {
    const entry = await database.projectEntries.get(entryId);
    if (!entry || entry.projectId !== projectId || !entry.materials.some((m) => m.id === materialId)) return false;
    await database.projectEntries.put(apply(entry));
    await database.projects.update(projectId, { updatedAt: Date.now() });
    return true;
  });
}

export function updatePurchaseLineQuantity(projectId: string, entryId: string, materialId: string, quantity: number) {
  return updateProjectMaterial(projectId, entryId, materialId, { quantity });
}

export function updatePurchaseLinePackaging(
  projectId: string,
  entryId: string,
  materialId: string,
  packageSize: number,
  packageUnit?: string,
) {
  return updateProjectMaterial(projectId, entryId, materialId, { packageSize, packageUnit });
}

export async function excludePurchaseLine(projectId: string, entryId: string, materialId: string, excluded = true): Promise<boolean> {
  const database = await getDbOrNull();
  const apply = (entry: StoredProjectEntry) => ({
    ...entry,
    materials: entry.materials.map((material) => material.id === materialId ? excludePurchaseMaterial(material, excluded) : material),
  });
  if (!database) {
    const projects = readLegacyProjects();
    const project = projects.find((item) => item.id === projectId);
    if (!project || !project.entries.some((entry) => entry.id === entryId && entry.materials.some((m) => m.id === materialId))) return false;
    project.entries = project.entries.map((entry) => entry.id === entryId ? apply(entry) : entry);
    project.updatedAt = Date.now();
    writeLegacyProjects(projects);
    return true;
  }
  return database.transaction("rw", database.projects, database.projectEntries, async () => {
    const entry = await database.projectEntries.get(entryId);
    if (!entry || entry.projectId !== projectId || !entry.materials.some((m) => m.id === materialId)) return false;
    await database.projectEntries.put(apply(entry));
    await database.projects.update(projectId, { updatedAt: Date.now() });
    return true;
  });
}

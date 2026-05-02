import { getDbOrNull } from "./db";
import {
  readLegacyProjects,
  writeLegacyProjects,
} from "./legacy";
import type { ProjectWithEntries, StoredProject, StoredProjectEntry } from "./types";

function normalizeProject(project: ProjectWithEntries): StoredProject {
  return {
    id: project.id,
    name: project.name,
    created: project.created,
    updatedAt: project.updatedAt ?? project.created ?? Date.now(),
  };
}

function normalizeEntry(projectId: string, entry: Omit<StoredProjectEntry, "id" | "projectId"> | StoredProjectEntry): StoredProjectEntry {
  return {
    ...entry,
    projectId,
    id: `${projectId}:${entry.calcId}`,
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
  entry: Omit<StoredProjectEntry, "id" | "projectId">
): Promise<void> {
  const database = await getDbOrNull();
  if (!database) {
    const projects = readLegacyProjects();
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    project.entries = [
      ...project.entries.filter((item) => item.calcId !== entry.calcId),
      normalizeEntry(projectId, entry),
    ];
    project.updatedAt = Date.now();
    writeLegacyProjects(projects);
    return;
  }

  await database.transaction("rw", database.projects, database.projectEntries, async () => {
    const project = await database.projects.get(projectId);
    if (!project) return;
    await database.projectEntries.put(normalizeEntry(projectId, entry));
    await database.projects.update(projectId, { updatedAt: Date.now() });
  });
}

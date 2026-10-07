import type { WorkspaceSummary } from "./storage";

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
}

/** Keep the storage order (most recently changed first), including namesakes. */
export function filterWorkspaceSummaries(projects: readonly WorkspaceSummary[], query: string): WorkspaceSummary[] {
  const words = normalizeSearch(query).trim().split(/\s+/u).filter(Boolean);
  return projects.filter((project) => {
    const name = normalizeSearch(project.name);
    return words.every((word) => name.includes(word));
  });
}

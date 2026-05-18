const KEY_PREFIX = "masterok:project-checked:";

export function loadCheckedKeys(projectId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${projectId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveCheckedKeys(projectId: string, keys: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${KEY_PREFIX}${projectId}`, JSON.stringify([...keys]));
}

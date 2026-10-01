import { parseWorkspace, type ConstructorWorkspace } from "./workspace";

const DATABASE_NAME = "masterok-constructor";
let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("Браузер не предоставляет локальное хранилище. Скачивайте файл проекта для сохранения."));
        return;
      }
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("workspaces", { keyPath: "project.id" });
        request.result.createObjectStore("settings");
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => { database.close(); databasePromise = undefined; };
        resolve(database);
      };
      request.onerror = () => reject(new Error("Не удалось открыть хранилище. Проверьте настройки браузера и скачайте файл проекта."));
      request.onblocked = () => reject(new Error("Хранилище занято другой вкладкой. Закройте другие вкладки конструктора и повторите сохранение."));
    }).catch((error: unknown) => { databasePromise = undefined; throw error; });
  }
  return databasePromise;
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Не удалось прочитать локальный проект."));
  });
}

export async function loadWorkspace(id?: string): Promise<ConstructorWorkspace | null> {
  const database = await openDatabase();
  const activeId = id ?? await readRequest(database.transaction("settings").objectStore("settings").get("active"));
  if (!activeId) return null;
  const value: unknown = await readRequest(database.transaction("workspaces").objectStore("workspaces").get(activeId));
  return value ? parseWorkspace(value) : null;
}

export async function saveWorkspace(workspace: ConstructorWorkspace): Promise<void> {
  const checked = parseWorkspace(workspace);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(["workspaces", "settings"], "readwrite");
    transaction.objectStore("workspaces").put(checked);
    transaction.objectStore("settings").put(checked.project.id, "active");
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(new Error("Проект не сохранён. Возможно, закончилось место в браузере. Скачайте файл проекта."));
  });
}

export interface WorkspaceSummary { id: string; name: string; updatedAt: string; rooms: number }

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const database = await openDatabase();
  const values: unknown[] = await readRequest(database.transaction("workspaces").objectStore("workspaces").getAll());
  return values.flatMap((value) => {
    try {
      const { project } = parseWorkspace(value);
      return [{ id: project.id, name: project.name, updatedAt: project.updatedAt, rooms: project.rooms.length }];
    } catch { return []; }
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

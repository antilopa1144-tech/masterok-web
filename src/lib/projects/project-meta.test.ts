import { afterEach, describe, expect, it, vi } from "vitest";
import { loadProjectMeta, saveProjectMeta } from "./project-meta";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe("project estimate meta", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("сохраняет и восстанавливает реквизиты сметы вместе с расходами", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);

    saveProjectMeta("bathroom", {
      reservePercent: 10,
      deliveryRub: 900,
      objectName: "Квартира 127, проспект Победы",
      customerName: "Александр Иванов",
    });

    expect(loadProjectMeta("bathroom")).toEqual({
      reservePercent: 10,
      deliveryRub: 900,
      objectName: "Квартира 127, проспект Победы",
      customerName: "Александр Иванов",
    });
  });

  it("нормализует повреждённые и устаревшие данные", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);
    storage.setItem(
      "masterok:project-meta:old",
      JSON.stringify({ reservePercent: 80, deliveryRub: -500, objectName: 123 }),
    );

    expect(loadProjectMeta("old")).toEqual({
      reservePercent: 30,
      deliveryRub: 0,
      objectName: undefined,
      customerName: undefined,
    });
  });
});

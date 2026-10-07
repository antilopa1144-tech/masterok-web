import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspace, MAX_PROJECT_FILE_BYTES, serializeWorkspace } from "../../src/lib/constructor/workspace";
import { importAndSaveWorkspace } from "../../src/lib/constructor/import";
import { saveWorkspace } from "../../src/lib/constructor/storage";

vi.mock("../../src/lib/constructor/storage", () => ({ saveWorkspace: vi.fn().mockResolvedValue(undefined) }));

function file(text: string) {
  return { size: new TextEncoder().encode(text).byteLength, text: vi.fn().mockResolvedValue(text) };
}

describe("Opening a project from the constructor entry page", () => {
  beforeEach(() => { vi.mocked(saveWorkspace).mockReset().mockResolvedValue(undefined); });

  it("persists a separate copy with its rooms, prices and variants before returning its id", async () => {
    const original = createWorkspace();
    original.project.name = "Ванная — семейный проект";
    original.project.rooms[0].floor.packPriceRub = 2499;
    original.variants = [{ id: "variant", name: "Первый вариант", rooms: structuredClone(original.project.rooms), savedAt: original.project.updatedAt }];
    const input = file(serializeWorkspace(original));
    let completeSave!: () => void;
    vi.mocked(saveWorkspace).mockImplementationOnce(() => new Promise<void>((resolve) => { completeSave = resolve; }));
    let opened = false;
    const result = importAndSaveWorkspace(input).then((id) => { opened = true; return id; });
    await vi.waitFor(() => expect(saveWorkspace).toHaveBeenCalledOnce());
    expect(opened).toBe(false);
    const saved = vi.mocked(saveWorkspace).mock.calls[0][0];
    expect(saved.project.id).not.toBe(original.project.id);
    expect(saved.project.name).toBe(original.project.name);
    expect(saved.project.rooms).toEqual(original.project.rooms);
    expect(saved.variants).toEqual(original.variants);
    completeSave();
    expect(await result).toBe(saved.project.id);
  });

  it("makes a new copy on every import of the same backup", async () => {
    const input = file(serializeWorkspace(createWorkspace()));
    const first = await importAndSaveWorkspace(input);
    expect(await importAndSaveWorkspace(input)).not.toBe(first);
  });

  it("rejects an oversized file before reading or saving it", async () => {
    const input = { ...file(""), size: MAX_PROJECT_FILE_BYTES + 1 };
    await expect(importAndSaveWorkspace(input)).rejects.toThrow("4 МБ");
    expect(input.text).not.toHaveBeenCalled();
    expect(saveWorkspace).not.toHaveBeenCalled();
  });

  it.each(["", "not json", "{}", JSON.stringify({ format: "masterok-constructor", version: 6 })])("leaves existing projects untouched for an invalid file: %s", async (text) => {
    await expect(importAndSaveWorkspace(file(text))).rejects.toThrow();
    expect(saveWorkspace).not.toHaveBeenCalled();
  });

  it("validates room data even when the file has the right format", async () => {
    const invalid = createWorkspace();
    invalid.project.rooms[0].floor.boardsPerPack = 2.5;
    await expect(importAndSaveWorkspace(file(JSON.stringify(invalid)))).rejects.toThrow("целым");
    expect(saveWorkspace).not.toHaveBeenCalled();
  });

  it("explains a device read error without attempting a save", async () => {
    const input = { size: 123, text: vi.fn().mockRejectedValue(new Error("OS read error")) };
    await expect(importAndSaveWorkspace(input)).rejects.toThrow("Сохраните его на устройство");
    expect(saveWorkspace).not.toHaveBeenCalled();
  });

  it("does not save after leaving the page during the file read", async () => {
    const controller = new AbortController();
    const input = file(serializeWorkspace(createWorkspace()));
    const result = importAndSaveWorkspace(input, controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(saveWorkspace).not.toHaveBeenCalled();
  });

  it("does not return a destination when browser storage fails", async () => {
    vi.mocked(saveWorkspace).mockRejectedValueOnce(new Error("Проект не сохранён. Возможно, закончилось место в браузере."));
    await expect(importAndSaveWorkspace(file(serializeWorkspace(createWorkspace())))).rejects.toThrow("Проект не сохранён");
  });
});

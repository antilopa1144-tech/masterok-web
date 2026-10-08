import { describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/analytics";
import { createWorkspace, cloneValue } from "./workspace";
import { ConstructorJourney } from "./journey";

function setup() {
  const send = vi.fn<typeof trackEvent>();
  const journey = new ConstructorJourney(send);
  const project = createWorkspace().project;
  journey.open(project, "new", "room");
  return { send, journey, project };
}

describe("constructor journey", () => {
  it("не принимает загрузку, повторный эффект и неизменённое значение за начало работы", () => {
    const { send, journey, project } = setup();
    journey.open(project, "new", "room");
    journey.observe(cloneValue(project));
    journey.observe({ ...cloneValue(project), updatedAt: "2026-10-08T00:00:00Z" });
    expect(send.mock.calls).toEqual([["constructor_open", { mode: "new", scenario: "room" }]]);
  });

  it("считает первый применённый размер один раз, без повторов при движении ползунка", () => {
    const { send, journey, project } = setup();
    const next = cloneValue(project); next.rooms[0].widthMm += 100;
    journey.observe(next);
    const again = cloneValue(next); again.rooms[0].lengthMm += 200;
    journey.observe(again);
    journey.resultView(); journey.resultView();
    expect(send.mock.calls.slice(1)).toEqual([
      ["constructor_start", { action: "dimensions" }],
      ["constructor_dimensions_change", {}],
      ["constructor_result_view", { edited: true }],
    ]);
  });

  it("отличает готовый результат от собственного изменения", () => {
    const { send, journey } = setup();
    journey.resultView();
    expect(send).toHaveBeenLastCalledWith("constructor_result_view", { edited: false });
  });

  it("учитывает собственный результат после предварительного просмотра примера", () => {
    const { send, journey, project } = setup();
    journey.resultView(); journey.resultView();
    const next = cloneValue(project); next.rooms[0].widthMm += 100;
    journey.observe(next); journey.resultView(); journey.resultView();
    expect(send.mock.calls.filter(([name]) => name === "constructor_result_view")).toEqual([
      ["constructor_result_view", { edited: false }],
      ["constructor_result_view", { edited: true }],
    ]);
  });

  it("дедуплицирует изменение покрытия, но сохраняет каждый успешный экспорт", () => {
    const { send, journey, project } = setup();
    const next = cloneValue(project); next.rooms[0].floor.reservePercent += 5;
    journey.observe(next);
    const again = cloneValue(next); again.rooms[0].floor.reservePercent += 5;
    journey.observe(again);
    journey.export("xlsx"); journey.export("xlsx");
    expect(send.mock.calls.slice(1)).toEqual([
      ["constructor_start", { action: "material" }],
      ["constructor_material_change", { surface: "floor" }],
      ["constructor_export", { format: "xlsx" }],
      ["constructor_export", { format: "xlsx" }],
    ]);
  });

  it("сбрасывает milestones при смене проекта и не считает восстановление изменением", () => {
    const { send, journey, project } = setup();
    const changed = cloneValue(project); changed.rooms[0].widthMm += 100;
    journey.observe(changed); journey.resultView();
    const resumed = createWorkspace().project;
    journey.open(resumed, "resume"); journey.observe(resumed); journey.resultView();
    expect(send.mock.calls.slice(-2)).toEqual([
      ["constructor_open", { mode: "resume", scenario: "custom" }],
      ["constructor_result_view", { edited: false }],
    ]);
  });

  it("не передаёт названия, ID и числовые параметры проекта", () => {
    const { send, journey, project } = setup();
    const next = cloneValue(project);
    next.name = "Частный адрес и название"; next.rooms[0].name = "Секретная комната"; next.rooms[0].widthMm = 4321;
    journey.observe(next); journey.resultView(); journey.export("pdf");
    const payload = JSON.stringify(send.mock.calls);
    for (const value of [next.name, next.rooms[0].name, next.id, next.rooms[0].id, "4321"]) expect(payload).not.toContain(value);
  });

  it("не считает результат и экспорт до открытия проекта", () => {
    const send = vi.fn<typeof trackEvent>();
    const journey = new ConstructorJourney(send);
    journey.resultView(); journey.export("pdf");
    expect(send).not.toHaveBeenCalled();
  });
});

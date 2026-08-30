import { describe, expect, it } from "vitest";
import { RENOVATION_SCENARIOS, type RenovationScenarioId } from "./scenarios";

const ROOM_SCENARIOS: RenovationScenarioId[] = ["bathroom", "kitchen", "room"];

describe("renovation calendar scenario links", () => {
  it.each(ROOM_SCENARIOS)("preserves the %s room pack in master links", (scenarioId) => {
    const masterLinks = RENOVATION_SCENARIOS[scenarioId].stages
      .flatMap((stage) => stage.links)
      .filter((link) => link.type === "master");

    expect(masterLinks.length).toBeGreaterThan(0);
    expect(masterLinks.every((link) => link.href === `/instrumenty/moy-remont/?pack=${scenarioId}`)).toBe(true);
  });
});

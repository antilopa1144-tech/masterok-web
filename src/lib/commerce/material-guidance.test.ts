import { describe, expect, it } from "vitest";
import { getMaterialGuidance } from "./material-guidance";

describe("getMaterialGuidance", () => {
  it("returns label checks for a procurement pilot calculator", () => {
    expect(getMaterialGuidance("tile-adhesive")).toEqual(expect.objectContaining({
      checks: expect.arrayContaining([expect.stringContaining("формат плитки")]),
    }));
  });

  it("does not invent advice for a calculator outside the pilot", () => {
    expect(getMaterialGuidance("foundation-slab")).toBeNull();
  });
});

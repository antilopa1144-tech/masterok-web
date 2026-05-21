import { describe, expect, it } from "vitest";
import { formatStageDateRange } from "./storage";

describe("formatStageDateRange", () => {
  it("formats a single day", () => {
    const s = formatStageDateRange("2026-06-01", 5, 5);
    expect(s).toBeTruthy();
    expect(s).not.toContain("—");
  });

  it("formats a range", () => {
    const s = formatStageDateRange("2026-06-01", 0, 14);
    expect(s).toContain("—");
  });

  it("returns null without start date", () => {
    expect(formatStageDateRange(null, 0, 7)).toBeNull();
  });
});

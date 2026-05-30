import { describe, expect, it } from "vitest";
import { isMikhalychAgentEnabled } from "./run";

describe("isMikhalychAgentEnabled", () => {
  it("включён по умолчанию", () => {
    const prev = process.env.MIKHALYCH_AGENT_ENABLED;
    delete process.env.MIKHALYCH_AGENT_ENABLED;
    expect(isMikhalychAgentEnabled()).toBe(true);
    process.env.MIKHALYCH_AGENT_ENABLED = prev;
  });

  it("выключается явным false", () => {
    const prev = process.env.MIKHALYCH_AGENT_ENABLED;
    process.env.MIKHALYCH_AGENT_ENABLED = "false";
    expect(isMikhalychAgentEnabled()).toBe(false);
    process.env.MIKHALYCH_AGENT_ENABLED = prev;
  });
});

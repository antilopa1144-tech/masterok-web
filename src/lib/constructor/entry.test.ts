import { describe, expect, it } from "vitest";
import { parseConstructorEntry, projectStartHref, scenarioHref } from "./entry";

describe("Own-project entry and ready examples", () => {
  it("makes an explicit own-project request, with an optional validated scenario", () => {
    expect(parseConstructorEntry(new URL(projectStartHref(), "https://getmasterok.ru").search)).toMatchObject({ newProject: true, scenario: undefined });
    expect(parseConstructorEntry(new URL(projectStartHref("bathroom"), "https://getmasterok.ru").search)).toMatchObject({ newProject: true, scenario: "bathroom" });
  });
  it("keeps direct examples and saved-project links out of setup", () => {
    expect(parseConstructorEntry(new URL(scenarioHref("bathroom"), "https://getmasterok.ru").search)).toMatchObject({ newProject: false, scenario: "bathroom" });
    expect(parseConstructorEntry("?project=project-example")).toMatchObject({ newProject: false, projectId: "project-example" });
  });
  it("accepts only the explicit setup flag and known scenarios", () => {
    expect(parseConstructorEntry("?new=true&start=unknown")).toMatchObject({ newProject: false, scenario: undefined });
    expect(parseConstructorEntry(`?project=${"x".repeat(151)}`)).toMatchObject({ projectId: undefined });
  });
});

import { trackEvent } from "@/lib/analytics";
import type { ConstructorProject } from "./core";
import type { ConstructorScenario } from "./entry";

/** Visit-local milestones. Project identifiers and contents never leave this object. */
export class ConstructorJourney {
  private project?: ConstructorProject;
  private started = false;
  private dimensions = false;
  private surfaces = new Set<"floor" | "walls">();
  private viewed?: "demo" | "edited";

  constructor(private readonly send: typeof trackEvent = trackEvent) {}

  open(project: ConstructorProject, mode: "new" | "resume" | "import", scenario: ConstructorScenario | "custom" = "custom") {
    if (this.project?.id === project.id) return;
    this.project = project;
    this.started = false;
    this.dimensions = false;
    this.surfaces.clear();
    this.viewed = undefined;
    this.send("constructor_open", { mode, scenario });
  }

  observe(project: ConstructorProject) {
    const previous = this.project;
    if (!previous || previous.id !== project.id) return;
    this.project = project;
    if (JSON.stringify(previous.rooms) === JSON.stringify(project.rooms)) return;
    const dimensionsChanged = project.rooms.some((room) => {
      const before = previous.rooms.find((item) => item.id === room.id);
      return before && (before.widthMm !== room.widthMm || before.lengthMm !== room.lengthMm || before.heightMm !== room.heightMm);
    });
    const changedSurfaces = (["floor", "walls"] as const).filter((surface) => project.rooms.some((room) => {
      const before = previous.rooms.find((item) => item.id === room.id);
      if (!before) return false;
      return surface === "floor"
        ? JSON.stringify(before.floor) !== JSON.stringify(room.floor)
        : JSON.stringify([before.wallTiles, before.continuousWallTiles]) !== JSON.stringify([room.wallTiles, room.continuousWallTiles]);
    }));
    if (!this.started) {
      this.started = true;
      this.send("constructor_start", { action: dimensionsChanged ? "dimensions" : changedSurfaces.length ? "material" : "other" });
    }
    if (dimensionsChanged && !this.dimensions) {
      this.dimensions = true;
      this.send("constructor_dimensions_change", {});
    }
    for (const surface of changedSurfaces) {
      if (this.surfaces.has(surface)) continue;
      this.surfaces.add(surface);
      this.send("constructor_material_change", { surface });
    }
  }

  resultView() {
    if (!this.project || this.viewed === "edited" || (this.viewed === "demo" && !this.started)) return;
    this.viewed = this.started ? "edited" : "demo";
    this.send("constructor_result_view", { edited: this.started });
  }

  export(format: "png" | "pdf" | "xlsx" | "project") {
    if (this.project) this.send("constructor_export", { format });
  }
}

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { TOOL_CONFIGS } from "@/lib/tools/config";

const STANDARD_ANALYTICS_ENTRYPOINTS: Record<string, string> = {
  "rasstanovka-svetilnikov":
    "src/app/instrumenty/rasstanovka-svetilnikov/LightingLayoutPlanner.tsx",
  "raskladka-reek": "src/app/instrumenty/raskladka-reek/WallSlatPlanner.tsx",
  "raskladka-terrasnoy-doski":
    "src/app/instrumenty/raskladka-terrasnoy-doski/DeckLayoutPlanner.tsx",
  "raskladka-trotuarnoy-plitki":
    "src/app/instrumenty/raskladka-trotuarnoy-plitki/PaverLayoutPlanner.tsx",
  "lineynyy-raskroy": "src/app/instrumenty/lineynyy-raskroy/LinearCutPlanner.tsx",
  "moy-remont": "src/app/instrumenty/moy-remont/RoomMasterWizard.tsx",
  "kalendar-remonta": "src/app/instrumenty/kalendar-remonta/RenovationCalendar.tsx",
  "stoimost-remonta":
    "src/app/instrumenty/stoimost-remonta/RenovationCostCalculator.tsx",
  "raskladka-plitki": "src/app/instrumenty/raskladka-plitki/TileLayoutGenerator.tsx",
  "raskladka-kirpicha":
    "src/app/instrumenty/raskladka-kirpicha/BrickworkGenerator.tsx",
  "raskladka-laminata":
    "src/app/instrumenty/raskladka-laminata/LaminateLayoutGenerator.tsx",
  "raskladka-oboev": "src/app/instrumenty/raskladka-oboev/WallpaperLayoutGenerator.tsx",
  "raskladka-listov": "src/app/instrumenty/raskladka-listov/SheetLayoutGenerator.tsx",
  "normy-raskhoda": "src/components/tools/ConsumptionNormsExplorer.tsx",
  "sravnenie-materialov":
    "src/app/instrumenty/sravnenie-materialov/MaterialComparison.tsx",
  "skolko-ostalos": "src/app/instrumenty/skolko-ostalos/ReverseCalculator.tsx",
  "tajmer-skhvatyvaniya": "src/app/instrumenty/tajmer-skhvatyvaniya/CuringTimer.tsx",
  konverter: "src/app/instrumenty/konverter/page.tsx",
  "ploshchad-komnaty": "src/app/instrumenty/ploshchad-komnaty/page.tsx",
  kalkulyator: "src/components/tools/QuickCalculator.tsx",
};

const CHECKLIST_ANALYTICS_ENTRYPOINTS = [
  "src/app/instrumenty/chek-listy/[slug]/InteractiveChecklist.tsx",
  "src/app/instrumenty/chek-listy/[slug]/PrintButton.tsx",
];

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("tool analytics coverage", () => {
  it("assigns an analytics contract to every published tool", () => {
    const coveredSlugs = [...Object.keys(STANDARD_ANALYTICS_ENTRYPOINTS), "chek-listy"].sort();
    const publishedSlugs = TOOL_CONFIGS.map((tool) => tool.slug).sort();

    expect(coveredSlugs).toEqual(publishedSlugs);
  });

  it.each(Object.entries(STANDARD_ANALYTICS_ENTRYPOINTS))(
    "%s uses the common start-to-result funnel",
    (_slug, sourcePath) => {
      expect(readSource(sourcePath)).toContain("useToolAnalytics(");
    },
  );

  it("keeps the dedicated checklist progress and export funnel", () => {
    const source = CHECKLIST_ANALYTICS_ENTRYPOINTS.map(readSource).join("\n");

    expect(source).toContain("trackChecklistStart(");
    expect(source).toContain("trackChecklistProgress(");
    expect(source).toContain("trackChecklistExport(");
  });
});

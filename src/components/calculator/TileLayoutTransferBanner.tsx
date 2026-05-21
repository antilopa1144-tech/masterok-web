"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TILE_LAYOUT_TRANSFER_FROM } from "@/lib/tools/tile-layout-to-calc";
import { getScenarioForCalculator } from "@/lib/renovation-hub/context";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";

export default function TileLayoutTransferBanner() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  if (from !== TILE_LAYOUT_TRANSFER_FROM) return null;

  const tilesHint = searchParams.get("tilesHint");
  const scenarioId = getScenarioForCalculator("plitka") ?? "bathroom";

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span aria-hidden>📐</span>
          <span>
            Параметры из{" "}
            <Link
              href="/instrumenty/raskladka-plitki/"
              className="font-semibold underline hover:text-blue-800 dark:hover:text-blue-200"
            >
              раскладки плитки
            </Link>
            {tilesHint ? (
              <>
                {" "}
                — по схеме <strong>{tilesHint} шт</strong> плитки; проверьте площадь и схему, затем «Посчитать».
              </>
            ) : (
              <> — проверьте площадь и схему, затем нажмите «Посчитать».</>
            )}
          </span>
        </p>
      </div>
      <RenovationHubStrip scenarioId={scenarioId} showTileLayout compact />
    </div>
  );
}

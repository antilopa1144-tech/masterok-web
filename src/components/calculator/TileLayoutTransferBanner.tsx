"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  buildTileLayoutHref,
  TILE_LAYOUT_TRANSFER_FROM,
} from "@/lib/tools/tile-layout-to-calc";
import type { LayoutMode } from "@/lib/tools/tile-layout";
import { getScenarioForCalculator } from "@/lib/renovation-hub/context";
import { trackCalculatorRelatedClick } from "@/lib/analytics";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";

export default function TileLayoutTransferBanner() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  if (from !== TILE_LAYOUT_TRANSFER_FROM) return null;

  const tilesHint = searchParams.get("tilesHint");
  const reserveHint = searchParams.get("reserveHint");
  const packagingSource = searchParams.get("packagingSource");
  const tilesPerBox = Number(searchParams.get("layoutTilesPerBox"));
  const packAreaM2 = Number(searchParams.get("packArea"));
  const layoutModes: LayoutMode[] = ["straight", "offset-half", "offset-third", "diagonal"];
  const requestedLayoutMode = searchParams.get("layoutMode") as LayoutMode | null;
  const surfaceW = Number(searchParams.get("layoutSurfaceW"));
  const surfaceH = Number(searchParams.get("layoutSurfaceH"));
  const tileW = Number(searchParams.get("tileWidth"));
  const tileH = Number(searchParams.get("tileHeight"));
  const groutMm = Number(searchParams.get("jointWidth"));
  const hasOpening = searchParams.get("layoutHasOpening") === "1";
  const openingW = Number(searchParams.get("layoutOpeningW"));
  const openingH = Number(searchParams.get("layoutOpeningH"));
  const openingOffsetLeft = Number(searchParams.get("layoutOpeningOffsetLeft"));
  const returnHref = surfaceW > 0 && surfaceH > 0
    ? buildTileLayoutHref({
        surfaceW,
        surfaceH,
        tileW: tileW > 0 ? tileW : 300,
        tileH: tileH > 0 ? tileH : 300,
        groutMm: groutMm > 0 ? groutMm : 2,
        layoutMode: requestedLayoutMode && layoutModes.includes(requestedLayoutMode)
          ? requestedLayoutMode
          : "straight",
        packAreaM2: packAreaM2 > 0 ? packAreaM2 : undefined,
        tilesPerBox: tilesPerBox > 0 ? tilesPerBox : undefined,
        packagingSource: packagingSource === "label" ? "label" : "estimated",
        reservePercent: reserveHint != null ? Number(reserveHint) : undefined,
        hasOpening: hasOpening && openingW > 0 && openingH > 0,
        openingW: openingW > 0 ? openingW : undefined,
        openingH: openingH > 0 ? openingH : undefined,
        openingOffsetLeft: openingOffsetLeft >= 0 ? openingOffsetLeft : undefined,
      })
    : "/instrumenty/raskladka-plitki/";
  const scenarioId = getScenarioForCalculator("plitka") ?? "bathroom";

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span aria-hidden>📐</span>
          <span>
            Параметры из{" "}
            <Link
              href={returnHref}
              onClick={() => trackCalculatorRelatedClick("plitka", "raskladka-plitki")}
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
        <div className="mt-2 space-y-1 border-t border-blue-200/70 pt-2 text-xs leading-relaxed dark:border-blue-800/60">
          <p>
            Фасовка: {packagingSource === "label" && tilesPerBox > 0
              ? <><strong>{tilesPerBox} шт./кор.</strong> по этикетке — перенесено в точный режим.</>
              : <>предварительная оценка по площади коробки; перед покупкой проверьте этикетку коллекции.</>}
          </p>
          {reserveHint != null && (
            <p>
              В раскладке выбран запас <strong>{reserveHint}%</strong>. Здесь запас определяется отдельно по способу укладки, формату и сложности помещения, поэтому итог может отличаться.
            </p>
          )}
        </div>
      </div>
      <RenovationHubStrip scenarioId={scenarioId} showTileLayout compact />
    </div>
  );
}

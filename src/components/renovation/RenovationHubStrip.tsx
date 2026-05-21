"use client";

import Link from "next/link";
import type { RenovationScenarioId } from "@/lib/renovation-calendar/scenarios";
import type { RoomPackId } from "@/lib/room-master/packs";
import { calendarHref, masterHref } from "@/lib/renovation-hub/context";

export interface RenovationHubStripProps {
  /** Сценарий календаря (ванная, кухня, …). */
  scenarioId?: RenovationScenarioId | null;
  /** Пакет мастера — если не задан, берётся из scenarioId. */
  packId?: RoomPackId | null;
  /** Показать ссылку на раскладку плитки. */
  showTileLayout?: boolean;
  /** Компактный вид в одну строку. */
  compact?: boolean;
  className?: string;
}

const PILL =
  "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold no-underline transition-opacity hover:opacity-90";

export default function RenovationHubStrip({
  scenarioId,
  packId,
  showTileLayout = false,
  compact = false,
  className = "",
}: RenovationHubStripProps) {
  const pack = packId ?? (scenarioId && scenarioId !== "apartment" ? scenarioId : null);
  const cal = calendarHref(scenarioId);
  const master = masterHref(pack ?? undefined);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40 p-3 sm:p-4 ${className}`}
    >
      <p className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${compact ? "mb-2" : "mb-3"}`}>
        Дальше по ремонту
      </p>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "gap-y-2"}`}>
        <Link href={master} className={`${PILL} bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200`}>
          📦 Мастер закупки
        </Link>
        <Link href={cal} className={`${PILL} bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200`}>
          📅 Календарь этапов
        </Link>
        <Link href="/proekty/" className={`${PILL} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200`}>
          🗂️ Мой ремонт
        </Link>
        {showTileLayout && (
          <Link
            href="/instrumenty/raskladka-plitki/"
            className={`${PILL} bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200`}
          >
            🔲 Раскладка
          </Link>
        )}
        <Link
          href="/instrumenty/tajmer-skhvatyvaniya/"
          className={`${PILL} bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200`}
        >
          ⏱️ Таймер
        </Link>
      </div>
    </div>
  );
}

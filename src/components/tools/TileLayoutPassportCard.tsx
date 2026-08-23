import type { ReactNode } from "react";
import type { TileLayoutPassport } from "@/lib/tools/tile-layout-export";

interface TileLayoutPassportCardProps {
  passport: TileLayoutPassport;
  visual?: ReactNode;
  compact?: boolean;
  stacked?: boolean;
  className?: string;
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits });
}

export default function TileLayoutPassportCard({
  passport,
  visual,
  compact = false,
  stacked = false,
  className = "",
}: TileLayoutPassportCardProps) {
  const precisePackaging = passport.packagingSource === "label";

  return (
    <section
      data-testid={compact ? "tile-saved-project-passport" : "tile-project-passport"}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`.trim()}
      aria-label={`Паспорт проекта ${passport.title}`}
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-accent-50/90 via-white to-white px-4 py-3 dark:border-slate-800 dark:from-accent-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">Паспорт раскладки</p>
            <h3 className="mt-1 truncate text-base font-bold text-slate-950 dark:text-white">{passport.title}</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {passport.surface} · плитка {passport.tile} · {passport.layout.toLocaleLowerCase("ru-RU")}
              {passport.opening ? ` · проём ${passport.opening}` : ""}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${precisePackaging ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"}`}>
            {passport.packagingLabel}
          </span>
        </div>
      </div>

      <div className={`grid gap-3 p-3.5 ${visual && !stacked ? "sm:grid-cols-[minmax(150px,0.85fr)_minmax(0,1.4fr)]" : ""}`}>
        {visual && (
          <div className={`flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-stone-50 p-2 dark:border-slate-700 dark:bg-slate-950 [&>svg]:h-auto [&>svg]:w-full ${compact ? "min-h-24 [&>svg]:max-h-32" : "min-h-32 [&>svg]:max-h-44"}`}>
            {visual}
          </div>
        )}

        <div className="min-w-0">
          <dl className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
            {[
              ["Площадь", `${formatNumber(passport.areaM2)} м²`],
              ["Нужно", `${passport.requiredTiles} шт.`],
              ["Купить", `${passport.boxesToBuy} кор.`],
              ["Остаток", `${passport.leftoverTiles} шт.`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                <dt className="text-[9px] uppercase tracking-wide text-slate-400">{label}</dt>
                <dd data-testid={label === "Нужно" && !compact ? "tile-purchase-total" : undefined} className="mt-0.5 text-base font-black tabular-nums text-slate-950 dark:text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <div data-testid={!compact ? "tile-box-plan" : undefined} className={`mt-2.5 rounded-xl border px-3 py-2.5 ${precisePackaging ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/25" : "border-amber-200 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/25"}`}>
            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100">
              {passport.boxesToBuy} кор. × {passport.tilesPerBox} шт. = {passport.purchasedTiles} шт. к покупке
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
              По схеме {passport.schemeTiles} шт. + запас {passport.reserveTiles} шт. ({formatNumber(passport.reservePercent)}%). После укладки останется {passport.leftoverTiles} шт.
            </p>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="grid gap-2 border-t border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Плиточный клей</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">{passport.adhesiveHint}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Затирка</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">{passport.groutHint}</p>
          </div>
        </div>
      )}
    </section>
  );
}

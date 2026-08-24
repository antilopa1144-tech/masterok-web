"use client";

export interface CompactToolWorkspaceStage<TStage extends string> {
  value: TStage;
  shortLabel: string;
  label: string;
}

export interface CompactToolWorkspaceMetric {
  label: string;
  value: string;
  accent?: boolean;
}

export default function CompactToolWorkspaceNav<TStage extends string>({
  activeStage,
  ariaLabel,
  stages,
  metrics,
  onChange,
}: {
  activeStage: TStage;
  ariaLabel: string;
  stages: readonly CompactToolWorkspaceStage<TStage>[];
  metrics: readonly CompactToolWorkspaceMetric[];
  onChange: (stage: TStage) => void;
}) {
  return (
    <div className="sticky top-16 z-20 overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdf9]/95 shadow-[0_10px_32px_rgba(62,45,31,0.08)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:static">
      <nav aria-label={ariaLabel} className="grid grid-cols-3 border-b border-stone-200 dark:border-slate-700">
        {stages.map((stage, index) => {
          const isActive = activeStage === stage.value;
          return (
            <button
              key={stage.value}
              type="button"
              aria-current={isActive ? "step" : undefined}
              onClick={() => onChange(stage.value)}
              className={`group relative flex min-h-14 items-center justify-center gap-2 px-2 py-2 text-left transition-colors sm:min-h-16 sm:px-4 ${isActive ? "bg-orange-50/80 text-stone-950 dark:bg-orange-950/20 dark:text-white" : "text-stone-500 hover:bg-stone-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
            >
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isActive ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-300"}`}>{index + 1}</span>
              <span>
                <span className="block text-[11px] font-semibold sm:text-sm">{stage.shortLabel}</span>
                <span className="hidden text-[10px] font-normal text-stone-400 sm:block">{stage.label}</span>
              </span>
              {isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-orange-600" />}
            </button>
          );
        })}
      </nav>

      <div className={`grid divide-x divide-stone-100 px-1 py-2 dark:divide-slate-800 sm:px-3 sm:py-3 ${metrics.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 px-2 sm:px-3">
            <p className="truncate text-[9px] text-stone-400 sm:text-[10px]">{metric.label}</p>
            <p className={`mt-0.5 truncate text-sm font-bold sm:text-base ${metric.accent ? "text-orange-700 dark:text-orange-300" : "text-stone-950 dark:text-white"}`}>{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

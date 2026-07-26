export function ConstructionBlueprint() {
  return (
    <div
      className="theme-surface relative hidden min-h-[25rem] overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-[0_24px_70px_-42px_rgba(15,23,42,.45)] xl:block dark:border-slate-700"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-[0.34] dark:opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-slate-300) 1px, transparent 1px), linear-gradient(to bottom, var(--color-slate-300) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-accent-100/70 to-transparent dark:from-accent-900/15" />

      <div className="absolute left-5 top-5 rounded-full border border-accent-200 bg-accent-50/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-700 backdrop-blur dark:border-accent-800 dark:bg-accent-900/50 dark:text-accent-300">
        Схема расчёта
      </div>

      <svg viewBox="0 0 380 400" className="absolute inset-0 h-full w-full text-slate-700 dark:text-slate-300">
        <defs>
          <linearGradient id="sheet-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-accent-100)" />
            <stop offset="1" stopColor="var(--color-accent-300)" />
          </linearGradient>
          <linearGradient id="floor-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-slate-100)" />
            <stop offset="1" stopColor="var(--color-slate-200)" />
          </linearGradient>
          <filter id="blueprint-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#0f172a" floodOpacity=".12" />
          </filter>
        </defs>

        <path d="M48 311 169 343 331 289 212 260Z" fill="url(#floor-fill)" stroke="currentColor" strokeWidth="1.5" opacity=".92" />
        <path d="m169 343 0 16 162-57 0-13" fill="var(--color-slate-200)" stroke="currentColor" strokeWidth="1.5" />
        <path d="m48 311 0 15 121 33 0-16" fill="var(--color-slate-100)" stroke="currentColor" strokeWidth="1.5" />

        <g opacity=".4" stroke="currentColor" strokeWidth="1">
          <path d="m76 318 161-54M105 326l161-54M134 334l161-54" />
          <path d="m84 301 119 33M119 289l119 33M154 278l119 32M189 267l119 32" />
        </g>

        <path d="M82 287V125l130-44 0 179-43 83-87-24Z" fill="var(--theme-surface)" stroke="currentColor" strokeWidth="2" filter="url(#blueprint-shadow)" />
        <path d="M212 81 321 125v164l-109-29Z" fill="var(--theme-surface-muted)" stroke="currentColor" strokeWidth="2" />

        <g stroke="var(--color-accent-500)" strokeWidth="3" strokeLinecap="round">
          <path d="M96 283V130M125 291V120M154 299V110M183 307V100" />
          <path d="m91 136 112-38M91 279l112 30" />
        </g>

        <g stroke="currentColor" strokeWidth="1.4" opacity=".72">
          <path d="M228 255V101M258 263V113M288 271V125" />
          <path d="m221 110 91 36M221 151l91 35M221 192l91 35M221 233l91 35" />
        </g>

        <path d="m91 136 56-19v177l-56-15Z" fill="url(#sheet-fill)" stroke="var(--color-accent-700)" strokeWidth="2.2" />
        <path d="m147 117 56-19v211l-56-15Z" fill="var(--theme-surface)" stroke="var(--color-accent-500)" strokeWidth="2.2" strokeDasharray="5 4" />
        <circle cx="139" cy="142" r="3" fill="var(--color-accent-700)" />
        <circle cx="139" cy="190" r="3" fill="var(--color-accent-700)" />
        <circle cx="139" cy="238" r="3" fill="var(--color-accent-700)" />

        <g fill="none" stroke="var(--color-accent-600)" strokeWidth="1.4">
          <path d="M76 123V291" />
          <path d="m71 129 5-6 5 6M71 285l5 6 5-6" />
          <path d="M83 332 169 355" />
          <path d="m89 329-6 3 4 6M163 351l6 4-6 3" />
        </g>

        <g fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">
          <rect x="45" y="194" width="61" height="24" rx="12" fill="var(--theme-surface)" stroke="var(--color-accent-300)" />
          <text x="75.5" y="210" textAnchor="middle" fill="var(--color-accent-700)">2,7 м</text>
          <rect x="94" y="341" width="65" height="24" rx="12" fill="var(--theme-surface)" stroke="var(--color-accent-300)" />
          <text x="126.5" y="357" textAnchor="middle" fill="var(--color-accent-700)">5,0 м</text>
        </g>
      </svg>

      <div className="absolute bottom-5 right-5 w-[12.5rem] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>Пример результата</span>
          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">запас учтён</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <strong className="text-3xl leading-none text-slate-950 dark:text-white">19</strong>
          <span className="pb-0.5 text-sm font-semibold text-slate-600 dark:text-slate-300">листов</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-[78%] rounded-full bg-accent-500" />
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Точная площадь → количество к покупке</p>
      </div>
    </div>
  );
}

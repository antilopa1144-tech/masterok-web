"use client";

interface ToolSectionNavProps {
  visible: boolean;
  onParameters: () => void;
  onLayout: () => void;
  onResult: () => void;
}

/** Компактная навигация по длинному инструменту на мобильном экране. */
export default function ToolSectionNav({
  visible,
  onParameters,
  onLayout,
  onResult,
}: ToolSectionNavProps) {
  if (!visible) return null;

  return (
    <nav
      aria-label="Навигация по инструменту"
      className="sticky top-16 z-20 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:hidden"
    >
      <button type="button" onClick={onParameters} className="min-h-11 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-300">
        Параметры
      </button>
      <button type="button" onClick={onLayout} className="min-h-11 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-slate-300">
        Схема
      </button>
      <button type="button" onClick={onResult} className="min-h-11 rounded-lg bg-accent-500 px-2 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
        Итог ↓
      </button>
    </nav>
  );
}

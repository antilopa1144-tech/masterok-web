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
      <button type="button" onClick={onParameters} className="rounded-lg px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        Параметры
      </button>
      <button type="button" onClick={onLayout} className="rounded-lg px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        Схема
      </button>
      <button type="button" onClick={onResult} className="rounded-lg bg-accent-500 px-2 py-2 text-xs font-semibold text-white">
        Итог ↓
      </button>
    </nav>
  );
}

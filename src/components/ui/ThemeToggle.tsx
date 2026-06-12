'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  THEMES,
  applyThemeChoice,
  getStoredThemeChoice,
  storeThemeChoice,
  type ThemeChoice,
} from '@/lib/theme';

/** Двухцветный кружок-образец темы: фон + акцент */
function ThemeSwatch({ bg, accent }: { bg: string; accent: string }) {
  return (
    <span
      className="inline-block h-5 w-5 shrink-0 rounded-full border border-black/10 dark:border-white/20"
      style={{ background: `linear-gradient(135deg, ${bg} 50%, ${accent} 50%)` }}
      aria-hidden="true"
    />
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

/**
 * Пикер темы оформления (исторически назывался ThemeToggle —
 * имя сохранено, чтобы не менять импорты в Header).
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice>('system');
  const containerRef = useRef<HTMLDivElement>(null);

  // Инициализация: применяем сохранённый выбор и следим за системной темой
  useEffect(() => {
    setMounted(true);
    const stored = getStoredThemeChoice();
    setChoice(stored);
    applyThemeChoice(stored);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      // Реагируем только в авторежиме
      if (getStoredThemeChoice() === 'system') applyThemeChoice('system');
    };
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  // Закрытие по клику вне и по Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectChoice = useCallback((next: ThemeChoice) => {
    storeThemeChoice(next);
    setChoice(next);
    applyThemeChoice(next);
    setOpen(false);
  }, []);

  const buttonClass =
    'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:min-h-0 md:min-w-0';

  // SSR-заглушка без обработчиков — избегаем гидратационных ошибок
  if (!mounted) {
    return (
      <button className={buttonClass} aria-label="Выбрать тему оформления">
        <PaletteIcon />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
        aria-label="Выбрать тему оформления"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <PaletteIcon />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Тема оформления"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <button
            role="menuitemradio"
            aria-checked={choice === 'system'}
            onClick={() => selectChoice('system')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span
              className="inline-block h-5 w-5 shrink-0 rounded-full border border-black/10 dark:border-white/20"
              style={{ background: 'linear-gradient(135deg, #f8fafc 50%, #0f172a 50%)' }}
              aria-hidden="true"
            />
            <span className="flex-1">Системная</span>
            {choice === 'system' && <span aria-hidden="true">✓</span>}
          </button>

          <div className="mx-3 my-1 border-t border-slate-200 dark:border-slate-700" aria-hidden="true" />

          {THEMES.map((t) => (
            <button
              key={t.id}
              role="menuitemradio"
              aria-checked={choice === t.id}
              onClick={() => selectChoice(t.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ThemeSwatch bg={t.swatch.bg} accent={t.swatch.accent} />
              <span className="flex-1">{t.label}</span>
              {choice === t.id && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

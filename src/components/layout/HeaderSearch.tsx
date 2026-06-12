"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Данные поиска (каталог, инструменты, чек-листы) тянутся лениво
// вместе с панелью — шапка не тяжелеет, пока поиск не открыт.
const HeaderSearchPanel = dynamic(() => import("./HeaderSearchPanel"), {
  loading: () => (
    <div
      className="h-[52px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse"
      aria-hidden="true"
    />
  ),
});

/**
 * Поиск в шапке: иконка-кнопка, по клику (или клавише «/») открывается
 * панель с тем же поиском, что на главной. Работает на всех страницах.
 */
export default function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Закрываем панель при переходе на другую страницу
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Хоткей «/» — открыть поиск (если фокус не в поле ввода)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:min-h-0 md:min-w-0"
        aria-label="Поиск по сайту (клавиша /)"
        aria-expanded={open}
        title="Поиск (клавиша /)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <Suspense
            fallback={
              <div
                className="h-[52px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse"
                aria-hidden="true"
              />
            }
          >
            <HeaderSearchPanel />
          </Suspense>
          <p className="mt-2 px-1 text-xs text-slate-400 dark:text-slate-500">
            Калькуляторы, инструменты, чек-листы · Esc — закрыть
          </p>
        </div>
      )}
    </div>
  );
}

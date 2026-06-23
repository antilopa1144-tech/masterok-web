"use client";

/* eslint-disable @next/next/no-img-element -- noscript tracking pixel must stay a plain img */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const YM_COUNTER = process.env.NEXT_PUBLIC_YM_COUNTER || "108155444";

declare global {
  interface Window {
    ym?: (id: number, action: string, url?: string) => void;
  }
}

/** Компонент отправляет хит при смене страницы (SPA-навигация) */
export default function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Первый хит (лендинг) уже отправляет сам ym("init") — без defer:true он шлёт
  // автоматический pageview. Поэтому здесь пропускаем самый первый рендер, иначе
  // первая страница считается дважды (завышает просмотры, ломает отказы).
  const skipFirst = useRef(true);

  useEffect(() => {
    if (!YM_COUNTER) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    window.ym?.(Number(YM_COUNTER), "hit", url);
  }, [pathname, searchParams]);

  return null;
}

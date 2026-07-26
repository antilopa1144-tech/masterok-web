"use client";

/* eslint-disable @next/next/no-img-element -- noscript tracking pixel must stay a plain img */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";
import { scheduleMetrikaPageview } from "@/lib/analytics/yandex-metrika-pageview";

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

/** Компонент отправляет хит при смене страницы (SPA-навигация) */
export default function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrl = useRef("");

  useEffect(() => {
    if (!YANDEX_METRIKA_COUNTER_ID) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    const referer = previousUrl.current || document.referrer;
    previousUrl.current = url;

    return scheduleMetrikaPageview({
      readTitle: () => document.title,
      send: (title) => {
        window.ym?.(YANDEX_METRIKA_COUNTER_ID, "hit", url, {
          title,
          referer,
        });
      },
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (timerId) => window.clearTimeout(timerId),
    });
  }, [pathname, searchParams]);

  return null;
}

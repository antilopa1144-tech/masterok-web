"use client";

/* eslint-disable @next/next/no-img-element -- noscript tracking pixel must stay a plain img */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GOOGLE_ANALYTICS_ID, YANDEX_METRIKA_COUNTER_ID } from "@/lib/analytics/config";
import { isProductionAnalyticsBrowser } from "@/lib/analytics/runtime";
import { scheduleMetrikaPageview } from "@/lib/analytics/yandex-metrika-pageview";

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/** Компонент отправляет хиты в Метрику и GA4 при смене страницы (SPA-навигация). */
export default function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrl = useRef("");

  useEffect(() => {
    if (!isProductionAnalyticsBrowser()) return;
    if (!YANDEX_METRIKA_COUNTER_ID && !GOOGLE_ANALYTICS_ID) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    const referer = previousUrl.current || document.referrer;
    previousUrl.current = url;

    return scheduleMetrikaPageview({
      readTitle: () => document.title,
      send: (title) => {
        if (YANDEX_METRIKA_COUNTER_ID) {
          window.ym?.(YANDEX_METRIKA_COUNTER_ID, "hit", url, {
            title,
            referer,
          });
        }
        if (GOOGLE_ANALYTICS_ID) {
          window.gtag?.("event", "page_view", {
            page_location: window.location.href,
            page_path: url,
            page_title: title,
          });
        }
      },
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (timerId) => window.clearTimeout(timerId),
    });
  }, [pathname, searchParams]);

  return null;
}

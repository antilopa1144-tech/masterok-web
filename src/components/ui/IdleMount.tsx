"use client";

import { useState, useEffect, type ReactNode } from "react";

/**
 * Монтирует детей только после простоя браузера (requestIdleCallback), а не во
 * время начальной гидрации. Для некритичных оверлеев (плавающие кнопки),
 * которые не нужны для первого экрана и первого взаимодействия — убирает их
 * из критической длинной задачи гидрации, снижая TBT.
 *
 * Безопасно для CLS: оборачиваемые виджеты — position:fixed, поэтому их позднее
 * появление не сдвигает контент. На сервере и при первом клиентском рендере
 * возвращает null (детей в SSR нет — это осознанно, они появляются на idle).
 */
export default function IdleMount({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  return ready ? <>{children}</> : null;
}

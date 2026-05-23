"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Становится true, когда элемент попадает во viewport (с запасом rootMargin).
 * Для отложенной загрузки тяжёлого клиентского JS на мобиле и вне экрана.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  options?: { rootMargin?: string; once?: boolean },
): boolean {
  const { rootMargin = "400px", once = true } = options ?? {};
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          if (once) observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, once]);

  return near;
}

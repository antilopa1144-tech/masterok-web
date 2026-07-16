"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  trackToolModeChange,
  trackToolResultView,
  trackToolStart,
  type ToolInteractionSource,
} from "@/lib/analytics";

/**
 * Единая воронка визуального инструмента: первое осмысленное действие →
 * просмотр результата. Автоматический результат при загрузке не считаем
 * завершением, пока пользователь не изменил параметры.
 */
export function useToolAnalytics(
  tool: string,
  resultRef: RefObject<HTMLElement | null>,
) {
  const hasStartedRef = useRef(false);
  const hasTrackedResultRef = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);

  const markStarted = useCallback(
    (source: ToolInteractionSource) => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;
      setHasStarted(true);
      trackToolStart(tool, source);
    },
    [tool],
  );

  const selectMode = useCallback(
    (mode: string) => {
      markStarted("layout_mode");
      trackToolModeChange(tool, mode);
    },
    [markStarted, tool],
  );

  useEffect(() => {
    if (!hasStarted || hasTrackedResultRef.current) return;
    const element = resultRef.current;
    if (!element) return;

    const markResultViewed = () => {
      if (hasTrackedResultRef.current) return;
      hasTrackedResultRef.current = true;
      trackToolResultView(tool);
    };

    if (!("IntersectionObserver" in window)) {
      markResultViewed();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        markResultViewed();
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasStarted, resultRef, tool]);

  return { hasStarted, markStarted, selectMode };
}

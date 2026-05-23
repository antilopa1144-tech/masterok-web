"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ViewportDeferredProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
  minHeight?: string | number;
}

/**
 * Монтирует children только при приближении к viewport — не тянет JS до скролла.
 */
export default function ViewportDeferred({
  children,
  fallback = null,
  rootMargin = "400px",
  className,
  minHeight,
}: ViewportDeferredProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={minHeight !== undefined ? { minHeight } : undefined}
    >
      {active ? children : fallback}
    </div>
  );
}

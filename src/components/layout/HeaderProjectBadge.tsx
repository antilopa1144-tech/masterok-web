"use client";

import { useEffect, useState } from "react";
import { getProjects } from "@/lib/storage/projects";

/** Счётчик сохранённых проектов в шапке (только если есть хотя бы один). */
export default function HeaderProjectBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getProjects().then((items) => {
      if (!cancelled) setCount(items.length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count == null || count < 1) return null;

  return (
    <span
      className="ml-1 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums"
      aria-label={`${count} проектов`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

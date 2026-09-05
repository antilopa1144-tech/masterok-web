"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { ARTICLE_VIEWS_URL, articleVisitor, validViewCount } from "@/lib/article-views";

export default function ArticleViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let registered = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setViews(null);
    const url = `${ARTICLE_VIEWS_URL}${encodeURIComponent(slug)}/`;
    const request = async (visitor?: string) => {
      try {
        const response = await fetch(url, {
          method: visitor ? "POST" : "GET",
          ...(visitor ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitor }) } : {}),
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.timeout(6000),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!disposed && validViewCount(data.views)) {
          // A slow initial GET must not overwrite the more recent POST result.
          setViews(previous => Math.max(previous ?? 0, data.views));
        }
      } catch { /* Analytics must never break reading or display a fictitious zero. */ }
    };
    void request();
    const schedule = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible" || registered || navigator.doNotTrack === "1") return;
      timer = setTimeout(() => {
        if (disposed || document.visibilityState !== "visible") return;
        registered = true;
        try {
          const visitor = articleVisitor(window.localStorage, slug);
          if (visitor) void request(visitor);
        } catch { /* localStorage itself can be unavailable. */ }
      }, 2000);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [slug]);

  return (
    <span className="inline-flex min-w-[8rem] items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
      title="Просмотры с момента запуска счётчика. Повторное открытие в одном браузере в течение 30 минут не добавляет просмотр. Это не число уникальных людей."
      data-testid="article-views">
      {views !== null && <><Eye size={14} aria-hidden="true" /><span>Просмотры: {views.toLocaleString("ru-RU")}</span></>}
    </span>
  );
}

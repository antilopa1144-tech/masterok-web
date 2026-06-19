"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Sentiment = "like" | "neutral" | "dislike";
type Status = "idle" | "sending" | "sent" | "error";

const SENTIMENTS: { id: Sentiment; emoji: string; label: string }[] = [
  { id: "like", emoji: "👍", label: "Нравится" },
  { id: "neutral", emoji: "😐", label: "Нормально" },
  { id: "dislike", emoji: "👎", label: "Не то" },
];

/** Глобальное событие — открыть виджет из футера или откуда угодно. */
export const OPEN_FEEDBACK_EVENT = "masterok:open-feedback";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Открытие по глобальному событию (ссылка в футере)
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen);
  }, []);

  // Фокус на поле при открытии
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  // Закрытие по клику вне и по Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
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

  const reset = useCallback(() => {
    setSentiment(null);
    setMessage("");
    setContact("");
    setCompany("");
    setStatus("idle");
    setErrorText("");
  }, []);

  const submit = useCallback(async () => {
    if (message.trim().length < 2) {
      setErrorText("Напишите пару слов — что улучшить?");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrorText("");

    let theme = "system";
    try {
      theme = document.documentElement.getAttribute("data-theme") ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    } catch { /* no-op */ }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentiment,
          message,
          contact,
          company, // honeypot
          pageUrl: typeof location !== "undefined" ? location.href : "",
          pageTitle: typeof document !== "undefined" ? document.title : "",
          viewport: typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "",
          theme,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok) {
        setStatus("sent");
        setTimeout(() => {
          setOpen(false);
          // даём анимации закрыться, потом сбрасываем
          setTimeout(reset, 300);
        }, 2200);
      } else {
        setErrorText(data.error ?? "Не удалось отправить. Попробуйте позже.");
        setStatus("error");
      }
    } catch {
      setErrorText("Нет связи с сервером. Попробуйте позже.");
      setStatus("error");
    }
  }, [message, sentiment, contact, company, reset]);

  return (
    <>
      {/* Плавающая кнопка — слева снизу (справа занято кнопкой «Наверх») */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Оставить отзыв"
        aria-expanded={open}
        className="fixed z-40 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-accent-700 shadow-lg transition-all hover:border-accent-300 hover:shadow-xl hover:-translate-y-0.5 left-[calc(1rem+env(safe-area-inset-left,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:left-[calc(1.5rem+env(safe-area-inset-left,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] dark:border-accent-700/50 dark:bg-slate-800 dark:text-accent-300"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>Отзыв</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Обратная связь"
          className="fixed z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white shadow-2xl left-[calc(0.75rem+env(safe-area-inset-left,0px))] bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:left-[calc(1.5rem+env(safe-area-inset-left,0px))] sm:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] dark:border-slate-700 dark:bg-slate-800 overflow-hidden scale-in"
        >
          {/* Шапка в стиле чата */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-br from-accent-50 to-white px-4 py-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-600 text-base text-white shadow" aria-hidden>🔧</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Обратная связь</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Читаю лично — отвечу, если оставите контакт</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {status === "sent" ? (
            <div className="px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/40" aria-hidden>✓</div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Спасибо! Получил 🔧</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Каждый отзыв реально читаю и правлю по нему сайт.</p>
            </div>
          ) : (
            <div className="px-4 py-3.5 space-y-3">
              {/* Тон одним тапом */}
              <div className="flex gap-2">
                {SENTIMENTS.map((s) => {
                  const active = sentiment === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSentiment(active ? null : s.id)}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 text-xs font-medium transition-all ${
                        active
                          ? "border-accent-400 bg-accent-50 text-accent-800 dark:border-accent-500 dark:bg-accent-900/30 dark:text-accent-200"
                          : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                      }`}
                      aria-pressed={active}
                    >
                      <span className="text-lg" aria-hidden>{s.emoji}</span>
                      {s.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => { setMessage(e.target.value); if (status === "error") setStatus("idle"); }}
                rows={3}
                maxLength={2000}
                placeholder="Что улучшить? Чего не хватает? Нашли ошибку в расчёте — где и какую?"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />

              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={200}
                placeholder="Контакт для ответа — необязательно (e-mail / телеграм)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />

              {/* Honeypot — скрыто от людей, видно ботам */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              {status === "error" && errorText && (
                <p className="text-xs text-red-600 dark:text-red-400">{errorText}</p>
              )}

              <button
                onClick={submit}
                disabled={status === "sending"}
                className="btn-primary w-full text-sm disabled:opacity-60"
              >
                {status === "sending" ? "Отправляю…" : "Отправить"}
              </button>
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                Анонимно. Прикрепим только страницу, с которой пишете.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

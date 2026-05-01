"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import MarkdownContent from "./MarkdownContent";
import {
  SYSTEM_PROMPT,
  MIKHALYCH_API_URL,
  checkRateLimit,
  getApiHeaders,
} from "@/lib/mikhalych";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  starterQuestions?: string[];
}

export default function MikhalychChat({ starterQuestions = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Привет! Я Михалыч — строительный ИИ-мастер. Задавай любой вопрос: расчёт материалов, технология монтажа, выбор инструмента. Постараюсь помочь по делу.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  const startTyping = (fullContent: string) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setTyping(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let shown = 0;
    const total = fullContent.length;
    const charsPerTick = Math.max(2, Math.ceil(total / 220));

    typingTimerRef.current = setInterval(() => {
      shown = Math.min(total, shown + charsPerTick);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: fullContent.slice(0, shown) };
        }
        return copy;
      });
      if (shown >= total) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setTyping(false);
      }
    }, 18);
  };

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: typing ? "auto" : "smooth" });
  }, [messages, loading, typing]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || typing) return;

      const rateLimitError = checkRateLimit();
      if (rateLimitError) {
        setError(rateLimitError);
        return;
      }

      const userMsg: Message = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const apiMessages = [...messages, userMsg].slice(-10);

        const response = await fetch(MIKHALYCH_API_URL, {
          method: "POST",
          headers: getApiHeaders(),
          signal: controller.signal,
          body: JSON.stringify({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0.15,
            presence_penalty: 0.1,
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          // Извлекаем детали ошибки от OpenRouter — это помогает диагностировать
          // проблемы с моделью/параметрами, не лазая в логи Timeweb.
          let detail = "";
          try {
            const errorBody = await response.json();
            detail = errorBody?.error?.message ?? errorBody?.message ?? "";
          } catch { /* non-JSON — ничего не добавляем */ }
          const base = `Ошибка AI-сервиса (${response.status}). Попробуйте позже.`;
          throw new Error(detail ? `${base} ${detail}` : base);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("Пустой ответ от AI");
        }

        startTyping(content);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Не удалось получить ответ. Проверьте соединение.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, typing]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="card flex flex-col overflow-hidden" style={{ height: "640px" }}>
      {/* История сообщений */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                msg.role === "assistant"
                  ? "bg-accent-500 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
              aria-hidden="true"
            >
              {msg.role === "assistant" ? "🤖" : "👷"}
            </div>

            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700"
                  : "bg-accent-500 text-white rounded-tr-none"
              }`}
            >
              {msg.role === "assistant" ? (
                <MarkdownContent content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-sm">
              🤖
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex items-center gap-1.5" aria-label="Михалыч думает...">
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700" role="alert">
            ⚠️ {error}
          </div>
        )}
      </div>

      {messages.length === 1 && starterQuestions.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-400 mb-2">Попробуйте спросить:</p>
          <div className="flex flex-wrap gap-2">
            {starterQuestions.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-xs bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full transition-colors text-left"
              >
                {q.length > 50 ? q.slice(0, 50) + "..." : q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
          <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите про материалы, технологию или расчёт..."
            className="min-h-[52px] flex-1 resize-none rounded-xl border-0 bg-white px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:bg-slate-900 dark:text-slate-100"
            rows={2}
            disabled={loading || typing}
            aria-label="Сообщение для Михалыча"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || typing}
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-accent-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Отправить"
          >
            <span className="hidden sm:inline">Отправить</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
          <div className="mt-1 flex items-center justify-between gap-3 px-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Enter — отправить</span>
            <span className="hidden text-[11px] text-slate-400 dark:text-slate-500 sm:inline">Shift+Enter — новая строка</span>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Ответы справочные. Для точных объёмов используйте{" "}
          <Link href="/" className="text-accent-600 hover:underline dark:text-accent-400">калькуляторы</Link>.
        </p>
      </div>
    </div>
  );
}


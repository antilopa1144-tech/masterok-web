"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import MarkdownContent from "./MarkdownContent";
import type { MikhalychChatResponse } from "@/lib/mikhalych";
import { checkRateLimit, streamMikhalychChat } from "@/lib/mikhalych";
import { MIKHALYCH_TOOL_STATUS } from "@/lib/mikhalych/tool-labels";
import MikhalychAgentExtras from "./MikhalychAgentExtras";

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
        "Я Михалыч. Спрашивай по стройке и материалам — могу сам прогнать расчёт через калькуляторы Мастерок и подсказать, сколько брать. Цены из сети — только с оговоркой, откуда смотрел.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [agentMeta, setAgentMeta] = useState<Pick<
    MikhalychChatResponse,
    "toolsUsed" | "calculatorLinks" | "projectEntries"
  > | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: loading ? "auto" : "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

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
      setAgentMeta(null);
      setStatusHint("Думаю…");

      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const apiMessages = [...messages, userMsg].slice(-10);

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        setLoading(false);

        const result = await streamMikhalychChat(
          {
            messages: apiMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          },
          {
            onStatus: (m) => setStatusHint(m),
            onToolStart: (tool) =>
              setStatusHint(MIKHALYCH_TOOL_STATUS[tool] ?? `Выполняю: ${tool}…`),
            onToolEnd: () => setStatusHint("Формирую ответ…"),
            onDelta: (delta) => {
              setStatusHint(null);
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    content: last.content + delta,
                  };
                }
                return copy;
              });
            },
          },
          controller.signal,
        );

        setAgentMeta({
          toolsUsed: result.toolsUsed,
          calculatorLinks: result.calculatorLinks,
          projectEntries: result.projectEntries,
        });
        setStatusHint(null);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Не удалось получить ответ. Проверьте соединение.";
        setError(msg);
      } finally {
        setLoading(false);
        setStatusHint(null);
      }
    },
    [messages, loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* История сообщений */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 space-y-4 sm:px-6 [scrollbar-gutter:stable]"
        role="log"
        aria-live="polite"
      >
        <div className="mx-auto w-full max-w-3xl space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {msg.role === "assistant" ? (
              <img src="/mikhalych-avatar.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover shrink-0" aria-hidden="true" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" aria-hidden="true">
                👷
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-2xl text-[15px] sm:text-sm leading-relaxed ${
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

        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-start gap-3">
            <img src="/mikhalych-avatar.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover shrink-0" aria-hidden="true" />
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
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <MikhalychAgentExtras
          statusHint={statusHint}
          toolsUsed={agentMeta?.toolsUsed}
          calculatorLinks={agentMeta?.calculatorLinks}
          projectEntries={agentMeta?.projectEntries}
        />
      </div>

      {messages.length === 1 && starterQuestions.length > 0 && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-2 sm:px-6">
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

      {/* Ввод прибит к низу. pb с safe-area для iPhone (нижняя «чёлка»). */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
          <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите про материалы, технологию или расчёт..."
            className="min-h-[52px] flex-1 resize-none rounded-xl border-0 bg-white px-3 py-3 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:bg-slate-900 dark:text-slate-100"
            rows={2}
            disabled={loading}
            aria-label="Сообщение для Михалыча"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
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
        <p className="mx-auto mt-2 w-full max-w-3xl text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Ответы справочные. Объёмы материалов Михалыч считает через{" "}
          <Link href="/" className="text-accent-600 hover:underline dark:text-accent-400">калькуляторы</Link>{" "}
          Мастерок.
        </p>
      </div>
    </div>
  );
}


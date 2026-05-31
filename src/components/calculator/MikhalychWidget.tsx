"use client";

import { useState, useRef, useEffect } from "react";
import MarkdownContent from "@/components/mikhalych/MarkdownContent";
import type { MikhalychChatResponse } from "@/lib/mikhalych";
import { checkRateLimit, streamMikhalychChat } from "@/lib/mikhalych";
import { MIKHALYCH_TOOL_STATUS } from "@/lib/mikhalych/tool-labels";
import MikhalychAgentExtras from "@/components/mikhalych/MikhalychAgentExtras";
import { MIKHALYCH_WIDGET_UI_TEXT as UI_TEXT, getMikhalychAssistantErrorMessage } from "./uiText";

interface Props {
  calculatorTitle: string;
  calcContext?: string;
  /** Готовый авто-разбор расчёта — становится первым сообщением Михалыча,
   *  чтобы не было двух отдельных блоков (разбор + чат). */
  seedReview?: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function MikhalychWidget({ calculatorTitle, calcContext, seedReview }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [agentMeta, setAgentMeta] = useState<Pick<
    MikhalychChatResponse,
    "toolsUsed" | "calculatorLinks" | "projectEntries"
  > | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Первое сообщение Михалыча: готовый авто-разбор расчёта, если он уже есть,
  // иначе обычное приветствие. Когда разбор дозагружается (был null → текст),
  // подменяем им первое сообщение — но только пока пользователь не начал диалог.
  useEffect(() => {
    setMessages((prev) => {
      const seed = seedReview?.trim();
      const firstContent = seed
        ? seed
        : calcContext
          ? UI_TEXT.greetingWithContext(calculatorTitle)
          : UI_TEXT.greetingWithoutContext(calculatorTitle);

      if (prev.length === 0) {
        return [{ role: "assistant", content: firstContent }];
      }
      // Диалог ещё не начался (только первое сообщение ассистента) — обновляем его
      // свежим разбором, когда тот подгрузился.
      if (prev.length === 1 && prev[0].role === "assistant" && seed) {
        return [{ role: "assistant", content: seed }];
      }
      return prev;
    });
  }, [seedReview, calculatorTitle, calcContext]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: typing ? "auto" : "smooth" });
  }, [messages, loading, typing]);

  // Safety: reset loading if stuck for more than 30 seconds
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => setLoading(false), 30_000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (loading || typing) return; // debounce while request in flight or typing

    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${rateLimitError}` }]);
      return;
    }

    const userMsg: Message = { role: "user", content: text.trim() };

    const apiMessages: Message[] = [...messages, userMsg];

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);
    setAgentMeta(null);
    setStatusHint("Думаю…");

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const lastMessages = apiMessages.slice(-10);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setLoading(false);

      const result = await streamMikhalychChat(
        {
          messages: lastMessages.map((m) => ({ role: m.role, content: m.content })),
          calcContext: calcContext || undefined,
          stream: true,
        },
        {
          onStatus: (m) => setStatusHint(m),
          onToolStart: (tool) =>
            setStatusHint(MIKHALYCH_TOOL_STATUS[tool] ?? `Выполняю: ${tool}…`),
          onToolEnd: () => setStatusHint("Формирую ответ…"),
          onDelta: (delta) => {
            setStatusHint(null);
            setTyping(true);
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: last.content + delta };
              }
              return copy;
            });
          },
        },
        controller.signal,
      );
      setTyping(false);
      setAgentMeta({
        toolsUsed: result.toolsUsed,
        calculatorLinks: result.calculatorLinks,
        projectEntries: result.projectEntries,
      });
      setStatusHint(null);
      if (!result.content.trim()) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: UI_TEXT.genericApiError };
          }
          return copy;
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : UI_TEXT.networkError;
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      setStatusHint(null);
      setTyping(false);
    }
  };

  return (
    <div ref={rootRef} className="rounded-2xl overflow-hidden scroll-mt-20 shadow-md ring-1 ring-slate-200 dark:ring-white/5 bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-white/10">
        <span className="relative shrink-0" aria-hidden="true">
          <img
            src="/mikhalych-avatar.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-accent-500/25"
          />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{UI_TEXT.assistantName}</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {calcContext ? UI_TEXT.knowParams : "AI-прораб · онлайн"}
          </p>
        </div>
      </div>

      <div ref={messagesContainerRef} className="h-[60svh] max-h-[560px] sm:h-80 overflow-y-auto overscroll-contain p-4 space-y-3 bg-slate-50 dark:bg-transparent" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" ? (
              <img src="/mikhalych-avatar.png" alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover shrink-0" aria-hidden="true" />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 bg-slate-300 dark:bg-slate-600" aria-hidden="true">
                👷
              </div>
            )}
            <div className={`max-w-[85%] sm:max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              msg.role === "assistant"
                ? "bg-white text-slate-800 border border-slate-200 dark:bg-slate-600/50 dark:text-slate-100 dark:border-transparent"
                : "bg-accent-500 text-white"
            }`}>
              {msg.role === "assistant" ? (
                <MarkdownContent content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2">
            <img src="/mikhalych-avatar.png" alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover shrink-0" aria-hidden="true" />
            <div className="flex gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl dark:bg-slate-600/50 dark:border-transparent" aria-label={UI_TEXT.thinking}>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      <MikhalychAgentExtras
        statusHint={statusHint}
        toolsUsed={agentMeta?.toolsUsed}
        calculatorLinks={agentMeta?.calculatorLinks}
        projectEntries={agentMeta?.projectEntries}
      />

      <div className="px-4 pb-4 bg-slate-50 dark:bg-transparent">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-slate-900/35">
          <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // авто-рост: подгоняем высоту под текст (макс ~5 строк)
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !loading) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={UI_TEXT.inputPlaceholder}
            disabled={loading}
            aria-label={UI_TEXT.inputAriaLabel}
            className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 dark:border-white/10 dark:bg-slate-700/70 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || typing}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-accent-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={UI_TEXT.sendAriaLabel}
          >
            <span className="hidden sm:inline">{UI_TEXT.sendAriaLabel}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
          <p className="mt-1 px-1 text-[11px] text-slate-400">Enter отправит сообщение</p>
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400">
          Ответы справочные. Точные объёмы проверяйте калькулятором.
        </p>
      </div>
    </div>
  );
}


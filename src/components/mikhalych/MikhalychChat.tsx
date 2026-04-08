"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  SYSTEM_PROMPT,
  MIKHALYCH_API_URL,
  OPENROUTER_MODEL,
  checkRateLimit,
  getApiKey,
  getApiHeaders,
  USE_PROXY,
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
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      if (!USE_PROXY && !getApiKey()) {
        setError("API-ключ не настроен. Проверьте NEXT_PUBLIC_OPENROUTER_API_KEY.");
        return;
      }

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
        const apiMessages = [...messages, userMsg].slice(-10);

        const response = await fetch(MIKHALYCH_API_URL, {
          method: "POST",
          headers: getApiHeaders(),
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          throw new Error("Ошибка AI-сервиса. Попробуйте позже.");
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("Пустой ответ от AI");
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content },
        ]);
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
    [messages, loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="card flex flex-col" style={{ height: "600px" }}>
      {/* История сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
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
              <MessageContent content={msg.content} />
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

        <div ref={messagesEndRef} />
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

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задайте вопрос Михалычу... (Enter — отправить, Shift+Enter — новая строка)"
            className="flex-1 input-field resize-none text-sm py-2.5"
            rows={2}
            disabled={loading}
            aria-label="Сообщение для Михалыча"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="btn-primary py-2.5 px-4 shrink-0 disabled:opacity-50"
            aria-label="Отправить"
          >
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
        <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 text-center">
          Ответы Михалыча носят справочный характер. Для точных расчётов используйте{" "}
          <Link href="/" className="text-accent-500 hover:underline">
            калькуляторы
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className={line === "" ? "h-2" : ""}>
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-semibold">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

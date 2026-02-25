"use client";

import { useState, useRef, useEffect } from "react";
import {
  SYSTEM_PROMPT,
  MIKHALYCH_API_URL,
  OPENROUTER_MODEL,
  checkRateLimit,
  getApiKey,
  getApiHeaders,
  USE_PROXY,
} from "@/lib/mikhalych";

interface Props {
  calculatorTitle: string;
  calcContext?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function MikhalychWidget({ calculatorTitle, calcContext }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = calcContext
        ? `Привет! Вижу, что вы работаете с **${calculatorTitle}**. Уже вижу параметры расчёта. Задавайте вопросы — отвечу с учётом ваших данных.`
        : `Привет! Задайте вопрос по **${calculatorTitle}** — расскажу о технологии, нормах расхода и типичных ошибках.`;
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, messages.length, calculatorTitle, calcContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    if (!USE_PROXY && !getApiKey()) {
      setMessages((prev) => [...prev, { role: "assistant", content: "API-ключ не настроен." }]);
      return;
    }

    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${rateLimitError}` }]);
      return;
    }

    const userMsg: Message = { role: "user", content: text.trim() };

    const apiMessages: Message[] = [...messages, userMsg];
    if (calcContext && messages.length <= 1) {
      apiMessages[apiMessages.length - 1] = {
        role: "user",
        content: `[Контекст: ${calcContext}]\n\n${text.trim()}`,
      };
    }

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const lastMessages = apiMessages.slice(-10);
      const res = await fetch(MIKHALYCH_API_URL, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...lastMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Ошибка ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "Не удалось получить ответ.";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось получить ответ. Проверьте соединение.";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="bg-linear-to-br from-slate-800 to-slate-700 rounded-2xl p-5 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
            🤖
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Спросите Михалыча</h3>
            <p className="text-sm text-slate-300 mb-3">
              Опытный строительный мастер ответит на ваши вопросы по{" "}
              <span className="text-accent-400">{calculatorTitle.toLowerCase()}</span>.
              {calcContext && (
                <span className="block mt-1 text-xs text-green-400">
                  ✓ Михалыч видит ваши параметры расчёта
                </span>
              )}
            </p>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Задать вопрос →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-slate-800 to-slate-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🤖</span>
          <span className="text-sm font-semibold text-white">Михалыч</span>
          {calcContext && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              знает параметры
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-white text-sm transition-colors"
          aria-label="Закрыть чат"
        >
          ✕
        </button>
      </div>

      <div className="h-72 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${msg.role === "assistant" ? "bg-accent-500" : "bg-slate-600"}`} aria-hidden="true">
              {msg.role === "assistant" ? "🤖" : "👷"}
            </div>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              msg.role === "assistant"
                ? "bg-slate-600/50 text-slate-100"
                : "bg-accent-500 text-white"
            }`}>
              <SimpleMarkdown text={msg.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center text-xs" aria-hidden="true">🤖</div>
            <div className="flex gap-1 px-3 py-2 bg-slate-600/50 rounded-xl" aria-label="Михалыч думает...">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Задайте вопрос..."
            disabled={loading}
            aria-label="Сообщение для Михалыча"
            className="flex-1 bg-slate-600/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-accent-500/50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-accent-500 hover:bg-accent-600 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-colors text-sm font-medium"
            aria-label="Отправить"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className={line === "" ? "h-1.5" : ""}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </p>
        );
      })}
    </div>
  );
}

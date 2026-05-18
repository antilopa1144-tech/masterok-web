"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MarkdownContent from "@/components/mikhalych/MarkdownContent";
import { buildInstantCalcReaction } from "@/lib/mikhalych/calc-reactions";
import {
  hashMikhalychCalcContext,
  type MikhalychCalcContextInput,
  buildMikhalychCalcContext,
} from "@/lib/mikhalych/calc-context";
import {
  isCalcReviewDisabled,
  loadCachedCalcReview,
  saveCachedCalcReview,
  setCalcReviewDisabled,
} from "@/lib/mikhalych/calc-review-cache";
import { getApiHeaders } from "@/lib/mikhalych";
import { MIKHALYCH_WIDGET_UI_TEXT } from "./uiText";

const REVIEW_API = "/api/mikhalych/review";
const DEBOUNCE_MS = 1400;

interface Props {
  input: MikhalychCalcContextInput;
  onAskMore?: () => void;
}

export default function MikhalychCalcReview({ input, onAskMore }: Props) {
  const context = buildMikhalychCalcContext(input);
  const contextHash = hashMikhalychCalcContext(context);
  const seed = contextHash.charCodeAt(1) ?? 0;

  const [instant] = useState(() => buildInstantCalcReaction(input.result, seed));
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(() => isCalcReviewDisabled());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReview = useCallback(async () => {
    if (hidden || isCalcReviewDisabled()) return;

    const cached = loadCachedCalcReview(contextHash);
    if (cached) {
      setAiText(cached.text);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(REVIEW_API, {
        method: "POST",
        headers: getApiHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          context,
          calculatorSlug: input.calculatorSlug,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error(MIKHALYCH_WIDGET_UI_TEXT.rateLimitedReview);
        throw new Error(MIKHALYCH_WIDGET_UI_TEXT.reviewError);
      }

      const data = (await res.json()) as { content?: string };
      const text = data.content?.trim();
      if (!text) throw new Error(MIKHALYCH_WIDGET_UI_TEXT.reviewError);

      saveCachedCalcReview(contextHash, text);
      setAiText(text);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : MIKHALYCH_WIDGET_UI_TEXT.reviewError);
    } finally {
      setLoading(false);
    }
  }, [context, contextHash, hidden, input.calculatorSlug]);

  useEffect(() => {
    if (hidden) return;
    setAiText(null);
    setError(null);

    const cached = loadCachedCalcReview(contextHash);
    if (cached) {
      setAiText(cached.text);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchReview();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [contextHash, hidden, fetchReview]);

  if (hidden) return null;

  return (
    <div
      className="print:hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 overflow-hidden shadow-md"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-xl shadow-lg shadow-accent-500/25"
          aria-hidden
        >
          🤖
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{MIKHALYCH_WIDGET_UI_TEXT.reviewTitle}</p>
          <p className="text-[11px] text-slate-400">{MIKHALYCH_WIDGET_UI_TEXT.reviewSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            setCalcReviewDisabled(true);
          }}
          className="text-[11px] text-slate-500 hover:text-slate-300 shrink-0"
          title={MIKHALYCH_WIDGET_UI_TEXT.hideReview}
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-sm leading-relaxed text-slate-200">{instant}</p>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex gap-1" aria-hidden>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:-0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:0.2s]" />
            </span>
            {MIKHALYCH_WIDGET_UI_TEXT.reviewThinking}
          </div>
        )}

        {aiText && !loading && (
          <div className="rounded-xl bg-slate-700/40 px-3 py-2.5 text-sm text-slate-100 leading-relaxed border border-white/5">
            <MarkdownContent content={aiText} />
          </div>
        )}

        {error && !loading && !aiText && (
          <p className="text-xs text-amber-300/90">{error}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {onAskMore && (
            <button
              type="button"
              onClick={onAskMore}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 px-3 py-2 text-xs font-semibold text-white transition-colors"
            >
              {MIKHALYCH_WIDGET_UI_TEXT.askMore}
            </button>
          )}
          {!aiText && !loading && error && (
            <button
              type="button"
              onClick={() => void fetchReview()}
              className="text-xs text-slate-400 hover:text-white underline-offset-2 hover:underline"
            >
              {MIKHALYCH_WIDGET_UI_TEXT.retryReview}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Готовый разбор (инстант сразу + AI когда подгрузится) поднимается наверх,
   *  чтобы показать его как первое сообщение единого чата Михалыча. */
  onReviewReady?: (text: string) => void;
}

export default function MikhalychCalcReview({ input, onReviewReady }: Props) {
  const context = buildMikhalychCalcContext(input);
  const contextHash = hashMikhalychCalcContext(context);
  const seed = contextHash.charCodeAt(1) ?? 0;
  return <MikhalychCalcReviewSession key={contextHash} input={input} onReviewReady={onReviewReady} context={context} contextHash={contextHash} seed={seed} />;
}

function MikhalychCalcReviewSession({
  input,
  onReviewReady,
  context,
  contextHash,
  seed,
}: Props & { context: ReturnType<typeof buildMikhalychCalcContext>; contextHash: string; seed: number }) {

  const [instant] = useState(() => buildInstantCalcReaction(input.result, seed));
  const [aiText, setAiText] = useState<string | null>(() => loadCachedCalcReview(contextHash)?.text ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(() => isCalcReviewDisabled());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Поднимаем разбор наверх: сначала мгновенную реакцию, затем AI-текст когда
  // он подгрузится. Чат подменит первое сообщение свежим разбором.
  useEffect(() => {
    if (hidden) return;
    onReviewReady?.(aiText ?? instant);
  }, [aiText, instant, hidden, onReviewReady]);

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
    if (aiText) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchReview();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [aiText, contextHash, hidden, fetchReview]);

  // Невизуальный поставщик данных: разбор показывается как первое сообщение
  // единого чата Михалыча (см. onReviewReady). Сам блок ничего не рисует.
  return null;
}

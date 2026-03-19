"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CalculatorResult, CalculatorField } from "@/lib/calculators/types";
import type { CalculatorMeta } from "@/lib/calculators/types";
import type { AccuracyMode } from "../../../engine/accuracy";
import { DEFAULT_ACCURACY_MODE } from "../../../engine/accuracy";
import { getCategoryById } from "@/lib/calculators/categories";
import { getCalculateFn } from "@/lib/calculators/registry";
import { CALCULATOR_UI_TEXT } from "./uiText";

// ── Constants ────────────────────────────────────────────────────────────────

const HISTORY_KEY = "masterok-calc-history";
const MAX_HISTORY = 10;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CalculatorWidgetProps extends CalculatorMeta {
  fields: CalculatorField[];
  expertTips?: {
    title: string;
    content: string;
    author?: string;
  }[];
  faq?: {
    question: string;
    answer: string;
  }[];
}

export interface HistoryEntry {
  calcId: string;
  calcTitle: string;
  values: Record<string, number>;
  result: CalculatorResult;
  ts: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(entry: HistoryEntry) {
  try {
    const prev = loadHistory().filter(
      (h) => !(h.calcId === entry.calcId && JSON.stringify(h.values) === JSON.stringify(entry.values))
    );
    const next = [entry, ...prev].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
}

export function formatNumber(n: number): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Number.isInteger(n)) return n.toLocaleString("ru-RU");
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCalculator(calculator: CalculatorWidgetProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const getInitialValues = useCallback(() =>
    Object.fromEntries(
      calculator.fields.map((f) => {
        const urlVal = searchParams.get(f.key);
        return [f.key, urlVal !== null ? Number(urlVal) : f.defaultValue];
      })
    ), [calculator.fields, searchParams]);

  const [values, setValues] = useState<Record<string, number>>(getInitialValues);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [accuracyMode, setAccuracyMode] = useState<AccuracyMode>(
    (searchParams.get("accuracyMode") as AccuracyMode) || DEFAULT_ACCURACY_MODE
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const category = getCategoryById(calculator.category);

  // Загружаем историю при монтировании
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Если URL содержит параметры — автоматически считаем
  useEffect(() => {
    const hasParams = calculator.fields.some((f) => searchParams.get(f.key) !== null);
    if (hasParams) {
      void getCalculateFn(calculator.slug).then((fn) => {
        if (fn) {
          const initVals = getInitialValues();
          const res = fn({ ...initVals, accuracyMode: accuracyMode as unknown as number });
          setResult(res);
          setHasCalculated(true);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Автоматический перерасчёт при изменении значений (debounce 300ms)
  const accuracyModeRef = useRef(accuracyMode);
  accuracyModeRef.current = accuracyMode;

  const runAutoCalc = useCallback((newValues: Record<string, number>) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void getCalculateFn(calculator.slug).then((fn) => {
        if (!fn) return;
        const res = fn({ ...newValues, accuracyMode: accuracyModeRef.current as unknown as number });
        setResult(res);
        setHasCalculated(true);
      });
    }, 300);
  }, [calculator.slug]);

  // Очистка таймера при размонтировании
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleChange = useCallback((key: string, value: number) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      runAutoCalc(next);
      return next;
    });
  }, [runAutoCalc]);

  // Recalculate when accuracy mode changes
  const handleAccuracyModeChange = useCallback((mode: AccuracyMode) => {
    setAccuracyMode(mode);
    // Trigger recalculation with new mode
    clearTimeout(debounceRef.current);
    void getCalculateFn(calculator.slug).then((fn) => {
      if (!fn) return;
      const res = fn({ ...values, accuracyMode: mode as unknown as number });
      setResult(res);
      setHasCalculated(true);
    });
  }, [calculator.slug, values]);

  const handleCalculate = useCallback(() => {
    clearTimeout(debounceRef.current);
    void getCalculateFn(calculator.slug).then((fn) => {
      if (!fn) return;
      const res = fn({ ...values, accuracyMode: accuracyMode as unknown as number });
      setResult(res);
      setHasCalculated(true);

      // Сохраняем в историю только при явном нажатии кнопки
      const entry: HistoryEntry = {
        calcId: calculator.id,
        calcTitle: calculator.title,
        values,
        result: res,
        ts: Date.now(),
      };
      saveHistory(entry);
      setHistory(loadHistory());
    });
  }, [calculator.slug, calculator.id, calculator.title, values, accuracyMode]);

  const handleReset = useCallback(() => {
    const defaults = Object.fromEntries(
      calculator.fields.map((f) => [f.key, f.defaultValue])
    );
    setValues(defaults);
    setResult(null);
    setHasCalculated(false);
    router.replace(window.location.pathname, { scroll: false });
  }, [calculator.fields, router]);

  // Поделиться — генерирует URL с параметрами
  const handleShare = useCallback(async () => {
    const params = new URLSearchParams(
      Object.entries(values).map(([k, v]) => [k, String(v)])
    );
    if (accuracyMode !== DEFAULT_ACCURACY_MODE) {
      params.set("accuracyMode", accuracyMode);
    }
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      prompt(CALCULATOR_UI_TEXT.copyLinkPrompt, url);
    }
  }, [values, accuracyMode]);

  // Восстановить из истории
  const handleRestoreHistory = useCallback((entry: HistoryEntry) => {
    setValues(entry.values);
    setResult(entry.result);
    setHasCalculated(true);
    setShowHistory(false);
  }, []);

  // Применить пресет (быстрый пример)
  const applyPreset = useCallback((presetValues: Record<string, number>) => {
    setValues((prev) => {
      const next = { ...prev, ...presetValues };
      runAutoCalc(next);
      return next;
    });
  }, [runAutoCalc]);

  // Фильтруем поля по inputMode
  const inputMode = Math.round(values.inputMode ?? 0);
  const visibleFields = calculator.fields.filter((f) => {
    if (!f.group) return true;
    if (f.group === "bySize") return inputMode === 0;
    if (f.group === "byArea") return inputMode === 1;
    return true;
  });

  // История только для текущего калькулятора
  const calcHistory = history.filter((h) => h.calcId === calculator.id);

  return {
    values,
    result,
    hasCalculated,
    shareState,
    showHistory,
    setShowHistory,
    category,
    visibleFields,
    calcHistory,
    accuracyMode,
    handleChange,
    handleCalculate,
    handleReset,
    handleShare,
    handleRestoreHistory,
    handleAccuracyModeChange,
    applyPreset,
  };
}


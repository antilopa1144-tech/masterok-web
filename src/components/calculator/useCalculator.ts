"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CalculatorResult, CalculatorField } from "@/lib/calculators/types";
import { fieldUsesDynamicOptions } from "@/lib/calculators/insulation-smart";
import { shouldHideField, resolveFieldOptions, isFieldVisible } from "@/lib/calculators/field-options";
import { syncDependentFields } from "@/lib/calculators/field-sync";
import type { CalculatorMeta } from "@/lib/calculators/types";
import type { AccuracyMode, AccuracyModifiers } from "../../../engine/accuracy";
import { ACCURACY_MODES, DEFAULT_ACCURACY_MODE, setCustomModifiers } from "../../../engine/accuracy";
import { getCategoryById } from "@/lib/calculators/categories";
import { getCalculateFn } from "@/lib/calculators/registry";
import { CALCULATOR_UI_TEXT } from "./uiText";
import { shareOrCopy } from "@/lib/clipboard";
import {
  trackAccuracyModeChange,
  trackAccuracyModeCalculation,
  trackCalculatorShare,
  trackCalculatorStart,
  trackCalculatorValidationError,
  trackComparisonOpen,
} from "@/lib/analytics";
import { getInvalidCalculatorFields } from "./calculatorValidation";
import {
  addCalculationHistory,
  getAccuracyModeSetting,
  getCalculationHistory,
  setAccuracyModeSetting,
} from "@/lib/storage/history";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Видимость полей и динамические опции живут в lib (доменная логика).
// Реэкспорт — чтобы не менять существующие импорты из useCalculator.
export { shouldHideField, resolveFieldOptions, isFieldVisible };

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

function getVisibleCalculatorFields(
  calculator: CalculatorWidgetProps,
  values: Record<string, number>,
): CalculatorField[] {
  return calculator.fields
    .filter((field) => isFieldVisible(field, values))
    .map((field) => {
      if (!fieldUsesDynamicOptions(field)) return field;
      const resolved = resolveFieldOptions(field, values);
      return resolved ? { ...field, options: resolved } : field;
    });
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
  // Растёт только при ЯВНОМ нажатии «Рассчитать» (не при live-пересчёте от
  // движения слайдеров). Потребитель использует это, чтобы подскроллить к
  // результату — на мобиле без этого приходится мотать мимо всей формы.
  const [calcNonce, setCalcNonce] = useState(0);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [accuracyMode, setAccuracyMode] = useState<AccuracyMode>(() => {
    const fromUrl = searchParams.get("accuracyMode") as AccuracyMode | null;
    if (fromUrl === "basic" || fromUrl === "realistic" || fromUrl === "professional") return fromUrl;
    return DEFAULT_ACCURACY_MODE;
  });
  const [comparisonResults, setComparisonResults] = useState<Record<AccuracyMode, CalculatorResult> | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [customModifiers, setCustomModifiersState] = useState<Partial<AccuracyModifiers>>({});
  const [hasStarted, setHasStarted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const hasTrackedStartRef = useRef(false);
  const lastValidationErrorSignatureRef = useRef("");

  const markCalculatorStarted = useCallback(() => {
    if (hasTrackedStartRef.current) return;
    hasTrackedStartRef.current = true;
    setHasStarted(true);
    trackCalculatorStart(calculator.slug);
  }, [calculator.slug]);

  const category = getCategoryById(calculator.category);
  const visibleFields = useMemo(
    () => getVisibleCalculatorFields(calculator, values),
    [calculator, values],
  );
  const invalidFields = useMemo(
    () => getInvalidCalculatorFields(visibleFields, values),
    [visibleFields, values],
  );
  const hasValidationErrors = invalidFields.length > 0;

  // Загружаем историю при монтировании
  useEffect(() => {
    let cancelled = false;
    void getCalculationHistory().then((items) => {
      if (!cancelled) setHistory(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("accuracyMode")) return;
    let cancelled = false;
    void getAccuracyModeSetting().then((saved) => {
      if (!cancelled && saved) setAccuracyMode(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Если URL содержит параметры — автоматически считаем
  useEffect(() => {
    const hasParams = calculator.fields.some((f) => searchParams.get(f.key) !== null);
    if (hasParams) {
      void getCalculateFn(calculator.slug).then((fn) => {
        if (fn) {
          const initVals = getInitialValues();
          const initialFields = getVisibleCalculatorFields(calculator, initVals);
          if (getInvalidCalculatorFields(initialFields, initVals).length > 0) return;
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
  const showComparisonRef = useRef(showComparison);
  showComparisonRef.current = showComparison;

  const runAutoCalc = useCallback((newValues: Record<string, number>) => {
    clearTimeout(debounceRef.current);
    const nextFields = getVisibleCalculatorFields(calculator, newValues);
    if (getInvalidCalculatorFields(nextFields, newValues).length > 0) return;
    debounceRef.current = setTimeout(() => {
      void getCalculateFn(calculator.slug).then((fn) => {
        if (!fn) return;
        const res = fn({ ...newValues, accuracyMode: accuracyModeRef.current as unknown as number });
        setResult(res);
        setHasCalculated(true);
        // Update comparison if panel is open
        if (showComparisonRef.current) {
          const cmp = {} as Record<AccuracyMode, CalculatorResult>;
          for (const m of ACCURACY_MODES) {
            cmp[m] = fn({ ...newValues, accuracyMode: m as unknown as number });
          }
          setComparisonResults(cmp);
        }
      });
    }, 300);
  }, [calculator]);

  // Очистка таймера при размонтировании
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleChange = useCallback((key: string, value: number) => {
    markCalculatorStarted();
    setValues((prev) => {
      const next: Record<string, number> = { ...prev, [key]: value };
      // Доменные правила зависимых полей (каталог утеплителя, толщина по
      // климату и т.п.) — в lib/calculators/field-sync.
      syncDependentFields(calculator, key, value, next);
      runAutoCalc(next);
      return next;
    });
  }, [runAutoCalc, calculator, markCalculatorStarted]);

  // Recalculate when accuracy mode changes
  const handleAccuracyModeChange = useCallback((mode: AccuracyMode) => {
    markCalculatorStarted();
    trackAccuracyModeChange(calculator.slug, accuracyMode, mode);
    setAccuracyMode(mode);
    if (mode !== "custom") void setAccuracyModeSetting(mode);
    // Apply or clear custom modifiers
    setCustomModifiers(mode === "custom" ? customModifiers : null);
    if (hasValidationErrors) return;
    // Trigger recalculation with new mode
    clearTimeout(debounceRef.current);
    void getCalculateFn(calculator.slug).then((fn) => {
      if (!fn) return;
      const res = fn({ ...values, accuracyMode: mode as unknown as number });
      setResult(res);
      setHasCalculated(true);
    });
  }, [calculator.slug, values, accuracyMode, customModifiers, hasValidationErrors, markCalculatorStarted]);

  const handleCalculate = useCallback(() => {
    clearTimeout(debounceRef.current);
    markCalculatorStarted();
    if (hasValidationErrors) {
      const invalidFieldKeys = invalidFields.map(({ field }) => field.key).sort();
      const signature = invalidFieldKeys.join(",");
      if (signature !== lastValidationErrorSignatureRef.current) {
        lastValidationErrorSignatureRef.current = signature;
        trackCalculatorValidationError(
          calculator.slug,
          invalidFieldKeys.length,
          invalidFieldKeys[0] ?? "unknown",
        );
      }
      return false;
    }
    lastValidationErrorSignatureRef.current = "";
    void getCalculateFn(calculator.slug).then((fn) => {
      if (!fn) return;
      const res = fn({ ...values, accuracyMode: accuracyMode as unknown as number });
      setResult(res);
      setHasCalculated(true);
      setCalcNonce((n) => n + 1);
      trackAccuracyModeCalculation(calculator.slug, accuracyMode);

      // Сохраняем в историю только при явном нажатии кнопки
      const entry: HistoryEntry = {
        calcId: calculator.id,
        calcTitle: calculator.title,
        values,
        result: res,
        ts: Date.now(),
      };
      void addCalculationHistory(entry).then(setHistory);
    });
    return true;
  }, [calculator.slug, calculator.id, calculator.title, values, accuracyMode, hasValidationErrors, invalidFields, markCalculatorStarted]);

  const handleReset = useCallback(() => {
    const defaults = Object.fromEntries(
      calculator.fields.map((f) => [f.key, f.defaultValue])
    );
    setValues(defaults);
    setResult(null);
    setHasCalculated(false);
    router.replace(window.location.pathname, { scroll: false });
  }, [calculator.fields, router]);

  // Поделиться — генерирует URL с параметрами, использует Web Share API или clipboard fallback
  const handleShare = useCallback(async () => {
    const params = new URLSearchParams(
      Object.entries(values).map(([k, v]) => [k, String(v)])
    );
    if (accuracyMode !== DEFAULT_ACCURACY_MODE) {
      params.set("accuracyMode", accuracyMode);
    }
    const url = `${window.location.origin}${window.location.pathname}?${params}`;

    const primary = result?.materials?.[0];
    const summary = primary
      ? `${primary.name}: ${primary.purchaseQty ?? primary.withReserve ?? primary.quantity} ${primary.unit}`
      : undefined;

    const outcome = await shareOrCopy({
      title: calculator.title,
      text: summary ? `${calculator.title}. ${summary}` : calculator.title,
      url,
    });

    if (outcome === "copied") {
      trackCalculatorShare(calculator.slug, "clipboard");
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } else if (outcome === "shared") {
      trackCalculatorShare(calculator.slug, "native");
    } else if (outcome === "failed") {
      prompt(CALCULATOR_UI_TEXT.copyLinkPrompt, url);
    }
    // "shared" and "cancelled" — no UI feedback needed
  }, [values, accuracyMode, calculator.slug, calculator.title, result]);

  // Восстановить из истории
  const handleRestoreHistory = useCallback((entry: HistoryEntry) => {
    markCalculatorStarted();
    setValues(entry.values);
    setResult(entry.result);
    setHasCalculated(true);
    setShowHistory(false);
  }, [markCalculatorStarted]);

  // Применить пресет (быстрый пример)
  const applyPreset = useCallback((presetValues: Record<string, number>) => {
    markCalculatorStarted();
    setValues((prev) => {
      const next = { ...prev, ...presetValues };
      runAutoCalc(next);
      return next;
    });
  }, [runAutoCalc, markCalculatorStarted]);

  // Handle custom modifier changes
  const handleCustomModifiersChange = useCallback((mods: Partial<AccuracyModifiers>) => {
    markCalculatorStarted();
    setCustomModifiersState(mods);
    setCustomModifiers(mods);
    // Recalculate if in custom mode
    if (accuracyModeRef.current === "custom") {
      runAutoCalc(values);
    }
  }, [values, runAutoCalc, markCalculatorStarted]);

  // Contextual accuracy mode hint based on current inputs
  const accuracyHint = (() => {
    const complexity = values.roomComplexity ?? -1;
    const layingMethod = values.layingMethod ?? values.layoutPattern ?? -1;
    const tileW = values.tileWidth ?? 0;
    const tileH = values.tileHeight ?? 0;
    const area = values.area ?? (values.length ?? 0) * (values.width ?? 0);

    // Complex room + diagonal/herringbone → professional
    if (complexity >= 2 || layingMethod >= 1) {
      return { suggested: "professional" as AccuracyMode, reason: CALCULATOR_UI_TEXT.hintComplexLayout };
    }
    // Large tile format → professional
    if ((tileW > 600 || tileH > 600) && tileW > 0) {
      return { suggested: "professional" as AccuracyMode, reason: CALCULATOR_UI_TEXT.hintLargeTile };
    }
    // Large area → at least realistic
    if (area > 100 && accuracyMode === "basic") {
      return { suggested: "realistic" as AccuracyMode, reason: CALCULATOR_UI_TEXT.hintLargeArea };
    }
    // Small simple job → basic may be enough
    if (area > 0 && area < 5 && complexity <= 0 && accuracyMode !== "basic") {
      return { suggested: "basic" as AccuracyMode, reason: CALCULATOR_UI_TEXT.hintSmallArea };
    }
    return null;
  })();

  // Compute comparison results across all three accuracy modes
  const computeComparison = useCallback(async (inputValues: Record<string, number>) => {
    const fn = await getCalculateFn(calculator.slug);
    if (!fn) return;
    const results = {} as Record<AccuracyMode, CalculatorResult>;
    for (const mode of ACCURACY_MODES) {
      results[mode] = fn({ ...inputValues, accuracyMode: mode as unknown as number });
    }
    setComparisonResults(results);
  }, [calculator.slug]);

  const handleToggleComparison = useCallback(() => {
    markCalculatorStarted();
    const next = !showComparison;
    setShowComparison(next);
    if (next && hasCalculated) {
      trackComparisonOpen(calculator.slug);
      void computeComparison(values);
    }
  }, [showComparison, hasCalculated, values, computeComparison, calculator.slug, markCalculatorStarted]);

  // История только для текущего калькулятора
  const calcHistory = history.filter((h) => h.calcId === calculator.id);

  return {
    values,
    result: hasValidationErrors ? null : result,
    hasCalculated: hasValidationErrors ? false : hasCalculated,
    hasStarted,
    calcNonce,
    shareState,
    showHistory,
    setShowHistory,
    category,
    visibleFields,
    invalidFields,
    hasValidationErrors,
    calcHistory,
    accuracyMode,
    accuracyHint,
    comparisonResults,
    showComparison,
    handleChange,
    handleCalculate,
    handleReset,
    handleShare,
    handleRestoreHistory,
    handleAccuracyModeChange,
    handleToggleComparison,
    handleCustomModifiersChange,
    customModifiers,
    applyPreset,
  };
}

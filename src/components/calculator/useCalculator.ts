"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CalculatorResult, CalculatorField, HideCondition, FieldOption } from "@/lib/calculators/types";
import { getManufacturerCategory } from "@/lib/manufacturers";
import {
  buildProductSelectOptions,
  getDefaultProductIdForForm,
  getProductThicknessOptions,
} from "@/lib/calculators/insulation-catalog";
import {
  fieldUsesDynamicOptions,
  thicknessForClimateAndProduct,
} from "@/lib/calculators/insulation-smart";
import type { CalculatorMeta } from "@/lib/calculators/types";
import type { AccuracyMode, AccuracyModifiers } from "../../../engine/accuracy";
import { ACCURACY_MODES, DEFAULT_ACCURACY_MODE, setCustomModifiers } from "../../../engine/accuracy";
import { getCategoryById } from "@/lib/calculators/categories";
import { getCalculateFn } from "@/lib/calculators/registry";
import { CALCULATOR_UI_TEXT } from "./uiText";
import { shareOrCopy } from "@/lib/clipboard";
import { trackAccuracyModeChange, trackAccuracyModeCalculation, trackComparisonOpen } from "@/lib/analytics";
import {
  addCalculationHistory,
  getAccuracyModeSetting,
  getCalculationHistory,
  setAccuracyModeSetting,
} from "@/lib/storage/history";

// ── Constants ────────────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Проверка одного декларативного условия скрытия (HideCondition).
 * Если поле отсутствует в values — условие считается невыполненным
 * (поле не скрывается из-за отсутствующего ключа).
 */
function evalHideCondition(c: HideCondition, values: Record<string, number>): boolean {
  const v = values[c.key];
  if (v === undefined || v === null || Number.isNaN(v)) return false;
  switch (c.op) {
    case "gt": return v > c.value;
    case "gte": return v >= c.value;
    case "lt": return v < c.value;
    case "lte": return v <= c.value;
    case "eq": return v === c.value;
    case "ne": return v !== c.value;
  }
}

/**
 * Стоит ли скрыть поле для текущих значений формы.
 * hideIf-массив объединяется через OR, hideIfAll — через AND.
 */
export function shouldHideField(field: CalculatorField, values: Record<string, number>): boolean {
  if (field.hideIf) {
    const conds = Array.isArray(field.hideIf) ? field.hideIf : [field.hideIf];
    if (conds.some((c) => evalHideCondition(c, values))) return true;
  }
  if (field.hideIfAll && field.hideIfAll.length > 0) {
    if (field.hideIfAll.every((c) => evalHideCondition(c, values))) return true;
  }
  return false;
}

/**
 * Возвращает реальные опции селекта, учитывая `optionsFromBrand`.
 *
 * Если поле объявило зависимость от бренда и пользователь выбрал конкретную
 * линейку — опции формируются из `manufacturer.specs[specKey]`. Иначе берутся
 * статичные `field.options`.
 *
 * Пример: `thickness` у Пеноплэкс Комфорт → [20, 30, 50, 100] мм вместо
 * стандартных [50, 80, 100, 150, 200, 250, 300]. Пользователь не сможет
 * выбрать толщину, которой бренд не выпускает.
 */
export function resolveFieldOptions(
  field: CalculatorField,
  values: Record<string, number>,
): FieldOption[] | undefined {
  if (field.key === "productId") {
    const form = Math.round(values.materialForm ?? 0);
    return buildProductSelectOptions(form);
  }

  if (field.optionsFromProduct) {
    const productId = Math.round(values.productId ?? 0);
    const thicknesses = getProductThicknessOptions(productId);
    if (thicknesses.length > 0) {
      return thicknesses.map((v) => ({ value: v, label: `${v} мм` }));
    }
  }

  const cfg = field.optionsFromBrand;
  if (!cfg) return field.options;
  const manufacturerIdx = values.manufacturer;
  if (!manufacturerIdx || manufacturerIdx <= 0) return field.options;
  const category = getManufacturerCategory(cfg.category);
  if (!category) return field.options;
  const brand = category.items[manufacturerIdx - 1];
  if (!brand) return field.options;
  const raw = (brand.specs as Record<string, unknown>)[cfg.specKey];
  if (!Array.isArray(raw) || raw.length === 0) return field.options;
  const template = cfg.labelTemplate ?? "%v";
  return raw
    .filter((v): v is number => typeof v === "number")
    .map((v) => ({ value: v, label: template.replace("%v", String(v)) }));
}

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
  const [accuracyMode, setAccuracyMode] = useState<AccuracyMode>(() => {
    const fromUrl = searchParams.get("accuracyMode") as AccuracyMode | null;
    if (fromUrl === "basic" || fromUrl === "realistic" || fromUrl === "professional") return fromUrl;
    return DEFAULT_ACCURACY_MODE;
  });
  const [comparisonResults, setComparisonResults] = useState<Record<AccuracyMode, CalculatorResult> | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [customModifiers, setCustomModifiersState] = useState<Partial<AccuracyModifiers>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const category = getCategoryById(calculator.category);

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
  }, [calculator.slug]);

  // Очистка таймера при размонтировании
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleChange = useCallback((key: string, value: number) => {
    setValues((prev) => {
      const next: Record<string, number> = { ...prev, [key]: value };

      // Авто-подстановка значений зависимых полей: если изменился бренд, то
      // у полей с `optionsFromBrand` текущие значения могут оказаться вне
      // допустимого набора (например, у Пеноплэкс Комфорт нет 80 мм). В этом
      // случае подменяем на ближайшее значение из новых опций.
      if (key === "manufacturer" || key === "materialForm" || key === "productId") {
        for (const f of calculator.fields) {
          if (!fieldUsesDynamicOptions(f)) continue;
          const opts = resolveFieldOptions(f, next);
          if (!opts || opts.length === 0) continue;
          const current = next[f.key];
          if (opts.some((o) => o.value === current)) continue;
          const closest = opts.reduce((best, o) =>
            Math.abs(o.value - current) < Math.abs(best.value - current) ? o : best,
          );
          next[f.key] = closest.value;
        }
      }

      if (key === "materialForm") {
        next.productId = getDefaultProductIdForForm(value);
      }

      if (calculator.id === "insulation") {
        if (key === "climateZone" || key === "materialForm") {
          next.thickness = thicknessForClimateAndProduct(
            Math.round(next.climateZone ?? 1),
            Math.round(next.productId ?? 0),
            calculator.fields,
          );
        } else if (key === "productId") {
          const thicknessOpts = resolveFieldOptions(
            calculator.fields.find((f) => f.key === "thickness")!,
            next,
          );
          if (thicknessOpts?.length && !thicknessOpts.some((o) => o.value === next.thickness)) {
            next.thickness = thicknessForClimateAndProduct(
              Math.round(next.climateZone ?? 1),
              Math.round(next.productId ?? 0),
              calculator.fields,
            );
          }
        }
      } else if (key === "productId" || key === "materialForm") {
        const thicknessOpts = resolveFieldOptions(
          calculator.fields.find((f) => f.key === "thickness")!,
          next,
        );
        if (thicknessOpts?.length) {
          const t = next.thickness;
          if (!thicknessOpts.some((o) => o.value === t)) {
            next.thickness = thicknessOpts[Math.floor(thicknessOpts.length / 2)]!.value;
          }
        }
      }

      runAutoCalc(next);
      return next;
    });
  }, [runAutoCalc, calculator.fields, calculator.id]);

  // Recalculate when accuracy mode changes
  const handleAccuracyModeChange = useCallback((mode: AccuracyMode) => {
    trackAccuracyModeChange(calculator.slug, accuracyMode, mode);
    setAccuracyMode(mode);
    if (mode !== "custom") void setAccuracyModeSetting(mode);
    // Apply or clear custom modifiers
    setCustomModifiers(mode === "custom" ? customModifiers : null);
    // Trigger recalculation with new mode
    clearTimeout(debounceRef.current);
    void getCalculateFn(calculator.slug).then((fn) => {
      if (!fn) return;
      const res = fn({ ...values, accuracyMode: mode as unknown as number });
      setResult(res);
      setHasCalculated(true);
    });
  }, [calculator.slug, values, accuracyMode, customModifiers]);

  const handleCalculate = useCallback(() => {
    clearTimeout(debounceRef.current);
    void getCalculateFn(calculator.slug).then((fn) => {
      if (!fn) return;
      const res = fn({ ...values, accuracyMode: accuracyMode as unknown as number });
      setResult(res);
      setHasCalculated(true);
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
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } else if (outcome === "failed") {
      prompt(CALCULATOR_UI_TEXT.copyLinkPrompt, url);
    }
    // "shared" and "cancelled" — no UI feedback needed
  }, [values, accuracyMode, calculator.title, result]);

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

  // Handle custom modifier changes
  const handleCustomModifiersChange = useCallback((mods: Partial<AccuracyModifiers>) => {
    setCustomModifiersState(mods);
    setCustomModifiers(mods);
    // Recalculate if in custom mode
    if (accuracyModeRef.current === "custom") {
      runAutoCalc(values);
    }
  }, [values, runAutoCalc]);

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
    const next = !showComparison;
    setShowComparison(next);
    if (next && hasCalculated) {
      trackComparisonOpen(calculator.slug);
      void computeComparison(values);
    }
  }, [showComparison, hasCalculated, values, computeComparison, calculator.slug]);

  // Фильтруем поля по inputMode и по hideIf-условиям, и подменяем динамические
  // options (зависящие от выбранного бренда — `optionsFromBrand`).
  const inputMode = Math.round(values.inputMode ?? 0);
  const visibleFields = calculator.fields
    .filter((f) => {
      if (shouldHideField(f, values)) return false;
      if (!f.group) return true;
      if (f.group === "bySize") return inputMode === 0;
      if (f.group === "byArea") return inputMode === 1;
      return true;
    })
    .map((f) => {
      if (!fieldUsesDynamicOptions(f)) return f;
      const resolved = resolveFieldOptions(f, values);
      if (!resolved) return f;
      return { ...f, options: resolved };
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

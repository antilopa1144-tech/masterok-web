"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CalculatorResult, CalculatorField } from "@/lib/calculators/types";
import type { CalculatorMeta } from "@/lib/calculators/types";
import { getCategoryById } from "@/lib/calculators/categories";
import { getCalculateFn } from "@/lib/calculators/registry";

// ── Constants ────────────────────────────────────────────────────────────────

const HISTORY_KEY = "masterok-calc-history";
const MAX_HISTORY = 10;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CalculatorWidgetProps extends CalculatorMeta {
  fields: CalculatorField[];
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

// ── Dictionaries ─────────────────────────────────────────────────────────────

export const TOTAL_LABELS: Record<string, string> = {
  // Площади
  area: "Площадь", realArea: "Реальная площадь", netArea: "Чистая площадь",
  wallArea: "Площадь стен", floorArea: "Площадь пола", roofArea: "Площадь кровли",
  facadeArea: "Площадь фасада", totalArea: "Общая площадь", usefulArea: "Полезная площадь",
  totalFinishArea: "Площадь отделки", roomArea: "Площадь комнаты", heatingArea: "Площадь обогрева",
  totalSlopeArea: "Площадь откосов", areaWithWaste: "Площадь с запасом", tileArea: "Площадь плитки",
  // Объёмы
  volume: "Объём", totalVolume: "Объём с запасом", floorVolume: "Объём пола",
  wallVolume: "Объём стен", concreteM3: "Бетон",
  // Линейные
  perimeter: "Периметр", length: "Длина", height: "Высота", width: "Ширина",
  cableLength: "Длина кабеля", pipeLength: "Длина трубы",
  totalPerimeter: "Общий периметр", netLength: "Чистая длина",
  horizontalLength: "Длина марша", stringerLength: "Длина косоура",
  totalLinearM: "Погонные метры", totalHeightM: "Общая высота",
  // Толщины
  thickness: "Толщина", thicknessMm: "Толщина", wallThicknessMm: "Толщина стены",
  widthMm: "Ширина ленты", insulationThicknessMm: "Толщина утеплителя",
  // Количества
  packs: "Упаковок", rolls: "Рулонов", sheetsNeeded: "Листов", sheets: "Листов",
  tiles: "Плиток", tilesNeeded: "Плиток", totalSheets: "Листов всего",
  blocksNeeded: "Блоков", blocksNet: "Блоков (чисто)", bricksNeeded: "Кирпичей",
  totalBricks: "Кирпичей всего", bricksPerM2: "Кирпичей/м²",
  postsCount: "Столбов", panelCount: "Панелей", panelsNeeded: "Панелей",
  piecesNeeded: "Штук", bracketsCount: "Кронштейнов",
  totalCassettes: "Кассет", hangers: "Подвесов",
  boardCount: "Досок", lagCount: "Лаг", rowCount: "Рядов", railPcs: "Реек",
  stepCount: "Ступеней", doorCount: "Дверей", windowCount: "Окон",
  openingCount: "Проёмов", platesNeeded: "Плит", plateArea: "Площадь плиты",
  funnels: "Воронок", pipePcs: "Труб", gutterPcs: "Желобов",
  rollsNeeded: "Рулонов", stripsPerRoll: "Полос в рулоне", stripsNeeded: "Полос",
  fixtures: "Светильников", ppQuantity: "Профилей ПП",
  totalFoamCans: "Баллонов пены", breakersCount: "Автоматов",
  // Масса
  totalKg: "Общий вес", kgPerSqm: "Расход", cementKg: "Цемент",
  cpsTotalKg: "Общий вес смеси", ecoWoolKg: "Эковата",
  rebarTons: "Арматура", rebarWeightKg: "Арматура",
  // Объёмы жидкостей
  litersNeeded: "Нужно литров", litersWithReserve: "Литров с запасом",
  lPerSqm: "Расход", totalL: "Всего литров",
  // Мощность
  totalPowerW: "Мощность", totalPowerKW: "Мощность",
  // Кладка
  mortarVolume: "Раствор",
  // Ступени
  realStepHeight: "Высота ступени",
  // Вентиляция
  requiredAirflow: "Воздухообмен", exchangeRate: "Кратность",
  // Кровля
  slope: "Уклон",
  // Разное
  wastePercent: "Отходы", reserve: "Запас", cable15length: "Кабель 1.5 мм²",
  cable25length: "Кабель 2.5 мм²", layerCount: "Слоёв",
};

export const TOTAL_UNITS: Record<string, string> = {
  // Площади
  area: "м²", realArea: "м²", netArea: "м²", wallArea: "м²", floorArea: "м²",
  roofArea: "м²", facadeArea: "м²", totalArea: "м²", usefulArea: "м²",
  totalFinishArea: "м²", roomArea: "м²", heatingArea: "м²", totalSlopeArea: "м²",
  areaWithWaste: "м²", tileArea: "м²", plateArea: "м²",
  // Объёмы
  volume: "м³", totalVolume: "м³", floorVolume: "м³", wallVolume: "м³",
  concreteM3: "м³", mortarVolume: "м³",
  // Линейные
  perimeter: "м.п.", length: "м", height: "м", width: "м",
  cableLength: "м", pipeLength: "м", totalPerimeter: "м",
  netLength: "м", horizontalLength: "м", stringerLength: "м",
  totalLinearM: "м.п.", totalHeightM: "м",
  cable15length: "м", cable25length: "м",
  // Толщины
  thickness: "мм", thicknessMm: "мм", wallThicknessMm: "мм", widthMm: "мм",
  insulationThicknessMm: "мм",
  // Масса
  totalKg: "кг", kgPerSqm: "кг/м²", cementKg: "кг", cpsTotalKg: "кг",
  ecoWoolKg: "кг", rebarTons: "т", rebarWeightKg: "кг",
  // Жидкости
  litersNeeded: "л", litersWithReserve: "л", lPerSqm: "л/м²", totalL: "л",
  // Мощность
  totalPowerW: "Вт", totalPowerKW: "кВт",
  // Ступени
  realStepHeight: "м",
  // Вентиляция
  requiredAirflow: "м³/ч", exchangeRate: "раз/ч",
  // Кровля
  slope: "°",
  // Разное
  wastePercent: "%", reserve: "%",
};

export const HIDDEN_TOTALS = new Set(["grade", "coats", "sides", "layers", "inputMode", "puttyType"]);

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
          const res = fn(initVals);
          setResult(res);
          setHasCalculated(true);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Автоматический перерасчёт при изменении значений (debounce 300ms)
  const runAutoCalc = useCallback((newValues: Record<string, number>) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void getCalculateFn(calculator.slug).then((fn) => {
        if (!fn) return;
        const res = fn(newValues);
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

  const handleCalculate = useCallback(() => {
    clearTimeout(debounceRef.current);
    void getCalculateFn(calculator.slug).then((fn) => {
      if (!fn) return;
      const res = fn(values);
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
  }, [calculator.slug, calculator.id, calculator.title, values]);

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
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      prompt("Скопируйте ссылку:", url);
    }
  }, [values]);

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
    handleChange,
    handleCalculate,
    handleReset,
    handleShare,
    handleRestoreHistory,
    applyPreset,
  };
}

"use client";

import { useMemo, useRef, useState, type Ref } from "react";
import Link from "next/link";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import {
  trackToolModeChange,
  type ToolInteractionSource,
} from "@/lib/analytics";
import {
  convertLinearUnit,
  convertTemperature,
  formatConvertedValue,
  parseUnitValue,
} from "@/lib/tools/unit-converter";

const UI_TEXT = {
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbCurrent: "Конвертер единиц",
  title: "Конвертер единиц измерения",
  description: "Пересчитайте строительные единицы: длину, площадь, объём, массу, давление и температуру.",
  fromLabel: "Из",
  toLabel: "В",
  inputPlaceholder: "Введите число",
  swapTitle: "Поменять местами",
  quickTargetHint: "Нажмите на любую единицу снизу, чтобы выбрать её как целевую",
  quickResultsSuffix: "=",
  defaultInputValue: "1",
} as const;

type UnitGroupId = "length" | "area" | "volume" | "mass" | "pressure" | "temperature";
type ConverterMode = "units" | "density";
const CONVERTER_TOOL_SLUG = "konverter";

// Категории единиц
interface UnitGroup {
  id: UnitGroupId;
  label: string;
  icon: string;
  units: { key: string; label: string; toBase: number }[];
}

const UNIT_GROUPS: UnitGroup[] = [
  {
    id: "length",
    label: "Длина",
    icon: "📏",
    units: [
      { key: "mm", label: "Миллиметры (мм)", toBase: 0.001 },
      { key: "cm", label: "Сантиметры (см)", toBase: 0.01 },
      { key: "m", label: "Метры (м)", toBase: 1 },
      { key: "km", label: "Километры (км)", toBase: 1000 },
      { key: "in", label: "Дюймы (″)", toBase: 0.0254 },
      { key: "ft", label: "Футы (ft)", toBase: 0.3048 },
    ],
  },
  {
    id: "area",
    label: "Площадь",
    icon: "▦",
    units: [
      { key: "mm2", label: "мм²", toBase: 1e-6 },
      { key: "cm2", label: "см²", toBase: 1e-4 },
      { key: "m2", label: "м²", toBase: 1 },
      { key: "sotka", label: "Соток (сотка = 100 м²)", toBase: 100 },
      { key: "ha", label: "Гектаров (га)", toBase: 10000 },
      { key: "ft2", label: "фут² (sq ft)", toBase: 0.092903 },
    ],
  },
  {
    id: "volume",
    label: "Объём",
    icon: "📦",
    units: [
      { key: "mm3", label: "мм³", toBase: 1e-9 },
      { key: "cm3", label: "см³ / мл", toBase: 1e-6 },
      { key: "l", label: "Литры (л)", toBase: 1e-3 },
      { key: "m3", label: "м³", toBase: 1 },
      { key: "ft3", label: "фут³ (cu ft)", toBase: 0.0283168 },
    ],
  },
  {
    id: "mass",
    label: "Масса",
    icon: "⚖️",
    units: [
      { key: "g", label: "Граммы (г)", toBase: 0.001 },
      { key: "kg", label: "Килограммы (кг)", toBase: 1 },
      { key: "t", label: "Тонны (т)", toBase: 1000 },
      { key: "lb", label: "Фунты (lb)", toBase: 0.453592 },
    ],
  },
  {
    id: "pressure",
    label: "Давление",
    icon: "🌡️",
    units: [
      { key: "pa", label: "Паскали (Па)", toBase: 1 },
      { key: "kpa", label: "Килопаскали (кПа)", toBase: 1000 },
      { key: "mpa", label: "Мегапаскали (МПа)", toBase: 1e6 },
      { key: "kgscm2", label: "кгс/см²", toBase: 98066.5 },
      { key: "atm", label: "Атмосферы (атм)", toBase: 101325 },
      { key: "bar", label: "Бары (бар)", toBase: 1e5 },
    ],
  },
  {
    id: "temperature",
    label: "Температура",
    icon: "🌡️",
    units: [
      { key: "c", label: "Цельсий (°C)", toBase: 0 },
      { key: "f", label: "Фаренгейт (°F)", toBase: 0 },
      { key: "k", label: "Кельвин (K)", toBase: 0 },
    ],
  },
];

export default function KonverterPage() {
  const [converterMode, setConverterMode] = useState<ConverterMode>("units");
  const [groupIndex, setGroupIndex] = useState(0);
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("mm");
  const [inputValue, setInputValue] = useState("1");
  const [showAllUnits, setShowAllUnits] = useState(false);

  const group = UNIT_GROUPS[groupIndex];
  const isTemperature = group.id === "temperature";

  const calculate = (): string => {
    const num = parseUnitValue(inputValue);
    if (num === null) return "—";

    if (isTemperature) {
      return formatConvertedValue(convertTemperature(num, fromUnit, toUnit));
    }

    const fromDef = group.units.find((u) => u.key === fromUnit);
    const toDef = group.units.find((u) => u.key === toUnit);
    if (!fromDef || !toDef) return "—";

    return formatConvertedValue(convertLinearUnit(num, fromDef.toBase, toDef.toBase));
  };

  const result = calculate();
  const resultRef = useRef<HTMLOutputElement>(null);
  const { markStarted, selectMode } = useToolAnalytics(
    CONVERTER_TOOL_SLUG,
    resultRef,
    converterMode === "density" || result !== "—",
  );

  const handleConverterModeChange = (nextMode: ConverterMode) => {
    if (nextMode === converterMode) return;
    setConverterMode(nextMode);
    selectMode(`converter:${nextMode}`);
  };

  // При смене группы — сброс единиц
  const handleGroupChange = (idx: number) => {
    if (idx === groupIndex) return;
    const nextGroup = UNIT_GROUPS[idx];
    markStarted("category");
    trackToolModeChange(CONVERTER_TOOL_SLUG, `group:${nextGroup.id}`);
    setGroupIndex(idx);
    setFromUnit(nextGroup.units[0].key);
    setToUnit(nextGroup.units[1]?.key ?? nextGroup.units[0].key);
    setInputValue(UI_TEXT.defaultInputValue);
    setShowAllUnits(false);
  };

  const handleFromUnitChange = (nextUnit: string) => {
    if (nextUnit === fromUnit) return;
    markStarted("unit");
    setFromUnit(nextUnit);
  };

  const handleToUnitChange = (nextUnit: string) => {
    if (nextUnit === toUnit) return;
    markStarted("unit");
    setToUnit(nextUnit);
  };

  const handleInputChange = (nextValue: string) => {
    markStarted("value_input");
    setInputValue(nextValue);
  };

  const swap = () => {
    markStarted("unit");
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  return (
    <div className="page-container max-w-4xl py-4 sm:py-8">
      <Link
        href="/instrumenty/"
        className="mb-2 inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 hover:text-accent-600 sm:hidden"
      >
        ← Все инструменты
      </Link>
      {/* Breadcrumb */}
      <nav className="mb-6 hidden items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400 sm:flex">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbHome}</Link>
        <span>/</span>
        <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbTools}</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">{UI_TEXT.breadcrumbCurrent}</span>
      </nav>

      <div className="mb-4 sm:mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400 sm:hidden">
          Быстрый инструмент
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">
          {UI_TEXT.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          {UI_TEXT.description}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80" role="tablist" aria-label="Режим конвертера">
        <button
          type="button"
          role="tab"
          aria-selected={converterMode === "units"}
          onClick={() => handleConverterModeChange("units")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors ${
            converterMode === "units"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Единицы
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={converterMode === "density"}
          onClick={() => handleConverterModeChange("density")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors ${
            converterMode === "density"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Масса ↔ объём
        </button>
      </div>

      {converterMode === "units" ? (
        <>

      {/* Выбор категории */}
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {UNIT_GROUPS.map((g, i) => (
          <button
            key={g.id}
            onClick={() => handleGroupChange(i)}
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all ${
              i === groupIndex
                ? "bg-accent-500 text-white border-accent-500"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <span>{g.icon}</span>
            {g.label}
          </button>
        ))}
      </div>

      {/* Конвертер */}
      <div className="card p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-end gap-2 sm:gap-4">
          {/* Откуда */}
          <div>
            <label className="input-label">{UI_TEXT.fromLabel}</label>
            <select
              value={fromUnit}
              onChange={(e) => handleFromUnitChange(e.target.value)}
              className="input-field mb-2 w-full truncate px-2 sm:mb-3 sm:px-3"
              aria-label="Исходная единица"
            >
              {group.units.map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={UI_TEXT.inputPlaceholder}
              className="input-field w-full px-2 text-lg font-semibold sm:px-3"
              aria-label="Исходное значение"
            />
          </div>

          {/* Кнопка swap */}
          <div className="flex justify-center pb-1">
            <button
              onClick={swap}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title={UI_TEXT.swapTitle}
              aria-label={UI_TEXT.swapTitle}
            >
              ⇄
            </button>
          </div>

          {/* Куда */}
          <div>
            <label className="input-label">{UI_TEXT.toLabel}</label>
            <select
              value={toUnit}
              onChange={(e) => handleToUnitChange(e.target.value)}
              className="input-field mb-2 w-full truncate px-2 sm:mb-3 sm:px-3"
              aria-label="Целевая единица"
            >
              {group.units.map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
            <output ref={resultRef} className="input-field block w-full cursor-text select-all truncate border-accent-200 bg-accent-50 px-2 text-lg font-bold text-accent-700 dark:border-accent-800/40 dark:bg-accent-900/20 dark:text-accent-300 sm:px-3" aria-label="Результат">
              {result}
            </output>
          </div>
        </div>

        {/* Быстрые результаты по всем единицам */}
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700 sm:mt-6 sm:pt-5">
          <button
            type="button"
            onClick={() => setShowAllUnits((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between text-left sm:hidden"
            aria-expanded={showAllUnits}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Другие единицы</span>
              <span className="block text-[11px] text-slate-400">{group.units.length - 1} быстрых пересчётов</span>
            </span>
            <span aria-hidden className={`text-slate-400 transition-transform ${showAllUnits ? "rotate-180" : ""}`}>⌄</span>
          </button>
          <div className={`${showAllUnits ? "block" : "hidden"} sm:block`}>
          <p className="text-xs text-slate-400 dark:text-slate-400 font-medium uppercase tracking-wider mb-3">
            {inputValue || UI_TEXT.defaultInputValue} {group.units.find(u => u.key === fromUnit)?.label} {UI_TEXT.quickResultsSuffix}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.units
              .filter((u) => u.key !== fromUnit)
              .map((u) => {
                const num = parseUnitValue(inputValue);
                let res: string;
                if (num === null) {
                  res = "—";
                } else if (isTemperature) {
                  res = formatConvertedValue(convertTemperature(num, fromUnit, u.key));
                } else {
                  const fromDef = group.units.find((x) => x.key === fromUnit);
                  if (!fromDef) { res = "—"; }
                  else {
                    res = formatConvertedValue(convertLinearUnit(num, fromDef.toBase, u.toBase));
                  }
                }
                return (
                  <button
                    key={u.key}
                    onClick={() => handleToUnitChange(u.key)}
                    className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                      u.key === toUnit
                        ? "border-accent-400 bg-accent-50"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs text-slate-400 dark:text-slate-400 truncate">{u.label}</div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{res}</div>
                  </button>
                );
              })}
          </div>
          </div>
        </div>
      </div>

      <p className="mt-3 hidden text-center text-xs text-slate-400 dark:text-slate-400 sm:block">
        {UI_TEXT.quickTargetHint}
      </p>
        </>
      ) : (
        <DensityCalculator
          resultRef={resultRef}
          markStarted={markStarted}
          selectMode={selectMode}
        />
      )}
    </div>
  );
}

// ── Расчёт плотности ────────────────────────────────────────────────────────

const DENSITY_PRESETS = [
  { label: "Бетон М200", density: 2400 },
  { label: "Бетон М300", density: 2500 },
  { label: "Кирпич", density: 1800 },
  { label: "Газобетон марки D500 (плотность 500 кг/м³)", density: 500 },
  { label: "Газобетон марки D600 (плотность 600 кг/м³)", density: 600 },
  { label: "Пескобетон М300", density: 2200 },
  { label: "Цемент (насып.)", density: 1500 },
  { label: "Песок", density: 1600 },
  { label: "Щебень", density: 1400 },
  { label: "Керамзит", density: 450 },
  { label: "Минвата", density: 50 },
  { label: "Экструдированный пенополистирол (ЭППС)", density: 35 },
  { label: "Вода", density: 1000 },
  { label: "Краска акриловая", density: 1300 },
  { label: "Грунтовка", density: 1050 },
];

type DensityMode = "mass-to-volume" | "volume-to-mass";

interface DensityCalculatorProps {
  resultRef: Ref<HTMLOutputElement>;
  markStarted: (source: ToolInteractionSource) => void;
  selectMode: (mode: string) => void;
}

function DensityCalculator({
  resultRef,
  markStarted,
  selectMode,
}: DensityCalculatorProps) {
  const [mode, setMode] = useState<DensityMode>("mass-to-volume");
  const [densityInput, setDensityInput] = useState("2400");
  const [inputVal, setInputVal] = useState("1");

  const density = parseUnitValue(densityInput) ?? Number.NaN;
  const num = parseUnitValue(inputVal) ?? 0;
  const densityIsValid = Number.isFinite(density) && density > 0;
  const selectedPreset = DENSITY_PRESETS.find((preset) => preset.density === density);

  const result = useMemo(() => {
    if (!densityIsValid || num <= 0) return "—";
    if (mode === "mass-to-volume") return formatConvertedValue(num / density);
    if (mode === "volume-to-mass") return formatConvertedValue(num * density);
    return "—";
  }, [mode, density, densityIsValid, num]);

  const resultUnit = mode === "mass-to-volume" ? "м³" : "кг";
  const inputUnit = mode === "mass-to-volume" ? "кг" : "м³";

  const handleModeChange = (nextMode: DensityMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    selectMode(`density:${nextMode}`);
  };

  return (
    <div className="card p-4 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
        Масса ↔ Объём через плотность
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Пересчитайте килограммы в кубометры и обратно для строительных материалов.
      </p>

      {/* Режим */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => handleModeChange("mass-to-volume")}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
            mode === "mass-to-volume"
              ? "bg-accent-500 text-white border-accent-500"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          }`}
        >
          кг → м³
        </button>
        <button
          onClick={() => handleModeChange("volume-to-mass")}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
            mode === "volume-to-mass"
              ? "bg-accent-500 text-white border-accent-500"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          }`}
        >
          м³ → кг
        </button>
      </div>

      {/* Материал и его плотность */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="input-label">Материал</span>
          <select
            value={selectedPreset ? String(selectedPreset.density) : "custom"}
            onChange={(e) => {
              if (e.target.value === "custom" || e.target.value === densityInput) return;
              markStarted("preset");
              setDensityInput(e.target.value);
            }}
            className="input-field w-full"
          >
            {DENSITY_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.density}>{preset.label}</option>
            ))}
            <option value="custom">Своя плотность</option>
          </select>
        </label>
        <label className="block">
          <span className="input-label">Плотность, кг/м³</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            value={densityInput}
            onChange={(e) => {
              markStarted("value_input");
              setDensityInput(e.target.value);
            }}
            className="input-field w-full"
            aria-invalid={!densityIsValid}
            aria-describedby={!densityIsValid ? "density-error" : undefined}
          />
          {!densityIsValid && (
            <span id="density-error" className="mt-1 block text-xs text-red-600 dark:text-red-400">
              Укажите плотность больше 0 кг/м³
            </span>
          )}
        </label>
      </div>

      {/* Ввод / результат */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="density-value" className="input-label">Значение ({inputUnit})</label>
          <input
            id="density-value"
            type="number"
            inputMode="decimal"
            value={inputVal}
            onChange={(e) => {
              markStarted("value_input");
              setInputVal(e.target.value);
            }}
            className="input-field text-lg font-semibold"
          />
        </div>
        <div>
          <span className="input-label">Результат ({resultUnit})</span>
          <output ref={resultRef} className="input-field block text-lg font-bold text-accent-700 dark:text-accent-300 bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800/40" aria-label={`Результат (${resultUnit})`}>
            {result}
          </output>
        </div>
      </div>
    </div>
  );
}

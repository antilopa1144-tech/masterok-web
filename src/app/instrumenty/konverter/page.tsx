"use client";

import { useState } from "react";
import Link from "next/link";

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

function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number;
  if (from === "c") celsius = value;
  else if (from === "f") celsius = (value - 32) * 5 / 9;
  else celsius = value - 273.15;

  if (to === "c") return celsius;
  if (to === "f") return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

function formatResult(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 0.001 && abs < 1e10) {
    const decimals = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    return n.toLocaleString("ru-RU", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0,
    });
  }
  return n.toExponential(4);
}

export default function KonverterPage() {
  const [groupIndex, setGroupIndex] = useState(0);
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("mm");
  const [inputValue, setInputValue] = useState("1");

  const group = UNIT_GROUPS[groupIndex];
  const isTemperature = group.id === "temperature";

  // При смене группы — сброс единиц
  const handleGroupChange = (idx: number) => {
    setGroupIndex(idx);
    const g = UNIT_GROUPS[idx];
    setFromUnit(g.units[0].key);
    setToUnit(g.units[1]?.key ?? g.units[0].key);
    setInputValue(UI_TEXT.defaultInputValue);
  };

  const calculate = (): string => {
    const num = parseFloat(inputValue.replace(",", "."));
    if (isNaN(num)) return "—";

    if (isTemperature) {
      return formatResult(convertTemperature(num, fromUnit, toUnit));
    }

    const fromDef = group.units.find((u) => u.key === fromUnit);
    const toDef = group.units.find((u) => u.key === toUnit);
    if (!fromDef || !toDef) return "—";

    const baseValue = num * fromDef.toBase;
    return formatResult(baseValue / toDef.toBase);
  };

  const result = calculate();

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  return (
    <div className="page-container py-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbHome}</Link>
        <span>/</span>
        <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbTools}</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">{UI_TEXT.breadcrumbCurrent}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
        {UI_TEXT.title}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        {UI_TEXT.description}
      </p>

      {/* Выбор категории */}
      <div className="flex flex-wrap gap-2 mb-6">
        {UNIT_GROUPS.map((g, i) => (
          <button
            key={g.id}
            onClick={() => handleGroupChange(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
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
      <div className="card p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          {/* Откуда */}
          <div>
            <label className="input-label">{UI_TEXT.fromLabel}</label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="input-field mb-3"
            >
              {group.units.map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={UI_TEXT.inputPlaceholder}
              className="input-field text-lg font-semibold"
              autoFocus
            />
          </div>

          {/* Кнопка swap */}
          <div className="flex justify-center pb-1">
            <button
              onClick={swap}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 transition-colors text-lg"
              title={UI_TEXT.swapTitle}
            >
              ⇄
            </button>
          </div>

          {/* Куда */}
          <div>
            <label className="input-label">{UI_TEXT.toLabel}</label>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="input-field mb-3"
            >
              {group.units.map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
            <div className="input-field text-lg font-bold text-accent-600 dark:text-accent-300 bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800/40 select-all cursor-text">
              {result}
            </div>
          </div>
        </div>

        {/* Быстрые результаты по всем единицам */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mb-3">
            {inputValue || UI_TEXT.defaultInputValue} {group.units.find(u => u.key === fromUnit)?.label} {UI_TEXT.quickResultsSuffix}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.units
              .filter((u) => u.key !== fromUnit)
              .map((u) => {
                const num = parseFloat(inputValue.replace(",", ".")) || 1;
                let res: string;
                if (isTemperature) {
                  res = formatResult(convertTemperature(num, fromUnit, u.key));
                } else {
                  const fromDef = group.units.find((x) => x.key === fromUnit);
                  if (!fromDef) { res = "—"; }
                  else {
                    const base = num * fromDef.toBase;
                    res = formatResult(base / u.toBase);
                  }
                }
                return (
                  <button
                    key={u.key}
                    onClick={() => setToUnit(u.key)}
                    className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                      u.key === toUnit
                        ? "border-accent-400 bg-accent-50"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{u.label}</div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{res}</div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
        {UI_TEXT.quickTargetHint}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";

interface Material {
  name: string;
  pricePerM2: [number, number]; // min-max ₽/м²
  durabilityYears: [number, number];
  installDifficulty: 1 | 2 | 3; // 1=easy, 2=medium, 3=hard
  moistureResistance: 1 | 2 | 3; // 1=low, 2=medium, 3=high
  warmth: 1 | 2 | 3;
  soundInsulation: 1 | 2 | 3;
  repairability: 1 | 2 | 3;
  extras: string;
  verdict: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  unit: string;
  materials: Material[];
}

const CATEGORIES: Category[] = [
  {
    id: "flooring",
    label: "Напольные покрытия",
    icon: "🏠",
    unit: "₽/м²",
    materials: [
      { name: "Ламинат 32 класс", pricePerM2: [500, 1200], durabilityYears: [7, 15], installDifficulty: 1, moistureResistance: 1, warmth: 2, soundInsulation: 1, repairability: 2, extras: "Подложка 50-90 ₽/м², плинтус", verdict: "Оптимальный вариант для жилых комнат" },
      { name: "Ламинат 33-34 класс", pricePerM2: [900, 2000], durabilityYears: [15, 25], installDifficulty: 1, moistureResistance: 2, warmth: 2, soundInsulation: 2, repairability: 2, extras: "Подложка, плинтус, порожки", verdict: "Для высокой проходимости и кухни" },
      { name: "Линолеум бытовой", pricePerM2: [200, 600], durabilityYears: [5, 10], installDifficulty: 1, moistureResistance: 3, warmth: 2, soundInsulation: 2, repairability: 1, extras: "Клей/скотч 30-80 ₽/м², плинтус", verdict: "Самый бюджетный, подходит для съёмного жилья" },
      { name: "Линолеум полукоммерческий", pricePerM2: [500, 1000], durabilityYears: [10, 20], installDifficulty: 1, moistureResistance: 3, warmth: 2, soundInsulation: 2, repairability: 1, extras: "Клей, плинтус, сварка швов", verdict: "Хорош для кухни и прихожей" },
      { name: "Керамогранит", pricePerM2: [800, 2500], durabilityYears: [30, 50], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, крестики, СВП", verdict: "Ванная, кухня, прихожая. Вечный вариант" },
      { name: "Кварцвиниловая плитка (SPC)", pricePerM2: [1000, 2500], durabilityYears: [15, 25], installDifficulty: 1, moistureResistance: 3, warmth: 2, soundInsulation: 2, repairability: 2, extras: "Подложка (встроена), плинтус", verdict: "Современная альтернатива ламинату, не боится воды" },
      { name: "Паркетная доска", pricePerM2: [1500, 4000], durabilityYears: [20, 40], installDifficulty: 2, moistureResistance: 1, warmth: 3, soundInsulation: 2, repairability: 3, extras: "Подложка, клей/замок, масло/лак", verdict: "Премиум. Тепло, красиво, можно циклевать" },
      { name: "Плитка керамическая", pricePerM2: [500, 1500], durabilityYears: [20, 40], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, крестики", verdict: "Классика для мокрых зон" },
    ],
  },
  {
    id: "walls",
    label: "Отделка стен",
    icon: "🧱",
    unit: "₽/м²",
    materials: [
      { name: "Обои виниловые", pricePerM2: [150, 500], durabilityYears: [5, 10], installDifficulty: 1, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 1, extras: "Клей 30-50 ₽/м²", verdict: "Самый популярный вариант для жилых комнат" },
      { name: "Обои флизелиновые под покраску", pricePerM2: [100, 300], durabilityYears: [10, 15], installDifficulty: 1, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей + краска 100-200 ₽/м²", verdict: "Можно перекрашивать 5-8 раз" },
      { name: "Краска интерьерная", pricePerM2: [80, 250], durabilityYears: [5, 8], installDifficulty: 2, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Грунтовка, шпаклёвка (стены должны быть идеальные)", verdict: "Требует идеальных стен, зато легко обновить" },
      { name: "Декоративная штукатурка", pricePerM2: [300, 1500], durabilityYears: [15, 25], installDifficulty: 3, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Грунтовка, колер, воск/лак", verdict: "Эффектно, но нужен мастер" },
      { name: "Керамическая плитка", pricePerM2: [500, 1500], durabilityYears: [20, 40], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, СВП", verdict: "Ванная и кухонный фартук" },
      { name: "Стеновые панели ПВХ", pricePerM2: [200, 600], durabilityYears: [10, 15], installDifficulty: 1, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Обрешётка или клей", verdict: "Бюджетно для ванной и балкона" },
    ],
  },
  {
    id: "insulation",
    label: "Утеплители",
    icon: "🧤",
    unit: "₽/м²",
    materials: [
      { name: "Минвата (Rockwool, Технониколь)", pricePerM2: [150, 400], durabilityYears: [30, 50], installDifficulty: 2, moistureResistance: 1, warmth: 3, soundInsulation: 3, repairability: 1, extras: "Мембрана, крепёж, пароизоляция", verdict: "Универсальный, негорючий. Стены, кровля, перекрытия" },
      { name: "Пенополистирол (ППС/EPS)", pricePerM2: [100, 250], durabilityYears: [20, 30], installDifficulty: 1, moistureResistance: 2, warmth: 2, soundInsulation: 1, repairability: 1, extras: "Клей, дюбели, сетка", verdict: "Бюджетный для фасадов (мокрая система)" },
      { name: "Экструдированный пенополистирол (XPS)", pricePerM2: [200, 500], durabilityYears: [40, 50], installDifficulty: 1, moistureResistance: 3, warmth: 3, soundInsulation: 1, repairability: 1, extras: "Клей, дюбели", verdict: "Фундамент, отмостка, подвалы — не боится воды" },
      { name: "PIR-плиты", pricePerM2: [400, 800], durabilityYears: [30, 50], installDifficulty: 2, moistureResistance: 3, warmth: 3, soundInsulation: 2, repairability: 1, extras: "Скотч для стыков", verdict: "Максимальная теплоизоляция при минимальной толщине" },
      { name: "Эковата", pricePerM2: [100, 300], durabilityYears: [20, 40], installDifficulty: 3, moistureResistance: 1, warmth: 3, soundInsulation: 3, repairability: 1, extras: "Задувка аппаратом, мембраны", verdict: "Хороша для каркасных домов, без мостиков холода" },
    ],
  },
];

const LEVEL_LABELS: Record<number, string> = { 1: "Низкая", 2: "Средняя", 3: "Высокая" };
const DIFFICULTY_LABELS: Record<number, string> = { 1: "Легко", 2: "Средне", 3: "Сложно" };
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  3: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};
const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  3: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function Badge({ level, labels = LEVEL_LABELS, colors = LEVEL_COLORS }: { level: number; labels?: Record<number, string>; colors?: Record<number, string> }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[level]}`}>
      {labels[level]}
    </span>
  );
}

export default function MaterialComparison() {
  const [categoryId, setCategoryId] = useState("flooring");
  const category = CATEGORIES.find((c) => c.id === categoryId)!;

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
              categoryId === c.id
                ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
                : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category.materials.map((mat) => (
          <div key={mat.name} className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{mat.name}</h3>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Цена</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {mat.pricePerM2[0]}–{mat.pricePerM2[1]} {category.unit}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Срок службы</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {mat.durabilityYears[0]}–{mat.durabilityYears[1]} лет
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <div className="text-xs text-slate-500">Монтаж: <Badge level={mat.installDifficulty} labels={DIFFICULTY_LABELS} colors={DIFFICULTY_COLORS} /></div>
              <div className="text-xs text-slate-500">Влага: <Badge level={mat.moistureResistance} /></div>
              <div className="text-xs text-slate-500">Тепло: <Badge level={mat.warmth} /></div>
              <div className="text-xs text-slate-500">Звук: <Badge level={mat.soundInsulation} /></div>
            </div>

            <p className="text-xs text-slate-400">{mat.extras}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{mat.verdict}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

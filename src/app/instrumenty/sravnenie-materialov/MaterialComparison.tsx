"use client";

import { useState, useEffect } from "react";
import { getPrices, setPrice } from "@/lib/userPrices";

const COMPARISON_SCOPE = "comparison";

interface Material {
  name: string;
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
      { name: "Ламинат 32 класс", durabilityYears: [7, 15], installDifficulty: 1, moistureResistance: 1, warmth: 2, soundInsulation: 1, repairability: 2, extras: "Подложка 50-90 ₽/м², плинтус", verdict: "Оптимальный вариант для жилых комнат" },
      { name: "Ламинат 33-34 класс", durabilityYears: [15, 25], installDifficulty: 1, moistureResistance: 2, warmth: 2, soundInsulation: 2, repairability: 2, extras: "Подложка, плинтус, порожки", verdict: "Для высокой проходимости и кухни" },
      { name: "Линолеум бытовой", durabilityYears: [5, 10], installDifficulty: 1, moistureResistance: 3, warmth: 2, soundInsulation: 2, repairability: 1, extras: "Клей/скотч 30-80 ₽/м², плинтус", verdict: "Самый бюджетный, подходит для съёмного жилья" },
      { name: "Линолеум полукоммерческий", durabilityYears: [10, 20], installDifficulty: 1, moistureResistance: 3, warmth: 2, soundInsulation: 2, repairability: 1, extras: "Клей, плинтус, сварка швов", verdict: "Хорош для кухни и прихожей" },
      { name: "Керамогранит", durabilityYears: [30, 50], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, крестики, СВП", verdict: "Ванная, кухня, прихожая. Вечный вариант" },
      { name: "Кварцвиниловая плитка (SPC)", durabilityYears: [15, 25], installDifficulty: 1, moistureResistance: 3, warmth: 2, soundInsulation: 2, repairability: 2, extras: "Подложка (встроена), плинтус", verdict: "Современная альтернатива ламинату, не боится воды" },
      { name: "Паркетная доска", durabilityYears: [20, 40], installDifficulty: 2, moistureResistance: 1, warmth: 3, soundInsulation: 2, repairability: 3, extras: "Подложка, клей/замок, масло/лак", verdict: "Премиум. Тепло, красиво, можно циклевать" },
      { name: "Плитка керамическая", durabilityYears: [20, 40], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, крестики", verdict: "Классика для мокрых зон" },
    ],
  },
  {
    id: "walls",
    label: "Отделка стен",
    icon: "🧱",
    unit: "₽/м²",
    materials: [
      { name: "Обои виниловые", durabilityYears: [5, 10], installDifficulty: 1, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 1, extras: "Клей 30-50 ₽/м²", verdict: "Самый популярный вариант для жилых комнат" },
      { name: "Обои флизелиновые под покраску", durabilityYears: [10, 15], installDifficulty: 1, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей + краска 100-200 ₽/м²", verdict: "Можно перекрашивать 5-8 раз" },
      { name: "Краска интерьерная", durabilityYears: [5, 8], installDifficulty: 2, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Грунтовка, шпаклёвка (стены должны быть идеальные)", verdict: "Требует идеальных стен, зато легко обновить" },
      { name: "Декоративная штукатурка", durabilityYears: [15, 25], installDifficulty: 3, moistureResistance: 2, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Грунтовка, колер, воск/лак", verdict: "Эффектно, но нужен мастер" },
      { name: "Керамическая плитка", durabilityYears: [20, 40], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, СВП", verdict: "Ванная и кухонный фартук" },
      { name: "Стеновые панели ПВХ", durabilityYears: [10, 15], installDifficulty: 1, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Обрешётка или клей", verdict: "Бюджетно для ванной и балкона" },
    ],
  },
  {
    id: "insulation",
    label: "Утеплители",
    icon: "🧤",
    unit: "₽/м²",
    materials: [
      { name: "Минвата (Rockwool, Технониколь)", durabilityYears: [30, 50], installDifficulty: 2, moistureResistance: 1, warmth: 3, soundInsulation: 3, repairability: 1, extras: "Мембрана, крепёж, пароизоляция", verdict: "Универсальный, негорючий. Стены, кровля, перекрытия" },
      { name: "Пенополистирол (ППС/EPS)", durabilityYears: [20, 30], installDifficulty: 1, moistureResistance: 2, warmth: 2, soundInsulation: 1, repairability: 1, extras: "Клей, дюбели, сетка", verdict: "Бюджетный для фасадов (мокрая система)" },
      { name: "Экструдированный пенополистирол (XPS)", durabilityYears: [40, 50], installDifficulty: 1, moistureResistance: 3, warmth: 3, soundInsulation: 1, repairability: 1, extras: "Клей, дюбели", verdict: "Фундамент, отмостка, подвалы — не боится воды" },
      { name: "PIR-плиты", durabilityYears: [30, 50], installDifficulty: 2, moistureResistance: 3, warmth: 3, soundInsulation: 2, repairability: 1, extras: "Скотч для стыков", verdict: "Максимальная теплоизоляция при минимальной толщине" },
      { name: "Эковата", durabilityYears: [20, 40], installDifficulty: 3, moistureResistance: 1, warmth: 3, soundInsulation: 3, repairability: 1, extras: "Задувка аппаратом, мембраны", verdict: "Хороша для каркасных домов, без мостиков холода" },
    ],
  },
  {
    id: "roofing",
    label: "Кровельные материалы",
    icon: "🏠",
    unit: "₽/м²",
    materials: [
      { name: "Металлочерепица", durabilityYears: [25, 50], installDifficulty: 2, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Саморезы, конёк, ендовы, торцевые", verdict: "Классика для частных домов, лёгкая и долговечная" },
      { name: "Профнастил С21/НС35", durabilityYears: [25, 40], installDifficulty: 1, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Саморезы, конёк, уплотнитель", verdict: "Бюджетнее металлочерепицы, проще монтаж" },
      { name: "Мягкая кровля (гибкая черепица)", durabilityYears: [20, 40], installDifficulty: 2, moistureResistance: 3, warmth: 1, soundInsulation: 2, repairability: 2, extras: "Подкладочный ковёр, гвозди, мастика, OSB", verdict: "Тихая, красивая, подходит для сложных крыш" },
      { name: "Ондулин", durabilityYears: [10, 20], installDifficulty: 1, moistureResistance: 3, warmth: 1, soundInsulation: 2, repairability: 1, extras: "Гвозди с шляпками, конёк", verdict: "Самый бюджетный, лёгкий, подходит для дачи" },
      { name: "Фальцевая кровля", durabilityYears: [40, 60], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Кляммеры, герметик, обрешётка", verdict: "Премиум: герметичные швы, максимальный срок" },
      { name: "Композитная черепица", durabilityYears: [30, 50], installDifficulty: 2, moistureResistance: 3, warmth: 1, soundInsulation: 2, repairability: 2, extras: "Крепёж, доборные элементы", verdict: "Тихая, лёгкая, выглядит как керамика" },
    ],
  },
  {
    id: "ceilings",
    label: "Потолки",
    icon: "📐",
    unit: "₽/м²",
    materials: [
      { name: "Натяжной потолок (ПВХ)", durabilityYears: [10, 20], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 1, extras: "Профиль, закладные под светильники", verdict: "Быстро, ровно, не боится затопления. Нужен мастер" },
      { name: "Натяжной (тканевый)", durabilityYears: [15, 25], installDifficulty: 3, moistureResistance: 1, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Профиль, закладные", verdict: "Дышит, не деформируется. Премиум-вариант" },
      { name: "Гипсокартон (ГКЛ)", durabilityYears: [15, 30], installDifficulty: 2, moistureResistance: 1, warmth: 1, soundInsulation: 2, repairability: 3, extras: "Профили, саморезы, шпаклёвка, краска", verdict: "Можно делать уровни, ниши, подсветку" },
      { name: "Покраска (по шпаклёвке)", durabilityYears: [5, 8], installDifficulty: 2, moistureResistance: 1, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Шпаклёвка, грунтовка, краска", verdict: "Самый бюджетный, но нужны ровные потолки" },
      { name: "Реечный потолок (алюминий)", durabilityYears: [20, 30], installDifficulty: 1, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Стрингеры, пристенный профиль", verdict: "Ванная и кухня — не боится влаги" },
      { name: "Кассетный потолок (Armstrong)", durabilityYears: [15, 25], installDifficulty: 1, moistureResistance: 2, warmth: 1, soundInsulation: 2, repairability: 3, extras: "T-профиль, подвесы", verdict: "Офисы, подсобки — легко заменить кассету" },
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

type Priority = "budget" | "durability" | "diy";

const PRIORITY_OPTIONS: { value: Priority; label: string; icon: string }[] = [
  { value: "budget", label: "Бюджет", icon: "💰" },
  { value: "durability", label: "Долговечность", icon: "⏳" },
  { value: "diy", label: "Своими руками", icon: "🔧" },
];

function scoreMaterial(mat: Material, priority: Priority | null, userPrice: number): number {
  if (!priority) return 0;
  if (priority === "budget") {
    if (userPrice <= 0) return -1; // материалы без цены опускаются в конец сортировки
    return 4 - Math.round(userPrice / 500);
  }
  if (priority === "durability") return Math.round((mat.durabilityYears[0] + mat.durabilityYears[1]) / 2 / 10);
  if (priority === "diy") return 4 - mat.installDifficulty;
  return 0;
}

export default function MaterialComparison() {
  const [categoryId, setCategoryId] = useState("flooring");
  const [priority, setPriority] = useState<Priority | null>(null);
  const [userPrices, setUserPrices] = useState<Record<string, number>>({});
  const category = CATEGORIES.find((c) => c.id === categoryId)!;

  useEffect(() => {
    let cancelled = false;
    void getPrices(COMPARISON_SCOPE).then((prices) => {
      if (!cancelled) setUserPrices(prices);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePriceChange = (name: string, value: number) => {
    void setPrice(COMPARISON_SCOPE, name, value);
    setUserPrices((prev) => {
      const next = { ...prev };
      if (value > 0) next[name] = value;
      else delete next[name];
      return next;
    });
  };

  const sortedMaterials = [...category.materials].sort((a, b) => {
    if (!priority) return 0;
    return scoreMaterial(b, priority, userPrices[b.name] ?? 0) - scoreMaterial(a, priority, userPrices[a.name] ?? 0);
  });

  const topScore = priority
    ? Math.max(...sortedMaterials.map((m) => scoreMaterial(m, priority, userPrices[m.name] ?? 0)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCategoryId(c.id); setPriority(null); }}
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

      {/* Priority filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500 dark:text-slate-400">Что важнее:</span>
        {PRIORITY_OPTIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPriority(priority === p.value ? null : p.value)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              priority === p.value
                ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
                : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedMaterials.map((mat) => {
          const userPrice = userPrices[mat.name] ?? 0;
          const isBest = priority && scoreMaterial(mat, priority, userPrice) === topScore && topScore > 0;
          return (
          <div key={mat.name} className={`card p-5 space-y-3 ${isBest ? "ring-2 ring-accent-400 dark:ring-accent-500" : ""}`}>
            {isBest && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/30 px-2 py-0.5 rounded-full">
                🏆 Лучший выбор
              </span>
            )}
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{mat.name}</h3>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Ваша цена, {category.unit}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={userPrice || ""}
                  placeholder="—"
                  onChange={(e) => handlePriceChange(mat.name, Number(e.target.value) || 0)}
                  className={`w-full text-sm border rounded-lg px-2 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500/30 ${
                    userPrice > 0
                      ? "border-accent-300 dark:border-accent-600 bg-accent-50/50 dark:bg-accent-900/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}
                />
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
          );
        })}
      </div>
    </div>
  );
}

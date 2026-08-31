"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
import {
  trackToolModeChange,
  trackToolPresetSelect,
  trackToolRelatedClick,
} from "@/lib/analytics";
import { getPrices, setPrice } from "@/lib/userPrices";
import {
  getMaterialComparisonRecommendation,
  type MaterialComparisonPriority,
} from "@/lib/tools/material-comparison";
import {
  buildCalculatorHrefForComparedMaterial,
  getCalculatorLinkForComparedMaterial,
  isMaterialComparisonCategoryId,
  MATERIAL_COMPARISON_TOOL_SLUG,
  readMaterialComparisonTransfer,
  type MaterialComparisonCategoryId,
} from "@/lib/tools/material-comparison-links";

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
  id: MaterialComparisonCategoryId;
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
      { name: "Керамогранит", durabilityYears: [30, 50], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, крестики, система выравнивания плитки", verdict: "Ванная, кухня, прихожая. Долговечный вариант" },
      { name: "Кварцвиниловая плитка на жёсткой основе (SPC)", durabilityYears: [15, 25], installDifficulty: 1, moistureResistance: 3, warmth: 2, soundInsulation: 2, repairability: 2, extras: "Подложка (часто встроена), плинтус", verdict: "Современная альтернатива ламинату, не боится воды" },
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
      { name: "Керамическая плитка", durabilityYears: [20, 40], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 3, extras: "Клей, затирка, система выравнивания плитки", verdict: "Ванная и кухонный фартук" },
      { name: "Пластиковые стеновые панели (ПВХ)", durabilityYears: [10, 15], installDifficulty: 1, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 2, extras: "Обрешётка или клей", verdict: "Бюджетно для ванной и балкона" },
    ],
  },
  {
    id: "insulation",
    label: "Утеплители",
    icon: "🧤",
    unit: "₽/м²",
    materials: [
      { name: "Минвата (Rockwool, Технониколь)", durabilityYears: [30, 50], installDifficulty: 2, moistureResistance: 1, warmth: 3, soundInsulation: 3, repairability: 1, extras: "Мембрана, крепёж, пароизоляция", verdict: "Универсальный, негорючий. Стены, кровля, перекрытия" },
      { name: "Обычный пенополистирол (пенопласт)", durabilityYears: [20, 30], installDifficulty: 1, moistureResistance: 2, warmth: 2, soundInsulation: 1, repairability: 1, extras: "Клей, дюбели, сетка", verdict: "Бюджетный для фасадов (штукатурная система)" },
      { name: "Экструдированный пенополистирол (ЭППС)", durabilityYears: [40, 50], installDifficulty: 1, moistureResistance: 3, warmth: 3, soundInsulation: 1, repairability: 1, extras: "Клей, дюбели", verdict: "Фундамент, отмостка, подвалы — не боится воды" },
      { name: "Плиты из полиизоцианурата (PIR)", durabilityYears: [30, 50], installDifficulty: 2, moistureResistance: 3, warmth: 3, soundInsulation: 2, repairability: 1, extras: "Лента для герметизации стыков", verdict: "Максимальная теплоизоляция при минимальной толщине" },
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
      { name: "Мягкая кровля (гибкая черепица)", durabilityYears: [20, 40], installDifficulty: 2, moistureResistance: 3, warmth: 1, soundInsulation: 2, repairability: 2, extras: "Подкладочный ковёр, гвозди, мастика, ОСП-плиты", verdict: "Тихая, красивая, подходит для сложных крыш" },
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
      { name: "Натяжной потолок из пластиковой плёнки (ПВХ)", durabilityYears: [10, 20], installDifficulty: 3, moistureResistance: 3, warmth: 1, soundInsulation: 1, repairability: 1, extras: "Профиль, закладные под светильники", verdict: "Быстро, ровно, не боится затопления. Нужен мастер" },
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

const PRIORITY_OPTIONS: { value: MaterialComparisonPriority; label: string; icon: string }[] = [
  { value: "budget", label: "Бюджет", icon: "💰" },
  { value: "durability", label: "Долговечность", icon: "⏳" },
  { value: "diy", label: "Своими руками", icon: "🔧" },
];

function ComparisonRow({ label, first, second }: { label: string; first: ReactNode; second: ReactNode }) {
  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)]">
      <span className="text-[10px] font-medium leading-tight text-slate-400 sm:text-xs">{label}</span>
      <div className="min-w-0 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 sm:text-sm">{first}</div>
      <div className="min-w-0 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 sm:text-sm">{second}</div>
    </div>
  );
}

export default function MaterialComparison() {
  const searchParams = useSearchParams();
  const requestedCategoryId = searchParams.get("category");
  const initialCategoryId = isMaterialComparisonCategoryId(requestedCategoryId)
    ? requestedCategoryId
    : "flooring";
  const initialCategory = CATEGORIES.find((item) => item.id === initialCategoryId) ?? CATEGORIES[0];
  const [categoryId, setCategoryId] = useState<MaterialComparisonCategoryId>(initialCategory.id);
  const [firstMaterialName, setFirstMaterialName] = useState(initialCategory.materials[0].name);
  const [secondMaterialName, setSecondMaterialName] = useState(
    initialCategory.materials[1]?.name ?? initialCategory.materials[0].name,
  );
  const [priority, setPriority] = useState<MaterialComparisonPriority | null>(null);
  const [userPrices, setUserPrices] = useState<Record<string, number>>({});
  const resultRef = useRef<HTMLElement>(null);
  const { markStarted } = useToolAnalytics(
    MATERIAL_COMPARISON_TOOL_SLUG,
    resultRef,
  );
  const category = CATEGORIES.find((c) => c.id === categoryId)!;
  const firstMaterial = category.materials.find((material) => material.name === firstMaterialName) ?? category.materials[0];
  const secondMaterial = category.materials.find((material) => material.name === secondMaterialName) ?? category.materials[1] ?? category.materials[0];
  const firstPrice = userPrices[firstMaterial.name] ?? 0;
  const secondPrice = userPrices[secondMaterial.name] ?? 0;
  const transfer = readMaterialComparisonTransfer(searchParams);
  const hasActiveTransfer = transfer?.categoryId === categoryId;

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
    markStarted("value_input");
    void setPrice(COMPARISON_SCOPE, name, value);
    setUserPrices((prev) => {
      const next = { ...prev };
      if (value > 0) next[name] = value;
      else delete next[name];
      return next;
    });
  };

  const handleCategoryChange = (nextCategoryId: MaterialComparisonCategoryId) => {
    if (nextCategoryId === categoryId) return;
    markStarted("category");
    const nextCategory = CATEGORIES.find((item) => item.id === nextCategoryId) ?? CATEGORIES[0];
    setCategoryId(nextCategory.id);
    setFirstMaterialName(nextCategory.materials[0].name);
    setSecondMaterialName(nextCategory.materials[1]?.name ?? nextCategory.materials[0].name);
    setPriority(null);
    trackToolModeChange(MATERIAL_COMPARISON_TOOL_SLUG, `category:${nextCategory.id}`);
  };

  const handleMaterialChange = (label: "A" | "B", name: string) => {
    markStarted("preset");
    if (label === "A") setFirstMaterialName(name);
    else setSecondMaterialName(name);
    trackToolPresetSelect(MATERIAL_COMPARISON_TOOL_SLUG, "material", `${label}:${name}`);
  };

  const handlePriorityChange = (value: MaterialComparisonPriority) => {
    markStarted("priority");
    const nextPriority = priority === value ? null : value;
    setPriority(nextPriority);
    trackToolModeChange(
      MATERIAL_COMPARISON_TOOL_SLUG,
      nextPriority ? `priority:${nextPriority}` : "priority:none",
    );
  };

  const recommendation = getMaterialComparisonRecommendation({
    first: firstMaterial,
    second: secondMaterial,
    priority,
    firstPrice,
    secondPrice,
  });
  const firstWins = recommendation.kind === "winner" && recommendation.winnerName === firstMaterial.name;
  const secondWins = recommendation.kind === "winner" && recommendation.winnerName === secondMaterial.name;
  const selectedCalculatorCandidates = [firstMaterial, secondMaterial]
    .map((material) => {
      const calculatorLink = getCalculatorLinkForComparedMaterial(material.name);
      const href = buildCalculatorHrefForComparedMaterial(material.name);
      return calculatorLink && href
        ? { ...calculatorLink, href, materialName: material.name }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const selectedCalculatorLinks = Array.from(
    new Map(
      selectedCalculatorCandidates.map((item) => [item.calculatorSlug, item]),
    ).values(),
  );

  const renderPicker = (
    label: "A" | "B",
    material: Material,
    price: number,
    otherMaterialName: string,
    onMaterialChange: (name: string) => void,
  ) => (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">{label}</span>
        <span className="text-[10px] text-slate-400">{category.materials.length} вариантов</span>
      </div>
      <label htmlFor={`comparison-material-${label}`} className="sr-only">Материал {label}</label>
      <select
        id={`comparison-material-${label}`}
        value={material.name}
        onChange={(event) => onMaterialChange(event.target.value)}
        className="input-field min-h-12 w-full text-sm"
      >
        {category.materials.map((item) => (
          <option key={item.name} value={item.name} disabled={item.name === otherMaterialName}>{item.name}</option>
        ))}
      </select>
      <label htmlFor={`comparison-price-${label}`} className="mt-3 block text-xs font-medium text-slate-500 dark:text-slate-400">
        Ваша цена, {category.unit}
      </label>
      <input
        id={`comparison-price-${label}`}
        type="number"
        inputMode="decimal"
        min={0}
        step={1}
        value={price || ""}
        placeholder="Не указана"
        onChange={(event) => handlePriceChange(material.name, Number(event.target.value) || 0)}
        className={`mt-1 min-h-12 w-full rounded-lg border px-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-accent-500/30 dark:text-slate-100 ${
          price > 0
            ? "border-accent-300 bg-accent-50/50 dark:border-accent-700 dark:bg-accent-950/20"
            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        }`}
      />
    </div>
  );

  return (
    <div className="max-w-6xl space-y-4">
      {hasActiveTransfer && (
        <div
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300"
          data-testid="material-comparison-transfer-banner"
        >
          Из калькулятора выбрана только подходящая категория. Два материала, ваши цены и главный приоритет нужно выбрать здесь — готовый победитель не переносится.
        </div>
      )}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2" role="group" aria-label="Категория материалов">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={categoryId === c.id}
            onClick={() => handleCategoryChange(c.id)}
            className={`min-h-11 rounded-xl border px-4 text-sm transition-colors ${
              categoryId === c.id
                ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-medium"
                : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="card order-2 space-y-5 p-4 sm:p-5 lg:order-1 lg:sticky lg:top-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">Настройка пары</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Выберите два материала</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Цена необязательна, кроме сравнения по бюджету.</p>
          </div>

          <div className="space-y-3">
            {renderPicker("A", firstMaterial, firstPrice, secondMaterial.name, (name) => handleMaterialChange("A", name))}
            {renderPicker("B", secondMaterial, secondPrice, firstMaterial.name, (name) => handleMaterialChange("B", name))}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Что важнее</legend>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={priority === option.value}
                  onClick={() => handlePriorityChange(option.value)}
                  className={`min-h-16 rounded-xl border px-2 py-2 text-xs transition-colors ${
                    priority === option.value
                      ? "border-accent-400 bg-accent-50 font-semibold text-accent-700 dark:bg-accent-900/20 dark:text-accent-300"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  <span className="mb-1 block text-lg" aria-hidden="true">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section ref={resultRef} className="card order-1 overflow-hidden lg:order-2">
          <div className={`border-b p-4 sm:p-5 ${recommendation.kind === "winner" ? "border-accent-200 bg-accent-50 dark:border-accent-800 dark:bg-accent-950/20" : "border-violet-200 bg-violet-50 dark:border-violet-800/50 dark:bg-violet-950/20"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
              {recommendation.kind === "winner" ? "Рекомендация по выбранному критерию" : recommendation.kind === "tie" ? "Результат: паритет" : "Сравнение A ↔ B"}
            </p>
            <h2 className="mt-2 text-xl font-bold leading-snug text-slate-950 dark:text-white sm:text-2xl">
              {recommendation.kind === "winner"
                ? `🏆 ${recommendation.winnerName}`
                : recommendation.kind === "tie"
                  ? "Оба варианта равны по этому критерию"
                  : recommendation.kind === "needs-prices"
                    ? "Для бюджета нужны две цены"
                    : "Выберите главный приоритет"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{recommendation.reason}</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-[74px_minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)]">
              <span />
              <div className={`rounded-xl border p-3 text-center ${firstWins ? "border-accent-400 bg-accent-50 dark:bg-accent-950/20" : "border-slate-200 dark:border-slate-700"}`}>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Вариант A</span>
                <p className="mt-1 break-words text-xs font-bold leading-snug text-slate-950 dark:text-white sm:text-sm">{firstMaterial.name}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${secondWins ? "border-accent-400 bg-accent-50 dark:bg-accent-950/20" : "border-slate-200 dark:border-slate-700"}`}>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Вариант B</span>
                <p className="mt-1 break-words text-xs font-bold leading-snug text-slate-950 dark:text-white sm:text-sm">{secondMaterial.name}</p>
              </div>
            </div>

            <div className="mt-2">
              <ComparisonRow label="Цена" first={firstPrice > 0 ? `${firstPrice.toLocaleString("ru-RU")} ${category.unit}` : "Не указана"} second={secondPrice > 0 ? `${secondPrice.toLocaleString("ru-RU")} ${category.unit}` : "Не указана"} />
              <ComparisonRow label="Срок службы" first={`${firstMaterial.durabilityYears[0]}–${firstMaterial.durabilityYears[1]} лет`} second={`${secondMaterial.durabilityYears[0]}–${secondMaterial.durabilityYears[1]} лет`} />
              <ComparisonRow label="Монтаж" first={<Badge level={firstMaterial.installDifficulty} labels={DIFFICULTY_LABELS} colors={DIFFICULTY_COLORS} />} second={<Badge level={secondMaterial.installDifficulty} labels={DIFFICULTY_LABELS} colors={DIFFICULTY_COLORS} />} />
              <ComparisonRow label="Влагостойкость" first={<Badge level={firstMaterial.moistureResistance} />} second={<Badge level={secondMaterial.moistureResistance} />} />
              <ComparisonRow label="Тепло" first={<Badge level={firstMaterial.warmth} />} second={<Badge level={secondMaterial.warmth} />} />
              <ComparisonRow label="Звукоизоляция" first={<Badge level={firstMaterial.soundInsulation} />} second={<Badge level={secondMaterial.soundInsulation} />} />
              <ComparisonRow label="Ремонтопригодность" first={<Badge level={firstMaterial.repairability} />} second={<Badge level={secondMaterial.repairability} />} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[{ label: "A", material: firstMaterial }, { label: "B", material: secondMaterial }].map(({ label, material }) => (
                <details key={label} className="group rounded-xl border border-slate-200 dark:border-slate-700">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-slate-700 [&::-webkit-details-marker]:hidden dark:text-slate-200">
                    Что ещё понадобится · {label}
                    <span className="text-lg text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
                  </summary>
                  <div className="border-t border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{material.extras}</p>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-200">{material.verdict}</p>
                  </div>
                </details>
              ))}
            </div>

            {selectedCalculatorLinks.length > 0 && (
              <div
                className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20"
                data-testid="material-comparison-calculator-links"
              >
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                  Рассчитать количество выбранного материала
                </p>
                <p className="mt-1 text-xs leading-relaxed text-violet-800/80 dark:text-violet-300/80">
                  Сравнение помогает выбрать вариант, а калькулятор отдельно посчитает объём и количество к покупке.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedCalculatorLinks.map((item) => (
                    <Link
                      key={item.calculatorSlug}
                      href={item.href}
                      onClick={() => trackToolRelatedClick(MATERIAL_COMPARISON_TOOL_SLUG, item.calculatorSlug)}
                      className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm no-underline transition-colors hover:border-violet-400 dark:border-violet-900/70 dark:bg-slate-900"
                    >
                      <span className="block font-semibold text-violet-900 dark:text-violet-200">
                        {item.calculatorTitle}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">
                        Для варианта «{item.materialName}»
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-4 text-[10px] leading-relaxed text-slate-400">Оценки характеристик — сравнительные ориентиры внутри выбранной категории. Цена вводится пользователем и не включает перечисленные сопутствующие материалы.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

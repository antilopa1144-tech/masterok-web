import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CHECKLISTS, COMPLEXITY_LABELS } from "@/lib/checklists";
import CategoryIcon from "@/components/ui/CategoryIcon";

export const metadata: Metadata = {
  title: "Инструменты строителя — конвертер, площадь, чек-листы | Мастерок",
  description: "Бесплатные инструменты для строительства и ремонта: конвертер единиц, расчёт площади комнаты, калькулятор и чек-листы работ.",
};

const TOOLS = [
  {
    href: "/instrumenty/konverter/",
    icon: "converter",
    title: "Конвертер единиц",
    desc: "Длина, площадь, объём, масса, давление. Быстрый пересчёт строительных единиц.",
    badge: "мм → м → дюйм",
    color: "#3B82F6",
    bg: "#DBEAFE",
  },
  {
    href: "/instrumenty/ploshchad-komnaty/",
    icon: "area",
    title: "Площадь комнаты",
    desc: "Прямоугольник, Г-образная, Т-образная, трапеция. Площадь пола, периметр, площадь стен.",
    badge: "Сложные формы",
    color: "#10B981",
    bg: "#D1FAE5",
  },
  {
    href: "/instrumenty/kalkulyator/",
    icon: "calculator",
    title: "Калькулятор",
    desc: "Обычный калькулятор как на телефоне — для быстрых вычислений прямо на объекте.",
    badge: "На ходу",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  {
    href: "/instrumenty/chek-listy/",
    icon: "checklist",
    title: "Чек-листы работ",
    desc: "Готовые пошаговые чек-листы для ремонта и строительства. Скачать и распечатать.",
    badge: `${ALL_CHECKLISTS.length} шаблонов`,
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
];

export default function InstrumentyPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-linear-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-900">
        <div className="page-container-wide py-10 md:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 text-sm font-medium px-3 py-1.5 rounded-full border border-accent-200 dark:border-accent-800/40 mb-4">
              <CategoryIcon icon="wrench" size={16} />
              <span>Инструменты строителя</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">
              Полезные инструменты
            </h1>
            <p className="text-slate-500 dark:text-slate-300 text-lg leading-relaxed">
              Конвертер единиц, расчёт площади нестандартных помещений, калькулятор
              и чек-листы работ — всё для стройки и ремонта.
            </p>
          </div>
        </div>
      </section>

      {/* Инструменты */}
      <section className="page-container-wide py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card-hover p-6 block no-underline group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: tool.bg }}
                >
                  <CategoryIcon icon={tool.icon} size={26} color={tool.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-accent-600 transition-colors">
                      {tool.title}
                    </h2>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: tool.bg, color: tool.color }}
                    >
                      {tool.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{tool.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Чек-листы превью */}
      <section className="page-container-wide py-2 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Чек-листы работ</h2>
          <Link href="/instrumenty/chek-listy/" className="text-sm text-accent-600 hover:text-accent-700 font-medium">
            Все чек-листы →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ALL_CHECKLISTS.map((cl) => (
            <Link
              key={cl.slug}
              href={`/instrumenty/chek-listy/${cl.slug}`}
              className="card-hover p-5 block no-underline group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{cl.categoryIcon}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{cl.category}</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-1 group-hover:text-accent-600 transition-colors">
                {cl.title}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed line-clamp-2 mb-3">
                {cl.description}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {cl.totalItems} пунктов
                </span>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {cl.duration}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    cl.complexity === 1
                      ? "bg-green-50 text-green-700"
                      : cl.complexity === 2
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {COMPLEXITY_LABELS[cl.complexity]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

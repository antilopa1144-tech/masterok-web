import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { CHECKLIST_COMPLEXITY_LABELS } from "@/lib/checklistsDisplay";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { ALL_TOOLS } from "@/lib/tools";

const META = {
  title: `Инструменты строителя — конвертер, площадь, чек-листы`,
  description: "Бесплатные инструменты для строительства и ремонта: конвертер единиц, расчёт площади комнаты, калькулятор и чек-листы работ.",
} as const;

const PAGE_URL = `${SITE_URL}/instrumenty/`;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: PAGE_URL,
});

const UI_TEXT = {
  heroBadge: "Инструменты строителя",
  heroTitle: "Полезные инструменты",
  heroDescription: "Конвертер единиц, расчёт площади нестандартных помещений, калькулятор и чек-листы работ — всё для стройки и ремонта.",
  previewTitle: "Чек-листы работ",
  previewLink: "Все чек-листы →",
  checklistItemsSuffix: "пунктов",
  checklistTemplatesSuffix: "шаблонов",
} as const;

const TOOLS = [
  {
    href: "/instrumenty/stoimost-remonta/",
    icon: "cost",
    title: "Стоимость ремонта",
    desc: "Примерная смета на ремонт квартиры. Косметический, стандартный, капитальный — материалы и работы.",
    badge: "Новый",
    color: "#10B981",
    bg: "#D1FAE5",
  },
  {
    href: "/instrumenty/raskladka-plitki/",
    icon: "tile",
    title: "Раскладка плитки",
    desc: "Визуальная раскладка плитки на стену или пол. Подрезка, отход, количество — видно сразу.",
    badge: "Новый",
    color: "#F97316",
    bg: "#FFF7ED",
  },
  {
    href: "/instrumenty/normy-raskhoda/",
    icon: "book",
    title: "Нормы расхода",
    desc: "Справочник расхода на 1 м² по ГОСТ и паспортам: штукатурка, грунтовка, клей, краска.",
    badge: "Справочник",
    color: "#06B6D4",
    bg: "#CFFAFE",
  },
  {
    href: "/instrumenty/sravnenie-materialov/",
    icon: "compare",
    title: "Сравнение материалов",
    desc: "Полы, стены, утеплители — таблица сравнения по цене, сроку службы, сложности монтажа.",
    badge: "Новый",
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
  {
    href: "/instrumenty/skolko-ostalos/",
    icon: "measure",
    title: "Сколько осталось?",
    desc: "Обратный калькулятор: введите остаток материала — узнайте на какую площадь хватит.",
    badge: "Новый",
    color: "#3B82F6",
    bg: "#DBEAFE",
  },
  {
    href: "/instrumenty/tajmer-skhvatyvaniya/",
    icon: "timer",
    title: "Таймер схватывания",
    desc: "Выберите материал — таймер покажет когда можно продолжать. Уведомление на телефон.",
    badge: "Новый",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
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
    badge: `${ALL_CHECKLISTS.length} ${UI_TEXT.checklistTemplatesSuffix}`,
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
];

function InstrumentyCollectionJsonLd() {
  const toolPages = ALL_TOOLS.filter((t) => t.slug !== "");
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: META.title,
    description: META.description,
    url: PAGE_URL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: toolPages.length,
      itemListElement: toolPages.map((tool, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/instrumenty/${tool.slug}/`,
        name: tool.title,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Инструменты", item: PAGE_URL },
      ],
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function InstrumentyPage() {
  return (
    <>
      <InstrumentyCollectionJsonLd />
      {/* Hero */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-linear-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-900">
        <div className="page-container-wide py-10 md:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 text-sm font-medium px-3 py-1.5 rounded-full border border-accent-200 dark:border-accent-800/40 mb-4">
              <CategoryIcon icon="wrench" size={16} />
              <span>{UI_TEXT.heroBadge}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              {UI_TEXT.heroTitle}
            </h1>
            <p className="text-slate-500 dark:text-slate-300 text-lg leading-relaxed">
              {UI_TEXT.heroDescription}
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
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-accent-700 transition-colors">
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{UI_TEXT.previewTitle}</h2>
          <Link href="/instrumenty/chek-listy/" className="text-sm text-accent-700 hover:text-accent-800 font-medium">
            {UI_TEXT.previewLink}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ALL_CHECKLISTS.map((cl) => (
            <Link
              key={cl.slug}
              href={`/instrumenty/chek-listy/${cl.slug}/`}
              className="card-hover p-5 block no-underline group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{cl.categoryIcon}</span>
                <span className="text-xs text-slate-400 dark:text-slate-400">{cl.category}</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-1 group-hover:text-accent-700 transition-colors">
                {cl.title}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">
                {cl.description}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {cl.totalItems} {UI_TEXT.checklistItemsSuffix}
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
                  {CHECKLIST_COMPLEXITY_LABELS[cl.complexity]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}






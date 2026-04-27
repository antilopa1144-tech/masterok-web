import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { CHECKLIST_COMPLEXITY_LABELS } from "@/lib/checklistsDisplay";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Чек-листы для ремонта и строительства — ${SITE_NAME}`,
  description: "Готовые пошаговые чек-листы для ремонта: укладка плитки, стяжка пола, монтаж гипсокартона, покраска стен. Скачать и распечатать бесплатно.",
} as const;

const PAGE_URL = `${SITE_URL}/instrumenty/chek-listy/`;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: PAGE_URL,
});

const UI_TEXT = {
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbCurrent: "Чек-листы",
  templatesSuffix: "шаблонов",
  heroTitle: "Чек-листы для ремонта и строительства",
  heroDescription: "Готовые пошаговые инструкции — откройте на телефоне прямо на объекте или распечатайте. Ничего не упустите: все этапы, все материалы, все проверки.",
  checklistItemsSuffix: "пунктов",
  checklistStepsSuffix: "этапов работ",
  ctaTitle: "Используйте на объекте",
  ctaDescription: "Откройте чек-лист на телефоне — удобный вид для чтения прямо на стройке. Или нажмите Ctrl+P в браузере, чтобы распечатать.",
  ctaButton: "Перейти к калькуляторам →",
} as const;

const COMPLEXITY_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-green-50", text: "text-green-700" },
  2: { bg: "bg-amber-50", text: "text-amber-700" },
  3: { bg: "bg-red-50", text: "text-red-700" },
};

function ChecklistIndexJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: META.title,
    description: META.description,
    url: PAGE_URL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: ALL_CHECKLISTS.length,
      itemListElement: ALL_CHECKLISTS.map((cl, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: cl.title,
        url: `${SITE_URL}/instrumenty/chek-listy/${cl.slug}/`,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
        { "@type": "ListItem", position: 3, name: "Чек-листы" },
      ],
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function ChekListyPage() {
  return (
    <>
      <ChecklistIndexJsonLd />
      {/* Hero */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-linear-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-900">
        <div className="page-container-wide py-10 md:py-14">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400 mb-5">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbHome}</Link>
            <span>/</span>
            <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbTools}</Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{UI_TEXT.breadcrumbCurrent}</span>
          </nav>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-sm font-medium px-3 py-1.5 rounded-full border border-violet-200 mb-4">
              <span>✅</span>
              <span>{ALL_CHECKLISTS.length} {UI_TEXT.templatesSuffix}</span>
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

      {/* Чек-листы */}
      <section className="page-container-wide py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {ALL_CHECKLISTS.map((cl) => {
            const colors = COMPLEXITY_COLORS[cl.complexity];
            return (
              <Link
                key={cl.slug}
                href={`/instrumenty/chek-listy/${cl.slug}/`}
                className="card-hover p-5 block no-underline group"
              >
                {/* Категория */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{cl.categoryIcon}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-400 font-medium">{cl.category}</span>
                </div>

                {/* Заголовок */}
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug mb-1.5 group-hover:text-accent-700 transition-colors">
                  {cl.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                  {cl.description}
                </p>

                {/* Метки */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                    {cl.totalItems} {UI_TEXT.checklistItemsSuffix}
                  </span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    {cl.duration}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {CHECKLIST_COMPLEXITY_LABELS[cl.complexity]}
                  </span>
                </div>

                {/* Этапы */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-400">{cl.steps.length} {UI_TEXT.checklistStepsSuffix}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="page-container-wide pb-12">
        <div className="bg-linear-to-br from-violet-50 to-violet-100 rounded-2xl p-8 text-center">
          <p className="text-2xl mb-2">📱</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{UI_TEXT.ctaTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-4">
            {UI_TEXT.ctaDescription.split("Ctrl+P")[0]}<strong>Ctrl+P</strong>{UI_TEXT.ctaDescription.split("Ctrl+P")[1]}
          </p>
          <Link href="/kalkulyatory/" className="btn-primary inline-block no-underline">
            {UI_TEXT.ctaButton}
          </Link>
        </div>
      </section>
    </>
  );
}






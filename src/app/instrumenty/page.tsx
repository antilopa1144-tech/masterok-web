import type { Metadata } from "next";
import Link from "next/link";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { ALL_TOOLS, HUB_META, TOOL_CARDS, toolHref } from "@/lib/tools/config";

const PAGE_URL = `${SITE_URL}/instrumenty/`;
const CHECKLIST_PREVIEW_COUNT = 4;

export const metadata: Metadata = buildPageMetadata({
  title: HUB_META.title,
  description: HUB_META.description,
  url: PAGE_URL,
});

const UI_TEXT = {
  heroBadge: "Инструменты строителя",
  heroTitle: "Полезные инструменты",
  heroDescription: HUB_META.description,
  previewTitle: "Чек-листы работ",
  previewLink: "Все чек-листы →",
  checklistItemsSuffix: "пунктов",
} as const;

const checklistPreview = ALL_CHECKLISTS.slice(0, CHECKLIST_PREVIEW_COUNT);

function InstrumentyCollectionJsonLd() {
  const toolPages = ALL_TOOLS.filter((t) => t.slug !== "");
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: HUB_META.title,
    description: HUB_META.description,
    url: PAGE_URL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: toolPages.length,
      itemListElement: toolPages.map((tool, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}${toolHref(tool.slug)}`,
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

      <section className="page-container-wide py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
          {TOOL_CARDS.map((tool) => {
            const badge =
              tool.href === toolHref("chek-listy")
                ? `${ALL_CHECKLISTS.length} шаблонов`
                : tool.badge;
            return (
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
                      {badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{tool.desc}</p>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </section>

      <section className="page-container-wide py-2 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{UI_TEXT.previewTitle}</h2>
          <Link href="/instrumenty/chek-listy/" className="text-sm text-accent-700 hover:text-accent-800 font-medium">
            {UI_TEXT.previewLink}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {checklistPreview.map((cl) => (
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
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                {cl.totalItems} {UI_TEXT.checklistItemsSuffix}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

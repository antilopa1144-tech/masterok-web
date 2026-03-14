import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_CHECKLISTS, getChecklistBySlug } from "@/lib/checklists";
import { CHECKLIST_COMPLEXITY_LABELS } from "@/lib/checklistsDisplay";
import PrintButton from "./PrintButton";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const UI_TEXT = {
  notFoundTitle: "Чек-лист не найден",
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbChecklist: "Чек-листы",
  checklistSuffix: `— чек-лист | ${SITE_NAME}`,
  itemsSuffix: "пунктов",
  stagesSuffix: "этапов",
  backToAll: "← Все чек-листы",
  tipPrefix: "Совет:",
  tipText: "Откройте страницу на телефоне, чтобы отмечать пункты прямо на объекте. Или нажмите Ctrl+P для печати.",
} as const;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ALL_CHECKLISTS.map((cl) => ({ slug: cl.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cl = getChecklistBySlug(slug);
  if (!cl) return { title: UI_TEXT.notFoundTitle };

  const title = `${cl.title} ${UI_TEXT.checklistSuffix}`;
  const description = cl.description;
  const pageUrl = `${SITE_URL}/instrumenty/chek-listy/${cl.slug}/`;

  return buildPageMetadata({
    title,
    description,
    url: pageUrl,
    type: "article",
  });
}

const COMPLEXITY_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-green-50", text: "text-green-700" },
  2: { bg: "bg-amber-50", text: "text-amber-700" },
  3: { bg: "bg-red-50", text: "text-red-700" },
};

export default async function ChecklistPage({ params }: Props) {
  const { slug } = await params;
  const cl = getChecklistBySlug(slug);
  if (!cl) notFound();

  const colors = COMPLEXITY_COLORS[cl.complexity];

  return (
    <div className="page-container py-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbHome}</Link>
        <span>/</span>
        <Link href="/instrumenty/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbTools}</Link>
        <span>/</span>
        <Link href="/instrumenty/chek-listy/" className="hover:text-slate-600 dark:hover:text-slate-300">{UI_TEXT.breadcrumbChecklist}</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">{cl.title}</span>
      </nav>

      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{cl.categoryIcon}</span>
          <div>
            <p className="text-sm text-slate-400 dark:text-slate-500">{cl.category}</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              {cl.title}
            </h1>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-4">{cl.description}</p>

        {/* Метки */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full font-medium">
            📋 {cl.totalItems} {UI_TEXT.itemsSuffix}
          </span>
          <span className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-3 py-1 rounded-full">
            ⏱ {cl.duration}
          </span>
          <span className={`text-sm px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {CHECKLIST_COMPLEXITY_LABELS[cl.complexity]}
          </span>
          <span className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-3 py-1 rounded-full">
            {cl.steps.length} {UI_TEXT.stagesSuffix}
          </span>
        </div>
      </div>

      {/* Этапы и пункты */}
      <div className="space-y-6">
        {cl.steps.map((step, stepIndex) => (
          <div key={stepIndex} className="card p-5">
            {/* Заголовок этапа */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-bold shrink-0">
                {stepIndex + 1}
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">{step.title}</h2>
            </div>

            {/* Пункты */}
            <ul className="space-y-2.5">
              {step.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-sm border-2 border-slate-300 dark:border-slate-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Нижние кнопки */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <PrintButton />
        <Link
          href="/instrumenty/chek-listy/"
          className="btn-secondary flex-1 text-center no-underline"
        >
          {UI_TEXT.backToAll}
        </Link>
      </div>

      {/* Совет */}
      <div className="mt-6 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/40 rounded-xl p-4">
        <p className="text-sm text-accent-700 dark:text-accent-300">
          <strong>{UI_TEXT.tipPrefix}</strong> {UI_TEXT.tipText.split("Ctrl+P")[0]}<strong>Ctrl+P</strong>{UI_TEXT.tipText.split("Ctrl+P")[1]}
        </p>
      </div>
    </div>
  );
}






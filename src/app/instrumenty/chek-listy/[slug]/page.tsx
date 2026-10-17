import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_CHECKLISTS, getChecklistBySlug } from "@/lib/checklists";
import { CHECKLIST_COMPLEXITY_LABELS } from "@/lib/checklistsDisplay";
import PrintButton, { ExportChecklistPDF } from "./PrintButton";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import ToolPageExtras from "@/components/tools/ToolPageExtras";
import {
  buildChecklistDetailBreadcrumbJsonLd,
  buildChecklistHowToJsonLd,
} from "@/lib/tools/checklist-schema";
import InteractiveChecklist from "./InteractiveChecklist";
import ChecklistCalculatorLink from "./ChecklistCalculatorLink";
import { CHECKLIST_GUIDANCE } from "@/lib/checklist-guidance";

const UI_TEXT = {
  notFoundTitle: "Чек-лист не найден",
  breadcrumbHome: "Главная",
  breadcrumbTools: "Инструменты",
  breadcrumbChecklist: "Чек-листы",
  checklistSuffix: `— чек-лист`,
  itemsSuffix: "пунктов",
  stagesSuffix: "этапов",
  backToAll: "← Все чек-листы",
  tipPrefix: "Совет:",
  tipText: "Отметки сохраняются в этом браузере после перезагрузки. PDF — чистый список для заполнения. Ctrl+P печатает все пункты с текущими отметками, даже если этапы свёрнуты или включён фильтр.",
} as const;

interface Props {
  params: Promise<{ slug: string }>;
}

// dynamicParams: false → неизвестные slug возвращают HTTP 404
export const dynamicParams = false;

// ISR: ревалидация раз в сутки — чек-листы стабильный контент.
export const revalidate = 86400;

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

  const checklistJsonLd = buildChecklistHowToJsonLd(cl);
  const breadcrumbLd = buildChecklistDetailBreadcrumbJsonLd(cl);
  const guidance = CHECKLIST_GUIDANCE[cl.slug];

  return (
    <>
    <div className="page-container py-8 max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(checklistJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-6 flex-wrap">
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
            <p className="text-sm text-slate-400 dark:text-slate-400">{cl.category}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
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

      <InteractiveChecklist checklist={cl} />

      {cl.slug === "priemka-plitki" && <section className="my-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="tile-delivery-notes">
        <h2 id="tile-delivery-notes" className="text-lg font-semibold">Что проверять по маркировке</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Тон обозначает оттенок партии, калибр — фактический размер плитки. Для одной поверхности производитель рекомендует один тон и калибр. Обозначения и особенности рисунка сверяйте по конкретному товару: вариативность коллекции сама по себе не означает дефект.</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Источник пояснений о тоне и калибре — <a className="underline underline-offset-4" href="https://kerama-marazzi.com/razdel-voprosy-i-otvety-faq/" target="_blank" rel="noopener noreferrer">вопросы и ответы KERAMA MARAZZI</a>. Для другой марки используйте её инструкцию. Чек-лист помогает организовать осмотр; порядок приёмки и решения по расхождениям согласуйте с продавцом.</p>
      </section>}
      {["zakupka-materialov-vannoy", "ustanovka-santehniki", "priemka-plitki"].includes(cl.slug) && <section className="my-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700 print:hidden" aria-label="План и закупка ванной">
        <h2 className="text-lg font-semibold">От размеров ванной до заказа</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Чек-лист помогает проверить действия. Количество материалов и цены уточняйте в своём проекте и у продавца. Отметки не связаны с конкретным 3D-проектом; перед новой закупкой сбросьте их.</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/konstruktor/vannaya/materialy/">Как собрать и проверить ведомость ванной</Link>
          {cl.slug === "zakupka-materialov-vannoy" && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/konstruktor/vannaya/materialy/#compare-source-prices">Сверить цены одного товара на разных стенах</Link>}
          {cl.slug === "zakupka-materialov-vannoy" && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/instrumenty/chek-listy/priemka-plitki/">Проверить плитку после доставки</Link>}
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/kalkulyatory/otdelka/vannaya-komnata/">Рассчитать отделочные материалы ванной</Link>
          {cl.slug !== "zakupka-materialov-vannoy" && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/instrumenty/chek-listy/zakupka-materialov-vannoy/">Чек-лист закупки материалов для ванной</Link>}
        </div>
      </section>}

      <div className="print:hidden"><ChecklistCalculatorLink checklistSlug={cl.slug} /></div>

      {/* Нижние кнопки */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <ExportChecklistPDF checklist={cl} />
        <PrintButton checklistSlug={cl.slug} />
        <Link
          href="/instrumenty/chek-listy/"
          className="btn-secondary flex-1 text-center no-underline"
        >
          {UI_TEXT.backToAll}
        </Link>
      </div>

      {/* Совет */}
      <div className="mt-6 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/40 rounded-xl p-4 print:hidden">
        <p className="text-sm text-accent-700 dark:text-accent-300">
          <strong>{UI_TEXT.tipPrefix}</strong> {UI_TEXT.tipText.split("Ctrl+P")[0]}<strong>Ctrl+P</strong>{UI_TEXT.tipText.split("Ctrl+P")[1]}
        </p>
      </div>
    </div>
    <div className="print:hidden"><ToolPageExtras slug="chek-listy" pagePath={`/instrumenty/chek-listy/${cl.slug}/`} extraFaq={guidance?.faq} extraIntro={guidance?.intro} /></div>
    </>
  );
}


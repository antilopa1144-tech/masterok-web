import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCalculatorBySlug } from "@/lib/calculators";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { getCategoryById } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import CalculatorWithMikhalych from "@/components/calculator/CalculatorWithMikhalych";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { CalculatorJsonLd } from "@/components/seo/CalculatorJsonLd";
import SeoContentBlock from "@/components/seo/SeoContentBlock";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

const SITE_TITLE_SUFFIX = ` — ${SITE_NAME}`;

function titleWithoutSiteSuffix(title: string): string {
  return title.endsWith(SITE_TITLE_SUFFIX) ? title.slice(0, -SITE_TITLE_SUFFIX.length) : title;
}

function RelatedCalcCard({ meta }: { meta: (typeof ALL_CALCULATORS_META)[number] }) {
  const category = getCategoryById(meta.category);
  return (
    <Link href={`/kalkulyatory/${meta.categorySlug}/${meta.slug}/`} className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 no-underline transition-colors hover:border-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-accent-700">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: category?.bgColor ?? "#f1f5f9" }}>
        <CategoryIcon icon={category?.icon ?? "calculator"} size={20} color={category?.color ?? "#64748b"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900 group-hover:text-accent-700 dark:text-white">{meta.title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{category?.label}</span>
      </span>
      <span className="text-slate-400" aria-hidden>›</span>
    </Link>
  );
}

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return ALL_CALCULATORS_META.map((calc) => ({ category: calc.categorySlug, slug: calc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const calc = getCalculatorBySlug(slug);
  if (!calc) return {};
  const canonicalUrl = `${SITE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`;
  return buildPageMetadata({
    title: titleWithoutSiteSuffix(calc.metaTitle),
    description: calc.metaDescription,
    url: canonicalUrl,
    openGraphTitle: calc.h1,
    twitterTitle: calc.metaTitle,
    tags: calc.tags,
  });
}

export default async function CalculatorPage({ params }: PageProps) {
  const { slug } = await params;
  const calc = getCalculatorBySlug(slug);
  if (!calc) notFound();

  const category = getCategoryById(calc.category);
  const related = ALL_CALCULATORS_META
    .filter((item) => item.slug !== calc.slug)
    .sort((a, b) => {
      const sameCategoryA = a.category === calc.category ? 1 : 0;
      const sameCategoryB = b.category === calc.category ? 1 : 0;
      return sameCategoryB - sameCategoryA || b.popularity - a.popularity;
    })
    .slice(0, 6);
  const accentColor = category?.color ?? "#f97316";
  const canonicalUrl = `${SITE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`;

  return (
    <>
      <CalculatorJsonLd calc={calc} categoryLabel={category?.label} canonicalUrl={canonicalUrl} />

      <main className="page-container-wide pb-14 pt-5 sm:pt-7">
        <header className="mb-5 sm:mb-6" data-print-hide>
          <Breadcrumbs
            items={[
              { href: "/kalkulyatory/", label: "Калькуляторы" },
              ...(category ? [{ href: `/kalkulyatory/${category.slug}/`, label: category.label }] : []),
              { label: calc.title },
            ]}
          />
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl dark:text-white">{calc.title}</h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400">{calc.description}</p>
        </header>

        <Suspense
          fallback={
            <div className="grid gap-4 xl:grid-cols-2" aria-hidden="true">
              <div className="h-[36rem] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
              <div className="h-[36rem] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
            </div>
          }
        >
          <CalculatorWithMikhalych
            calculator={{
              id: calc.id,
              slug: calc.slug,
              title: calc.title,
              h1: calc.h1,
              description: calc.metaDescription,
              metaTitle: calc.metaTitle,
              metaDescription: calc.metaDescription,
              category: calc.category,
              categorySlug: calc.categorySlug,
              tags: calc.tags,
              popularity: calc.popularity,
              complexity: calc.complexity,
              fields: calc.fields,
              expertTips: calc.expertTips,
              faq: calc.faq,
            }}
          />
        </Suspense>

        <div className="mt-4" data-print-hide>
          <SeoContentBlock
            calculatorId={calc.id}
            descriptionHtml={calc.seoContent?.descriptionHtml ?? ""}
            faq={calc.seoContent?.faq ?? calc.faq ?? []}
            formulaDescription={calc.formulaDescription}
            howToUse={calc.howToUse}
            inlineFaq={calc.faq}
            accentColor={accentColor}
          />
        </div>

        {related.length > 0 && (
          <details className="group mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" data-print-hide>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800/70">
              <span className="flex items-center gap-2"><CategoryIcon icon="calculator" size={18} color="currentColor" />Похожие калькуляторы</span>
              <span className="text-xl font-normal text-slate-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-700">
              {related.map((item) => <RelatedCalcCard key={item.id} meta={item} />)}
            </div>
          </details>
        )}
      </main>
    </>
  );
}

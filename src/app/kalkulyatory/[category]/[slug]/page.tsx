import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ALL_CALCULATORS, getCalculatorBySlug } from "@/lib/calculators";
import { getCategoryById } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { Suspense } from "react";
import CalculatorWithMikhalych from "@/components/calculator/CalculatorWithMikhalych";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const UI_TEXT = {
  rootBreadcrumb: "Калькуляторы",
  defaultCategoryLabel: "Калькулятор",
  complexityLabels: ["Простой", "Стандартный", "Детальный"] as const,
  standardsBadge: "По ГОСТ и СНиП",
  formulasTitle: "Формулы и нормы расчёта",
  howToUseTitle: "Как пользоваться калькулятором",
  faqTitle: "Частые вопросы",
  appPromoTitle: `📱 ${SITE_NAME} для Android`,
  appPromoDescription: "50+ калькуляторов в одном приложении. Работает без интернета. Сохраняйте расчёты и создавайте проекты.",
  appPromoLink: "Узнать подробнее",
  relatedTitle: "Похожие калькуляторы",
  maybeUsefulTitle: "Может пригодиться",
} as const;

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

// Генерация статических путей
export async function generateStaticParams() {
  return ALL_CALCULATORS.map((calc) => ({
    category: calc.categorySlug,
    slug: calc.slug,
  }));
}

// Метаданные
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const calc = getCalculatorBySlug(slug);
  if (!calc) return {};

  const canonicalUrl = `${SITE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`;

  return buildPageMetadata({
    title: calc.metaTitle,
    description: calc.metaDescription,
    url: canonicalUrl,
  });
}

export default async function CalculatorPage({ params }: PageProps) {
  const { slug } = await params;

  const calc = getCalculatorBySlug(slug);
  if (!calc) notFound();

  const category = getCategoryById(calc.category);

  // Похожие калькуляторы из той же категории
  const related = ALL_CALCULATORS.filter(
    (c) => c.category === calc.category && c.slug !== calc.slug
  ).slice(0, 4);

  const accentColor = category?.color ?? "#f97316";
  const accentBg = category?.bgColor ?? "#fff7ed";
  const heroStyle = { "--accent-hero-bg": accentBg } as Record<string, string>;

  const baseUrl = SITE_URL;
  const canonicalUrl = `${baseUrl}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`;

  // Структурированные данные — приложение
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: calc.title,
    description: calc.metaDescription,
    alternateName: calc.h1,
    keywords: calc.tags.join(", "),
    url: canonicalUrl,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
    },
  };

  // Хлебные крошки для поисковиков
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: UI_TEXT.rootBreadcrumb,
        item: `${baseUrl}/`,
      },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: category.label,
              item: `${baseUrl}/kalkulyatory/${category.slug}/`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: category ? 3 : 2,
        name: calc.title,
      },
    ],
  };

  // FAQ микроразметка
  const faqLd = calc.faq && calc.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": calc.faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  } : null;

  // HowTo микроразметка
  const howToLd = calc.howToUse && calc.howToUse.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": calc.title,
    "description": calc.metaDescription,
    "inLanguage": "ru",
    "url": canonicalUrl,
    "step": calc.howToUse.map((step, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": `Шаг ${i + 1}`,
      "text": step,
      "url": `${canonicalUrl}#${calc.id}-step-${i + 1}`,
    })),
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {howToLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
        />
      )}
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Hero-шапка */}
      <div
        style={heroStyle}
        className="border-b border-slate-200 dark:border-slate-800 bg-[var(--accent-hero-bg)] dark:bg-slate-900"
      >
        <div className="page-container-wide py-6 md:py-8">
          {/* Хлебные крошки */}
          <Breadcrumbs
            items={[
              { href: "/", label: UI_TEXT.rootBreadcrumb },
              ...(category ? [{ href: `/kalkulyatory/${category.slug}/`, label: category.label }] : []),
              { label: calc.title },
            ]}
          />

          <div className="flex items-start gap-4">
            {category && (
              <div
                className="hidden sm:flex w-14 h-14 rounded-2xl items-center justify-center shrink-0"
                style={{ backgroundColor: accentColor + "22" }}
              >
                <CategoryIcon icon={category.icon} size={28} color={accentColor} />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2">
                {calc.h1}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
                {calc.description}
              </p>

              {/* Метки */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className="badge text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {category?.label ?? UI_TEXT.defaultCategoryLabel}
                </span>
                <span className="badge bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {UI_TEXT.complexityLabels[calc.complexity - 1]}
                </span>
                <span className="badge bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {UI_TEXT.standardsBadge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="page-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая колонка — калькулятор */}
          <div className="lg:col-span-2 space-y-6">
            <Suspense fallback={<div className="card p-6 h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />}>
            <CalculatorWithMikhalych calculator={{
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
            }} />
            </Suspense>

            {/* Формулы */}
            {calc.formulaDescription && (
              <div className="card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  {UI_TEXT.formulasTitle}
                </h2>
                <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300">
                  <pre className="whitespace-pre-wrap text-sm font-normal leading-relaxed bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    {calc.formulaDescription.trim()}
                  </pre>
                </div>
              </div>
            )}

            {/* Как пользоваться */}
            {calc.howToUse && calc.howToUse.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  {UI_TEXT.howToUseTitle}
                </h2>
                <ol className="space-y-2">
                  {calc.howToUse.map((step, i) => (
                    <li id={`${calc.id}-step-${i + 1}`} key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                      <span
                        className="flex w-6 h-6 rounded-full text-xs font-bold items-center justify-center shrink-0 mt-0.5 text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* FAQ */}
            {calc.faq && calc.faq.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  {UI_TEXT.faqTitle}
                </h2>
                <div className="space-y-3">
                  {calc.faq.map((item, i) => (
                    <details
                      key={`${calc.id}-faq-${i}`}
                      className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3"
                    >
                      <summary className="relative cursor-pointer list-none pr-6 font-medium text-slate-900 dark:text-slate-100">
                        {item.question}
                        <span className="absolute right-0 top-0 text-slate-400 transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            {/* Скачать приложение */}
            <div className="card p-5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{UI_TEXT.appPromoTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                {UI_TEXT.appPromoDescription}
              </p>
              <Link href="/prilozhenie/" className="btn-secondary text-sm w-full text-center">
                {UI_TEXT.appPromoLink}
              </Link>
            </div>

            {/* Похожие калькуляторы */}
            {related.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  {UI_TEXT.relatedTitle}
                </h3>
                <div className="space-y-2">
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={`/kalkulyatory/${r.categorySlug}/${r.slug}/`}
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-accent-600 dark:hover:text-accent-400 no-underline transition-colors py-1.5 group"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="group-hover:underline">{r.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Связанные калькуляторы — карточки (полная ширина, под основным контентом) */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              {UI_TEXT.maybeUsefulTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {related.map((r) => {
                const rCat = getCategoryById(r.category);
                return (
                  <Link
                    key={r.id}
                    href={`/kalkulyatory/${r.categorySlug}/${r.slug}/`}
                    className="card-hover p-4 flex items-start gap-3 no-underline group"
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (rCat?.color ?? "#64748b") + "18" }}
                    >
                      <CategoryIcon
                        icon={rCat?.icon ?? "wrench"}
                        size={20}
                        color={rCat?.color ?? "#64748b"}
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-accent-600 transition-colors leading-snug">
                        {r.title}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {r.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}











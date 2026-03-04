import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ALL_CALCULATORS, getCalculatorBySlug } from "@/lib/calculators";
import { getCategoryById } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { Suspense } from "react";
import CalculatorWithMikhalych from "@/components/calculator/CalculatorWithMikhalych";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";


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

  return {
    title: calc.metaTitle,
    description: calc.metaDescription,
    openGraph: {
      title: calc.metaTitle,
      description: calc.metaDescription,
      type: "website",
    },
  };
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";

  // Структурированные данные — приложение
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: calc.metaTitle,
    description: calc.metaDescription,
    url: `${baseUrl}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`,
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
        name: "Калькуляторы",
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
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Hero-шапка */}
      <div
        style={{ backgroundColor: accentBg }}
        className="border-b border-slate-200 dark:border-slate-800"
      >
        <div className="page-container-wide py-6 md:py-8">
          {/* Хлебные крошки */}
          <Breadcrumbs
            items={[
              { href: "/", label: "Калькуляторы" },
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
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-2">
                {calc.h1}
              </h1>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-2xl">
                {calc.description}
              </p>

              {/* Метки */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className="badge text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {category?.label ?? "Калькулятор"}
                </span>
                <span className="badge bg-white text-slate-500 border border-slate-200">
                  {["Простой", "Стандартный", "Детальный"][calc.complexity - 1]}
                </span>
                <span className="badge bg-white text-slate-500 border border-slate-200">
                  По ГОСТ и СНиП
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
            <Suspense fallback={<div className="card p-6 h-48 animate-pulse bg-slate-100" />}>
            <CalculatorWithMikhalych calculator={{
              id: calc.id,
              slug: calc.slug,
              title: calc.title,
              h1: calc.h1,
              description: calc.description,
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
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Формулы и нормы расчёта
                </h2>
                <div className="prose prose-sm max-w-none text-slate-600">
                  <pre className="whitespace-pre-wrap text-sm font-normal leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-200">
                    {calc.formulaDescription.trim()}
                  </pre>
                </div>
              </div>
            )}

            {/* Как пользоваться */}
            {calc.howToUse && calc.howToUse.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Как пользоваться калькулятором
                </h2>
                <ol className="space-y-2">
                  {calc.howToUse.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600">
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
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            {/* Скачать приложение */}
            <div className="card p-5">
              <h3 className="font-bold text-slate-900 mb-2">📱 Мастерок для Android</h3>
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">
                50+ калькуляторов в одном приложении. Работает без интернета.
                Сохраняйте расчёты и создавайте проекты.
              </p>
              <Link href="/prilozhenie/" className="btn-secondary text-sm w-full text-center">
                Узнать подробнее
              </Link>
            </div>

            {/* Похожие калькуляторы */}
            {related.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Похожие калькуляторы
                </h3>
                <div className="space-y-2">
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={`/kalkulyatory/${r.categorySlug}/${r.slug}/`}
                      className="flex items-center gap-2 text-sm text-slate-700 hover:text-accent-600 no-underline transition-colors py-1.5 group"
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
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Может пригодиться
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
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-accent-600 transition-colors leading-snug">
                        {r.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
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

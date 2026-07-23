import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { getAllPosts } from "@/lib/blog";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { getHomeToolCards, TOOLS_FOR_SEARCH } from "@/lib/tools/config";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { RecentCalculators } from "@/components/home/HomeLazyWidgets";
import {
  MASTEROK_RUSTORE_URL,
  SITE_DEFAULT_TITLE,
  SITE_FOUNDING_DATE,
  SITE_NAME,
  SITE_SAME_AS,
  SITE_URL,
  SITE_WEBPAGE_DESCRIPTION,
} from "@/lib/site";

const CalculatorSearch = dynamic(
  () => import("@/components/calculator/CalculatorSearch"),
  {
    loading: () => (
      <div className="h-16 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 animate-pulse" aria-hidden="true" />
    ),
  },
);

const CALC_COUNT = ALL_CALCULATORS_META.length;

export const metadata: Metadata = {
  title: { absolute: SITE_DEFAULT_TITLE },
  description: `${CALC_COUNT}+ бесплатных строительных калькуляторов: точная потребность, практический запас и количество материалов к покупке.`,
  alternates: { canonical: `${SITE_URL}/` },
};

const HOME_TASK_LINKS = [
  { label: "Рассчитать стяжку", href: "/kalkulyatory/poly/styazhka/", category: "flooring" },
  { label: "Посчитать блоки", href: "/kalkulyatory/steny/gazobeton/", category: "walls" },
  { label: "Рассчитать плитку", href: "/kalkulyatory/poly/plitka/", category: "flooring" },
  { label: "Рассчитать кровлю", href: "/kalkulyatory/krovlya/krovlya/", category: "roofing" },
] as const;

// На главной показываем не просто четыре максимальных popularity: старый
// калькулятор потолка пересекался по названию с общим ГКЛ и уводил людей в
// режим «только площадь». Этот набор отражает четыре понятные базовые задачи.
const HOME_POPULAR_CALCULATOR_IDS = ["concrete_universal", "brick", "drywall", "tile"] as const;

const TRUST_ITEMS = [
  { icon: "trophy", title: "Бесплатно", text: "Все расчёты без оплаты" },
  { icon: "target", title: "Без регистрации", text: "Можно начинать сразу" },
  { icon: "calculator", title: "Расчёт в браузере", text: "Данные остаются у вас" },
  { icon: "foundation", title: "Для России", text: "Российские единицы и фасовки" },
] as const;

function getCalculatorCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "калькуляторов";
  if (mod10 === 1) return "калькулятор";
  if (mod10 >= 2 && mod10 <= 4) return "калькулятора";
  return "калькуляторов";
}

export default async function HomePage() {
  const blogPosts = await getAllPosts();
  const popular = HOME_POPULAR_CALCULATOR_IDS
    .map((id) => ALL_CALCULATORS_META.find((calculator) => calculator.id === id))
    .filter((calculator): calculator is (typeof ALL_CALCULATORS_META)[number] => Boolean(calculator));
  const tools = getHomeToolCards(ALL_CHECKLISTS.length).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_WEBPAGE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/web-app-manifest-192x192.png`, width: 192, height: 192 },
    description: SITE_WEBPAGE_DESCRIPTION,
    foundingDate: SITE_FOUNDING_DATE.slice(0, 4),
    areaServed: { "@type": "Country", name: "Россия" },
    knowsLanguage: "ru",
    sameAs: [...SITE_SAME_AS],
  };

  const appLd = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "@id": `${SITE_URL}/#mobile-app`,
    name: `${SITE_NAME} — строительные калькуляторы`,
    operatingSystem: "Android",
    applicationCategory: "UtilitiesApplication",
    inLanguage: "ru",
    isAccessibleForFree: true,
    installUrl: MASTEROK_RUSTORE_URL,
    downloadUrl: MASTEROK_RUSTORE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />

      <main className="page-container-wide pb-14 pt-9 sm:pt-12 lg:pt-16">
        <section className="text-center lg:text-left" aria-labelledby="home-title">
          <h1 id="home-title" className="max-w-5xl text-3xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
            Рассчитайте материалы без лишних закупок
          </h1>
          <p className="mt-3 text-base text-slate-500 sm:text-lg dark:text-slate-400">
            {CALC_COUNT} строительных калькуляторов с практическим запасом и итогом к покупке
          </p>

          <div className="mt-7 max-w-6xl">
            <Suspense fallback={<div className="h-16 rounded-xl border border-slate-200 bg-white animate-pulse dark:border-slate-700 dark:bg-slate-800" />}>
              <CalculatorSearch
                hero
                syncUrlQuery
                calculators={ALL_CALCULATORS_META}
                blogPosts={blogPosts.map(({ slug, title, description, category }) => ({ slug, title, description, category }))}
                checklists={ALL_CHECKLISTS.map(({ slug, title, description, category }) => ({ slug, title, description, category }))}
                tools={TOOLS_FOR_SEARCH}
              />
            </Suspense>
          </div>

          <nav className="mt-4 flex max-w-5xl flex-wrap justify-center gap-2 lg:justify-start" aria-label="Популярные задачи">
            {HOME_TASK_LINKS.map((task) => {
              const category = CATEGORIES.find((item) => item.id === task.category);
              return (
                <Link key={task.href} href={task.href} prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 no-underline transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-accent-700">
                  <CategoryIcon icon={category?.icon ?? "calculator"} size={17} color="currentColor" />
                  {task.label}
                </Link>
              );
            })}
          </nav>
        </section>

        <section className="theme-surface mt-10 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700" aria-labelledby="popular-title">
          <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-700 sm:hidden">
            <h2 id="popular-title" className="text-base font-bold text-slate-900 dark:text-white">Популярные расчёты</h2>
          </div>
          <div className="grid sm:grid-cols-[10.5rem_repeat(2,minmax(0,1fr))] lg:grid-cols-[10.5rem_repeat(4,minmax(0,1fr))]">
            <div className="hidden items-center border-r border-slate-200 px-5 sm:flex dark:border-slate-700">
              <h2 className="text-base font-bold leading-tight text-slate-900 dark:text-white">Популярные<br />расчёты</h2>
            </div>
            {popular.map((calc, index) => {
              const category = CATEGORIES.find((item) => item.id === calc.category);
              return (
                <Link
                  key={calc.id}
                  href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                  prefetch={false}
                  className={`group flex min-w-0 items-center gap-3 px-4 py-4 text-left no-underline transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70 ${index > 0 ? "border-t border-slate-200 sm:border-l sm:border-t-0 dark:border-slate-700" : ""} ${index >= 2 ? "sm:border-t lg:border-t-0" : ""}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: category?.bgColor ?? "#f1f5f9" }}>
                    <CategoryIcon icon={category?.icon ?? "calculator"} size={22} color={category?.color ?? "#64748b"} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900 group-hover:text-accent-700 dark:text-white">{calc.title}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">{calc.description}</span>
                  </span>
                  <span className="text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden>›</span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <section className="theme-surface rounded-2xl border border-slate-200 p-5 dark:border-slate-700" aria-labelledby="categories-title">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 id="categories-title" className="text-xl font-bold text-slate-950 dark:text-white">Все категории</h2>
              <Link href="/kalkulyatory/" className="text-sm font-semibold text-accent-700 no-underline hover:text-accent-800 dark:text-accent-400">Все калькуляторы →</Link>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {CATEGORIES.map((category) => {
                const count = ALL_CALCULATORS_META.filter((calc) => calc.category === category.id).length;
                return (
                  <Link key={category.id} href={`/kalkulyatory/${category.slug}/`} prefetch={false} className="group flex min-h-11 items-center gap-3 px-3 py-2 text-sm text-slate-700 no-underline transition-colors hover:bg-slate-50 hover:text-accent-700 dark:text-slate-200 dark:hover:bg-slate-800/70">
                    <CategoryIcon icon={category.icon} size={19} color="currentColor" />
                    <span className="min-w-0 flex-1 truncate font-medium">{category.label}</span>
                    <span className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs tabular-nums text-slate-500 dark:border-slate-700 dark:text-slate-400" title={`${count} ${getCalculatorCountLabel(count)}`}>{count}</span>
                    <span className="text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden>›</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="theme-surface relative overflow-hidden rounded-2xl border border-slate-200 p-5 sm:p-6 dark:border-slate-700" aria-labelledby="mikhalych-title">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent-200/45 blur-3xl dark:bg-accent-700/15" aria-hidden />
            <div className="relative">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 ring-1 ring-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:ring-accent-800">
                  <CategoryIcon icon="bot" size={23} color="currentColor" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">Помощник по расчётам</p>
                  <h2 id="mikhalych-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Михалыч</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Опишите ремонт обычными словами. Он уточнит размеры, запустит нужные калькуляторы и соберёт материалы в одну смету.
              </p>
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:ring-slate-700">
                Например: «Посчитай ванную 5 м² под плитку»
              </div>
              <Link href="/mikhalych/" className="btn-primary relative mt-5 min-h-11 w-full">Открыть Михалыча</Link>
            </div>
          </section>
        </div>

        <section className="theme-surface mt-6 grid overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700" aria-label="Преимущества Мастерка">
          {TRUST_ITEMS.map((item, index) => (
            <div key={item.title} className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? "border-t border-slate-100 sm:border-l sm:border-t-0 dark:border-slate-800" : ""} ${index === 2 ? "sm:border-t lg:border-t-0" : ""}`}>
              <CategoryIcon icon={item.icon} size={25} color="currentColor" className="shrink-0 text-slate-800 dark:text-slate-200" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">{item.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-14" aria-labelledby="tools-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="tools-title" className="text-xl font-bold text-slate-950 dark:text-white">Полезные инструменты</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Раскладки, чек-листы и планирование ремонта</p>
            </div>
            <Link href="/instrumenty/" className="shrink-0 text-sm font-semibold text-accent-700 no-underline dark:text-accent-400">Все инструменты →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href} prefetch={false} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 no-underline transition-colors hover:border-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-accent-700">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: tool.bg }}>
                  <CategoryIcon icon={tool.icon} size={20} color={tool.color} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900 group-hover:text-accent-700 dark:text-white">{tool.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{tool.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Suspense fallback={null}><RecentCalculators /></Suspense>
    </>
  );
}

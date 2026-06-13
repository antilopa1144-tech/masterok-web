import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { ALL_CALCULATORS_META, getPopularCalculatorsMeta } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { getAllPosts } from "@/lib/blog";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { getHomeToolCards, TOOLS_FOR_SEARCH } from "@/lib/tools/config";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { MASTEROK_RUSTORE_URL, SITE_DEFAULT_TITLE, SITE_FOUNDING_DATE, SITE_NAME, SITE_SAME_AS, SITE_URL, SITE_WEBPAGE_DESCRIPTION } from "@/lib/site";

import { RecentCalculators, ProjectManager, QuickCalculator } from "@/components/home/HomeLazyWidgets";

const CalculatorSearch = dynamic(
  () => import("@/components/calculator/CalculatorSearch"),
  {
    loading: () => (
      <div
        className="h-[50px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse"
        aria-hidden="true"
      />
    ),
  },
);

const CALC_COUNT = ALL_CALCULATORS_META.length;

// Главная — title уже включает брендовый суффикс « — Мастерок» (см. SITE_DEFAULT_TITLE).
// Используем absolute, чтобы template из layout не добавил суффикс второй раз.
const META = {
  title: SITE_DEFAULT_TITLE,
  description:
    `${CALC_COUNT}+ бесплатных строительных калькуляторов: бетон, кирпич, плитка, ламинат, кровля, обои, гипсокартон. Нормы по ГОСТ и СНиП. С ИИ-прорабом Михалыч.`,
} as const;

export const metadata: Metadata = {
  title: { absolute: META.title },
  description: META.description,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
};

const UI_TEXT = {
  heroTitle: "Строительные калькуляторы",
  heroAccent: "онлайн",
  heroTail: "расчёт материалов по ГОСТ и СНиП",
  heroDescription:
    "Бетон, кирпич, плитка, ламинат, кровля, обои, гипсокартон — всё для ремонта и стройки в одном месте. Быстро, бесплатно, без регистрации. И ИИ-прораб Михалыч, если что-то непонятно.",
  heroChipsLabel: "Популярное:",
  heroSecondaryCta: "Спросить Михалыча",
  stats: [
    { val: "100%", label: "Бесплатно" },
    { val: "ГОСТ", label: "Нормы" },
  ],
  categoriesTitle: "Категории калькуляторов",
  popularTitle: "Популярные калькуляторы",
  popularMeta: "Чаще всего используются",
  otherCategory: "Прочее",
  mikhalychTitle: "Михалыч — ваш ИИ-прораб",
  mikhalychMeta: "AI-агент, не просто чат",
  mikhalychDescription:
    "Поручите задачу простыми словами — Михалыч сам посчитает через калькуляторы, соберёт смету всей квартиры, сравнит материалы и подберёт под бюджет. Не просто отвечает на вопросы — делает работу за вас.",
  mikhalychPrimaryCta: "Поручить задачу",
  mikhalychSecondaryCta: "Приложение",
  toolsTitle: "Полезные инструменты",
  toolsCta: "Все инструменты →",
  quickCalculatorTitle: "Быстрый калькулятор",
  quickCalculatorDescription: "Посчитайте прямо на главной",
  featuresTitle: `Почему ${SITE_NAME}?`,
} as const;

const HOME_TOOLS = getHomeToolCards(ALL_CHECKLISTS.length);

const FEATURES = [
  {
    icon: "target",
    color: "#6366F1",
    bg: "#EDE9FE",
    title: "Точные нормы",
    desc: "Все расчёты основаны на актуальных ГОСТ, СНиП и СП. Нормы расхода от производителей и практики строителей.",
  },
  {
    icon: "engineering",
    color: "#06B6D4",
    bg: "#CFFAFE",
    title: "Мгновенно",
    desc: "Расчёт происходит прямо в браузере без отправки данных на сервер. Никаких задержек и регистраций.",
  },
  {
    icon: "phone",
    color: "#10B981",
    bg: "#D1FAE5",
    title: "Мобильное приложение",
    desc: "Работает без интернета. Сохраняйте расчёты, создавайте проекты, делитесь QR-кодами со сметой.",
  },
  {
    icon: "hammer",
    color: "#F59E0B",
    bg: "#FEF3C7",
    title: "Практичные результаты",
    desc: "Кроме основных материалов — сопутствующие: крепёж, клей, грунтовка. Всё что нужно в магазин.",
  },
  {
    icon: "foundation",
    color: "#EF4444",
    bg: "#FEE2E2",
    title: "Для России",
    desc: "Российские размеры материалов, бренды (Knauf, Ceresit, Технониколь), нормы и единицы измерения.",
  },
  {
    icon: "chat",
    color: "#8B5CF6",
    bg: "#EDE9FE",
    title: "ИИ-помощник",
    desc: "Михалыч сам посчитает материалы, соберёт смету и сравнит варианты — поручите задачу простыми словами.",
  },
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
  const popular = getPopularCalculatorsMeta(8);
  const totalCount = ALL_CALCULATORS_META.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_WEBPAGE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/web-app-manifest-192x192.png`,
      width: 192,
      height: 192,
    },
    description: SITE_WEBPAGE_DESCRIPTION,
    foundingDate: SITE_FOUNDING_DATE.slice(0, 4),
    areaServed: {
      "@type": "Country",
      name: "Россия",
    },
    knowsLanguage: "ru",
    sameAs: [...SITE_SAME_AS],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: "Russian",
      url: `${SITE_URL}/mikhalych/`,
    },
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
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Бесплатны ли строительные калькуляторы на сайте ${SITE_NAME}?`,
        acceptedAnswer: { "@type": "Answer", text: `Да, все калькуляторы на сайте ${SITE_NAME} полностью бесплатные, без регистрации и ограничений. Расчёты доступны онлайн на сайте и в мобильном приложении для Android.` },
      },
      {
        "@type": "Question",
        name: "По каким нормам рассчитываются материалы в калькуляторах?",
        acceptedAnswer: { "@type": "Answer", text: "Расчёты основаны на актуальных нормативных документах Российской Федерации: ГОСТ (государственные стандарты), СНиП (строительные нормы и правила), СП (своды правил). Нормы расхода материалов берутся из технических паспортов производителей и строительных справочников." },
      },
      {
        "@type": "Question",
        name: "Можно ли доверять результатам расчётов в онлайн-калькуляторах?",
        acceptedAnswer: { "@type": "Answer", text: "Каждый калькулятор показывает три сценария расчёта: минимум, рекомендуемый и максимум. Это даёт вилку для закупки материалов, а не одну цифру. Можно выбрать режим точности — от базового до профессионального с учётом отходов и запасов." },
      },
      {
        "@type": "Question",
        name: `Есть ли мобильное приложение ${SITE_NAME} для смартфона?`,
        acceptedAnswer: { "@type": "Answer", text: `Да, мобильное приложение ${SITE_NAME} для Android бесплатно доступно в RuStore. Все ${CALC_COUNT}+ калькуляторов работают без интернета, расчёты сохраняются в истории и могут быть отправлены в виде QR-кода со сметой.` },
      },
      {
        "@type": "Question",
        name: "Кто такой Михалыч и как он помогает со строительными расчётами?",
        acceptedAnswer: { "@type": "Answer", text: `Михалыч — это встроенный AI-ассистент сайта ${SITE_NAME}. Он отвечает на вопросы по строительным материалам, технологиям монтажа и нормам расхода. Работает прямо в калькуляторах и видит ваши параметры расчёта, что позволяет давать контекстные советы.` },
      },
    ],
  };

  const stats = [{ val: `${totalCount}+`, label: "Калькуляторов" }, ...UI_TEXT.stats];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* Компактный hero: первый экран = начало работы (поиск + популярное),
          а не маркетинговый текст. Подробное описание уехало в блок «Почему Мастерок». */}
      <section className="hero-gradient border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-8 md:py-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-[2.6rem] font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2">
            {UI_TEXT.heroTitle}{" "}
            <span className="text-accent-500">{UI_TEXT.heroAccent}</span>
          </h1>
          <p className="text-lg sm:text-xl font-semibold text-slate-500 dark:text-slate-400 mb-6">
            {UI_TEXT.heroTail}
          </p>

          <div className="max-w-2xl mx-auto">
            <Suspense
              fallback={
                <div
                  className="h-[50px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse"
                  aria-hidden="true"
                />
              }
            >
              <CalculatorSearch
                syncUrlQuery
                calculators={ALL_CALCULATORS_META}
                blogPosts={blogPosts.map(({ slug, title, description, category }) => ({ slug, title, description, category }))}
                checklists={ALL_CHECKLISTS.map(({ slug, title, description, category }) => ({ slug, title, description, category }))}
                tools={TOOLS_FOR_SEARCH}
              />
            </Suspense>
          </div>

          {/* Чипы: самые популярные калькуляторы — один клик до цели */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            <span className="text-sm text-slate-500 dark:text-slate-400 mr-1">
              {UI_TEXT.heroChipsLabel}
            </span>
            {popular.map((calc) => {
              const cat = CATEGORIES.find((c) => c.id === calc.category);
              const label = calc.tags[0]
                ? calc.tags[0].charAt(0).toUpperCase() + calc.tags[0].slice(1)
                : calc.title;
              return (
                <Link
                  key={calc.id}
                  href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-accent-700 dark:hover:text-accent-400"
                  title={calc.title}
                >
                  <CategoryIcon icon={cat?.icon ?? "wrench"} size={14} color={cat?.color ?? "#64748b"} />
                  {label}
                </Link>
              );
            })}
            <Link
              href="/mikhalych/"
              className="inline-flex items-center gap-1.5 rounded-full border border-accent-300 bg-accent-50 px-3.5 py-1.5 text-sm font-semibold text-accent-800 no-underline shadow-sm transition-colors hover:bg-accent-100 dark:border-accent-700 dark:bg-accent-900/30 dark:text-accent-200 dark:hover:bg-accent-900/50"
            >
              <CategoryIcon icon="bot" size={14} color="currentColor" />
              {UI_TEXT.heroSecondaryCta}
            </Link>
          </div>

          {/* Одна тонкая строка фактов вместо трёх крупных цифр */}
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            {stats.map((s, i) => (
              <span key={s.label}>
                {i > 0 && <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">{s.val}</strong>{" "}
                {s.label.toLowerCase()}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* Стриминг: hero отрисован, остальное подъезжает.
          Fallback — скелетон из 8 карточек, совпадает по высоте с реальной сеткой. */}
      <Suspense
        fallback={
          <div className="page-container-wide py-10" id="calculators">
            <div className="flex flex-col xl:flex-row gap-8">
              <div className="flex-1 min-w-0">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6 animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="card p-5 space-y-3 animate-pulse">
                      <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
                <div className="mt-8 space-y-4">
                  <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="card p-5 space-y-3 animate-pulse">
                        <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <aside className="hidden xl:block w-72 shrink-0">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="card p-4 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        }
      >
      <div className="page-container-wide py-10" id="calculators">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Main content: categories + popular */}
          <div className="flex-1 min-w-0">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                {UI_TEXT.categoriesTitle}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => {
                  const count = ALL_CALCULATORS_META.filter((c) => c.category === cat.id).length;
                  return (
                    <Link
                      key={cat.id}
                      href={`/kalkulyatory/${cat.slug}/`}
                      prefetch={false}
                      className="card-hover p-5 block no-underline group"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: cat.bgColor }}
                      >
                        <CategoryIcon icon={cat.icon} size={22} color={cat.color} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight mb-1 group-hover:text-accent-700 transition-colors">
                        {cat.label}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {count} {getCalculatorCountLabel(count)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {UI_TEXT.popularTitle}
                </h2>
                <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                  {UI_TEXT.popularMeta}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {popular.map((calc) => {
                  const cat = CATEGORIES.find((c) => c.id === calc.category);
                  return (
                    <Link
                      key={calc.id}
                      href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                      prefetch={false}
                      className="card-hover p-5 block no-underline group"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: cat?.bgColor ?? "#f1f5f9" }}
                      >
                        <CategoryIcon icon={cat?.icon ?? "wrench"} size={22} color={cat?.color ?? "#64748b"} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-1.5 group-hover:text-accent-700 transition-colors">
                        {calc.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {calc.description}
                      </p>
                      <div className="mt-3">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: cat?.bgColor ?? "#f1f5f9",
                            color: cat?.color ?? "#64748b",
                          }}
                        >
                          {cat?.label ?? UI_TEXT.otherCategory}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="text-center mt-6">
                <Link href="/kalkulyatory/" className="text-sm text-accent-700 hover:text-accent-800 font-medium no-underline">
                  Все калькуляторы →
                </Link>
              </div>
            </section>
          </div>

          {/* Sidebar: tools (desktop only) */}
          <aside className="hidden xl:block w-72 shrink-0" aria-label="Полезные инструменты">
            <div className="sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {UI_TEXT.toolsTitle}
                </h2>
              </div>
              <div className="space-y-3">
                {HOME_TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    prefetch={false}
                    className="card-hover p-4 flex items-center gap-3 no-underline group"
                    aria-label={tool.title}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: tool.bg }}
                    >
                      <CategoryIcon icon={tool.icon} size={20} color={tool.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-accent-700 transition-colors">
                        {tool.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{tool.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/instrumenty/"
                className="block text-center text-sm text-accent-700 hover:text-accent-800 font-medium no-underline mt-4"
              >
                {UI_TEXT.toolsCta}
              </Link>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {UI_TEXT.quickCalculatorTitle}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {UI_TEXT.quickCalculatorDescription}
                    </p>
                  </div>
                  <Link
                    href="/instrumenty/kalkulyator/"
                    className="text-xs font-medium text-accent-700 hover:text-accent-800 no-underline"
                  >
                    Открыть
                  </Link>
                </div>
                <QuickCalculator compact showHistory={false} enableKeyboard={false} />
              </div>

              {/* Проекты */}
              <div className="mt-6" style={{ minHeight: "8rem" }}>
                <Suspense fallback={
                  <div className="card p-6 text-center space-y-3" style={{ minHeight: "8rem" }}>
                    <div className="text-3xl">📁</div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Мои проекты</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Создайте проект для группировки расчётов.</p>
                  </div>
                }>
                  <ProjectManager />
                </Suspense>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Появляется только у возвращающихся пользователей; живёт ниже первого
          экрана, чтобы её монтирование не сдвигало видимый контент (CLS). */}
      <Suspense fallback={null}>
        <RecentCalculators />
      </Suspense>

      <section className="page-container-wide py-8">
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-12 text-white overflow-hidden dark:bg-slate-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="md:max-w-xl lg:max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent-500 rounded-2xl flex items-center justify-center shrink-0">
                  <CategoryIcon icon="bot" size={26} color="#fff" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {UI_TEXT.mikhalychTitle}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {UI_TEXT.mikhalychMeta}
                  </p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {UI_TEXT.mikhalychDescription}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 shrink-0">
              <Link href="/mikhalych/" className="btn-primary text-base px-8">
                {UI_TEXT.mikhalychPrimaryCta}
              </Link>
              <Link
                href="/prilozhenie/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-150 no-underline text-base"
              >
                <CategoryIcon icon="phone" size={18} color="#fff" />
                {UI_TEXT.mikhalychSecondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tools section: visible only on mobile/tablet, hidden on xl (shown in sidebar instead) */}
      <section className="page-container-wide py-8 xl:hidden">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {UI_TEXT.toolsTitle}
          </h2>
          <Link
            href="/instrumenty/"
            className="text-sm text-accent-700 hover:text-accent-800 font-medium no-underline"
          >
            {UI_TEXT.toolsCta}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {HOME_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              prefetch={false}
              className="card-hover p-5 block no-underline group text-center"
              aria-label={tool.title}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: tool.bg }}
              >
                <CategoryIcon icon={tool.icon} size={24} color={tool.color} />
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-accent-700 transition-colors">
                {tool.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tool.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-container-wide py-8 pb-14">
        <div className="card p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3 dark:text-slate-100">
            {UI_TEXT.featuresTitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 max-w-3xl">
            {UI_TEXT.heroDescription}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: f.bg }}
                >
                  <CategoryIcon icon={f.icon} size={20} color={f.color} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </Suspense>
    </>
  );
}

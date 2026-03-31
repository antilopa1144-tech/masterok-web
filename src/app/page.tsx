import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ALL_CALCULATORS, getPopularCalculators } from "@/lib/calculators";
import { CATEGORIES } from "@/lib/calculators/categories";
import { getAllPosts } from "@/lib/blog";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { SITE_NAME, SITE_URL, SITE_WEBPAGE_DESCRIPTION } from "@/lib/site";

import CalculatorSearch from "@/components/calculator/CalculatorSearch";
import RecentCalculators from "@/components/calculator/RecentCalculators";
import ProjectManager from "@/components/calculator/ProjectManager";

const META = {
  title: `${SITE_NAME} — строительные калькуляторы онлайн бесплатно`,
  description:
    "61+ бесплатных строительных калькуляторов онлайн: бетон, кирпич, кровля, плитка, ламинат, гипсокартон. Точный расчёт материалов по ГОСТ и СНиП.",
} as const;

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
};

const UI_TEXT = {
  heroBadgeSuffix: "бесплатных калькуляторов",
  heroTitle: "Строительные калькуляторы",
  heroAccent: "онлайн",
  heroDescription:
    "Точный расчёт материалов по ГОСТ и СНиП. Бетон, кирпич, кровля, плитка, ламинат — всё в одном месте. Быстро, бесплатно, без регистрации.",
  heroPrimaryCta: "Начать расчёт",
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
  mikhalychMeta: "Строительный ИИ-ассистент",
  mikhalychDescription:
    "Задайте любой строительный вопрос. Михалыч поможет рассчитать материалы, расскажет про технологию укладки, объяснит нормы СНиП и предупредит о типичных ошибках.",
  mikhalychPrimaryCta: "Начать диалог",
  mikhalychSecondaryCta: "Приложение",
  toolsTitle: "Полезные инструменты",
  toolsCta: "Все инструменты →",
  featuresTitle: `Почему ${SITE_NAME}?`,
} as const;

const TOOLS = [
  {
    href: "/instrumenty/stoimost-remonta/",
    icon: "engineering",
    title: "Стоимость ремонта",
    desc: "Смета по типу отделки",
    bg: "#FEE2E2",
    color: "#EF4444",
  },
  {
    href: "/instrumenty/raskladka-plitki/",
    icon: "area",
    title: "Раскладка плитки",
    desc: "Визуализация подрезки",
    bg: "#DBEAFE",
    color: "#3B82F6",
  },
  {
    href: "/instrumenty/normy-raskhoda/",
    icon: "target",
    title: "Нормы расхода",
    desc: "Справочник по ГОСТ",
    bg: "#D1FAE5",
    color: "#10B981",
  },
  {
    href: "/instrumenty/sravnenie-materialov/",
    icon: "hammer",
    title: "Сравнение материалов",
    desc: "Цена, срок, монтаж",
    bg: "#FEF3C7",
    color: "#F59E0B",
  },
  {
    href: "/instrumenty/konverter/",
    icon: "converter",
    title: "Конвертер единиц",
    desc: "мм → м → дюйм",
    bg: "#EDE9FE",
    color: "#8B5CF6",
  },
  {
    href: "/instrumenty/chek-listy/",
    icon: "checklist",
    title: "Чек-листы",
    desc: "11 шаблонов работ",
    bg: "#CFFAFE",
    color: "#06B6D4",
  },
] as const;

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
    desc: "Михалыч ответит на вопросы по технологии, поможет разобраться в нюансах и подберёт нужный материал.",
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
  const popular = getPopularCalculators(8);
  const totalCount = ALL_CALCULATORS.length;

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
    "@type": "HomeAndConstructionBusiness",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-512x512.png`,
    description: SITE_WEBPAGE_DESCRIPTION,
    foundingDate: "2024",
    areaServed: {
      "@type": "Country",
      name: "Россия",
    },
    serviceType: ["Строительные калькуляторы онлайн", "Расчёт строительных материалов"],
    knowsLanguage: "ru",
    priceRange: "Бесплатно",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Лесная, 42",
      addressLocality: "Москва",
      postalCode: "125000",
      addressCountry: "RU",
    },
    telephone: "+7-495-123-45-67",
    geo: {
      "@type": "GeoCoordinates",
      latitude: 55.7558,
      longitude: 37.6173,
    },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+7-495-123-45-67",
      availableLanguage: "Russian",
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Калькуляторы бесплатные?",
        acceptedAnswer: { "@type": "Answer", text: "Да, все калькуляторы полностью бесплатные, без регистрации и ограничений. Расчёты доступны онлайн на сайте и в мобильном приложении." },
      },
      {
        "@type": "Question",
        name: "По каким нормам считают калькуляторы?",
        acceptedAnswer: { "@type": "Answer", text: "Расчёты основаны на актуальных нормативах: ГОСТ, СНиП, СП. Нормы расхода материалов берутся из технических паспортов производителей и строительных справочников." },
      },
      {
        "@type": "Question",
        name: "Можно ли доверять результатам?",
        acceptedAnswer: { "@type": "Answer", text: "Калькуляторы показывают три сценария (минимум, рекомендуемый, максимум) и позволяют выбрать режим точности — от базового до профессионального. Это даёт вилку для закупки, а не одну цифру." },
      },
      {
        "@type": "Question",
        name: "Есть ли мобильное приложение?",
        acceptedAnswer: { "@type": "Answer", text: "Да, приложение Мастерок для Android доступно в RuStore. Все 61+ калькуляторов работают без интернета, расчёты сохраняются в истории." },
      },
      {
        "@type": "Question",
        name: "Кто такой Михалыч?",
        acceptedAnswer: { "@type": "Answer", text: "Михалыч — AI-ассистент строителя. Отвечает на вопросы по материалам, технологиям и нормам расхода. Работает прямо в калькуляторах и видит ваши параметры расчёта." },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <section className="hero-gradient border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-14 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 text-sm font-medium px-4 py-2 rounded-full border border-accent-200 dark:border-accent-800/40 mb-6">
            <CategoryIcon icon="trophy" size={16} />
            <span>{totalCount}+ {UI_TEXT.heroBadgeSuffix}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight mb-4">
            {UI_TEXT.heroTitle}{" "}
            <span className="text-accent-500">{UI_TEXT.heroAccent}</span>
          </h1>

          <p className="text-slate-500 dark:text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            {UI_TEXT.heroDescription}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="#calculators" className="btn-primary text-base px-8 py-3">
              {UI_TEXT.heroPrimaryCta}
            </Link>
            <Link href="/mikhalych/" className="btn-secondary text-base px-6 py-3 inline-flex items-center gap-2">
              <CategoryIcon icon="bot" size={18} />
              {UI_TEXT.heroSecondaryCta}
            </Link>
          </div>

          <div className="mt-8 max-w-xl mx-auto">
            <CalculatorSearch
              calculators={ALL_CALCULATORS.map(
                ({
                  id,
                  slug,
                  title,
                  h1,
                  description,
                  metaTitle,
                  metaDescription,
                  category,
                  categorySlug,
                  tags,
                  popularity,
                  complexity,
                }) => ({
                  id,
                  slug,
                  title,
                  h1,
                  description,
                  metaTitle,
                  metaDescription,
                  category,
                  categorySlug,
                  tags,
                  popularity,
                  complexity,
                })
              )}
              blogPosts={blogPosts.map(({ slug, title, description, category }) => ({ slug, title, description, category }))}
              checklists={ALL_CHECKLISTS.map(({ slug, title, description, category }) => ({ slug, title, description, category }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto mt-10">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {s.val}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <RecentCalculators />
      </Suspense>

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
                  const count = ALL_CALCULATORS.filter((c) => c.category === cat.id).length;
                  return (
                    <Link
                      key={cat.id}
                      href={`/kalkulyatory/${cat.slug}/`}
                      className="card-hover p-5 block no-underline group"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: cat.bgColor }}
                      >
                        <CategoryIcon icon={cat.icon} size={22} color={cat.color} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight mb-1 group-hover:text-accent-600 transition-colors">
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
                      className="card-hover p-5 block no-underline group"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: cat?.bgColor ?? "#f1f5f9" }}
                      >
                        <CategoryIcon icon={cat?.icon ?? "wrench"} size={22} color={cat?.color ?? "#64748b"} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-1.5 group-hover:text-accent-600 transition-colors">
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
                <Link href="/kalkulyatory/" className="text-sm text-accent-600 hover:text-accent-700 font-medium no-underline">
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
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
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
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-accent-600 transition-colors">
                        {tool.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{tool.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/instrumenty/"
                className="block text-center text-sm text-accent-600 hover:text-accent-700 font-medium no-underline mt-4"
              >
                {UI_TEXT.toolsCta}
              </Link>

              {/* Проекты */}
              <div className="mt-6">
                <Suspense fallback={null}>
                  <ProjectManager />
                </Suspense>
              </div>
            </div>
          </aside>
        </div>
      </div>

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
            className="text-sm text-accent-600 hover:text-accent-700 font-medium no-underline"
          >
            {UI_TEXT.toolsCta}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card-hover p-5 block no-underline group text-center"
              aria-label={tool.title}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: tool.bg }}
              >
                <CategoryIcon icon={tool.icon} size={24} color={tool.color} />
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-accent-600 transition-colors">
                {tool.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tool.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-container-wide py-8 pb-14">
        <div className="card p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 dark:text-slate-100">
            {UI_TEXT.featuresTitle}
          </h2>
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
    </>
  );
}

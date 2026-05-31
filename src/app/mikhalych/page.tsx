import type { Metadata } from "next";
import Link from "next/link";
import { getCalculatorMetaBySlug as getCalculatorBySlug } from "@/lib/calculators/meta.generated";
import MikhalychChat from "@/components/mikhalych/MikhalychChat";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Михалыч — AI-ассистент строителя`,
  description:
    "Спросите Михалыча — опытного строительного ИИ-мастера. Расчёты, технологии, советы по материалам. Отвечает как настоящий прораб.",
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/mikhalych/`,
});

const UI_TEXT = {
  heroBadge: "Строительный AI-прораб",
  heroDescription:
    "Опытный строительный мастер с 30-летним стажем. Поможет рассчитать материалы, объяснит технологию и предупредит об ошибках. Говорит просто, по делу.",
  heroTrust: "Отвечает по-русски, без канцелярита и с поправкой на реальную стройку.",
  skillsTitle: "Что умеет Михалыч?",
  nearbyTitle: "Калькуляторы рядом",
  appTitle: "Михалыч в приложении",
  appDescription:
    `В приложении ${SITE_NAME} Михалыч работает прямо рядом с калькулятором.`,
  download: "Скачать",
  nearbyCalculatorFallback: "Калькулятор",
} as const;

const HERO_TAGS = [
  "Расчёт материалов",
  "Технологии монтажа",
  "ГОСТ и СНиП",
  "Выбор материалов",
] as const;

const STARTER_QUESTIONS = [
  "Сколько кирпичей нужно на перегородку 5×2.7 м в полкирпича?",
  "Какую марку бетона выбрать для фундамента частного дома?",
  "Как рассчитать количество обоев для комнаты 4×3 метра?",
  "Чем лучше клеить пенопласт к стене — клей или дюбели?",
  "Какой утеплитель лучше для кровли — минвата или пеноплекс?",
  "Как правильно рассчитать стяжку пола толщиной 50 мм?",
] as const;

const CAPABILITIES = [
  { icon: "🧮", text: "Рассчитает количество материалов по вашим параметрам" },
  { icon: "📋", text: "Объяснит технологию укладки шаг за шагом" },
  { icon: "⚠️", text: "Предупредит о типичных ошибках и подводных камнях" },
  { icon: "🏪", text: "Порекомендует материалы и бренды для России" },
  { icon: "📏", text: "Ответит по нормам ГОСТ, СНиП и рекомендациям производителей" },
] as const;

const NEARBY_CALCULATOR_SLUGS = ["beton", "kirpich", "plitka", "krovlya", "laminat"] as const;

const NEARBY_CALCULATORS = NEARBY_CALCULATOR_SLUGS.map((slug) => {
  const calculator = getCalculatorBySlug(slug);

  return {
    slug,
    href: calculator ? `/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/` : "/kalkulyatory/",
    title: calculator?.title ?? UI_TEXT.nearbyCalculatorFallback,
  };
});

const mikhalychJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Михалыч — AI-ассистент строителя",
  url: `${SITE_URL}/mikhalych/`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
  description: META.description,
  inLanguage: "ru",
};

const mikhalychBreadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Михалыч" },
  ],
};

export default function MikhalychPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(mikhalychJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(mikhalychBreadcrumbLd) }} />
      {/* ЧАТ-ПЕРВЫЙ ЭКРАН (как ChatGPT/Claude): сразу чат на высоту вьюпорта
          минус хедер. svh (а не dvh) — не пересчитывается при появлении
          тулбара/клавиатуры → нет «прыжков» layout на мобиле. Единый фон
          slate-50/950 на всю секцию убирает рассинхрон тёмных оттенков. */}
      <section
        id="mikhalych-chat"
        className="flex h-[calc(100svh-4rem)] flex-col bg-slate-50 dark:bg-slate-950"
      >
        {/* Компактная шапка чата вместо большого hero */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <div className="relative shrink-0" role="img" aria-label="AI-помощник Михалыч">
            <img
              src="/mikhalych-avatar.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-cover shadow-sm"
            />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              Михалыч — AI-ассистент строителя
            </h1>
            <p className="truncate text-[11px] text-slate-400">{UI_TEXT.heroBadge} · онлайн</p>
          </div>
        </div>

        {/* Сам чат заполняет остаток высоты */}
        <div className="min-h-0 flex-1">
          <MikhalychChat starterQuestions={[...STARTER_QUESTIONS]} />
        </div>
      </section>

      {/* SEO/маркетинг-контент — ПОД чатом (доскролл). Важно для индексации:
          описание, что умеет, калькуляторы, ссылка на приложение. */}
      <div className="page-container py-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <section>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {UI_TEXT.heroDescription} {UI_TEXT.heroTrust}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {HERO_TAGS.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">
                {UI_TEXT.skillsTitle}
              </h2>
              <ul className="space-y-2.5">
                {CAPABILITIES.map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="shrink-0 text-base">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">
                {UI_TEXT.nearbyTitle}
              </h2>
              <div className="space-y-2">
                {NEARBY_CALCULATORS.map((link) => (
                  <Link
                    key={link.slug}
                    href={link.href}
                    className="flex items-center gap-2 py-1 text-sm text-slate-600 no-underline transition-colors hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    {link.title}
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="card border-accent-100 bg-accent-50 p-5 dark:border-accent-800/40 dark:bg-accent-900/20">
            <div className="mb-2 text-2xl">📱</div>
            <h2 className="mb-1 font-bold text-slate-900 dark:text-slate-100">{UI_TEXT.appTitle}</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-300">
              {UI_TEXT.appDescription}
            </p>
            <Link href="/prilozhenie/" className="btn-primary inline-flex text-sm">
              {UI_TEXT.download}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}





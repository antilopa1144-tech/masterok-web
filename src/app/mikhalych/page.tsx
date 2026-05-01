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
  heroTitle: "Михалыч — AI-ассистент строителя",
  heroDescription:
    "Опытный строительный мастер с 30-летним стажем. Поможет рассчитать материалы, объяснит технологию и предупредит об ошибках. Говорит просто, по делу.",
  heroCta: "Задать вопрос",
  heroTrust: "Отвечает по-русски, без канцелярита и с поправкой на реальную стройку.",
  scenariosTitle: "Быстрые сценарии",
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

const HERO_SCENARIOS = [
  "Проверить расчёт материалов",
  "Разобраться с технологией",
  "Подобрать нормальный материал",
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
      <div className="relative overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" aria-hidden="true" />
        <div className="page-container-wide relative py-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div className="flex items-start gap-5">
              <div className="relative shrink-0" role="img" aria-label="AI-помощник Михалыч">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-500 text-4xl shadow-2xl shadow-accent-500/30">
                  🤖
                </div>
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-950 bg-emerald-500 text-[10px] font-bold">
                  ON
                </span>
              </div>
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {UI_TEXT.heroBadge}
                </div>
                <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
                  {UI_TEXT.heroTitle}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
                  {UI_TEXT.heroDescription}
                </p>
                <p className="mt-3 max-w-xl text-sm text-slate-400">
                  {UI_TEXT.heroTrust}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {HERO_TAGS.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
                <a href="#mikhalych-chat" className="btn-primary mt-6 inline-flex text-base">
                  {UI_TEXT.heroCta}
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <p className="mb-3 text-sm font-bold text-white">{UI_TEXT.scenariosTitle}</p>
              <div className="space-y-2">
                {HERO_SCENARIOS.map((scenario, index) => (
                  <div key={scenario} className="flex items-center gap-3 rounded-2xl bg-slate-950/35 px-3 py-3 text-sm text-slate-200">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent-500/20 text-xs font-bold text-accent-200">
                      {index + 1}
                    </span>
                    {scenario}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div id="mikhalych-chat" className="scroll-mt-24 lg:col-span-2">
            <MikhalychChat starterQuestions={[...STARTER_QUESTIONS]} />
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
                {UI_TEXT.skillsTitle}
              </h2>
              <ul className="space-y-2.5">
                {CAPABILITIES.map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
                {UI_TEXT.nearbyTitle}
              </h3>
              <div className="space-y-2">
                {NEARBY_CALCULATORS.map((link) => (
                  <Link
                    key={link.slug}
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-accent-700 dark:hover:text-accent-400 no-underline transition-colors py-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="card p-5 bg-accent-50 dark:bg-accent-900/20 border-accent-100 dark:border-accent-800/40">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{UI_TEXT.appTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">
                {UI_TEXT.appDescription}
              </p>
              <Link href="/prilozhenie/" className="btn-primary text-sm w-full text-center">
                {UI_TEXT.download}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





import type { Metadata } from "next";
import Link from "next/link";
import { getCalculatorMetaBySlug as getCalculatorBySlug } from "@/lib/calculators/meta.generated";
import MikhalychChat from "@/components/mikhalych/MikhalychChat";
import MikhalychAvatar from "@/components/mikhalych/MikhalychAvatar";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Михалыч — AI-ассистент строителя`,
  description:
    "ИИ-помощник по ремонту: запускает калькуляторы Мастерок, объясняет результат, сравнивает варианты и помогает сохранить расчёты в проект.",
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/mikhalych/`,
});

const UI_TEXT = {
  heroBadge: "AI-агент, не просто чат",
  heroDescription:
    "Михалыч помогает разобрать задачу ремонта: находит подходящий калькулятор, подставляет известные размеры, сравнивает варианты и объясняет результат простыми словами.",
  heroTrust: "Количество материалов считает движок Мастерок, а ИИ помогает выбрать способ расчёта и понять итог. Если данных не хватает, результат остаётся предварительным.",
  skillsTitle: "Что Михалыч делает за вас",
  nearbyTitle: "Калькуляторы рядом",
  appTitle: "Михалыч в приложении",
  appDescription:
    `В приложении ${SITE_NAME} Михалыч работает прямо рядом с калькулятором.`,
  download: "Скачать",
  nearbyCalculatorFallback: "Калькулятор",
} as const;

const HERO_TAGS = [
  "Считает через калькуляторы",
  "Готовит расчёты для сметы",
  "Сравнивает материалы",
  "Объясняет ограничения",
] as const;

// Агентские примеры: показывают, что Михалычу можно ПОРУЧИТЬ задачу,
// а не только задать вопрос.
const STARTER_QUESTIONS = [
  "Начни смету ванной 5 м²: сначала посчитай плитку и гидроизоляцию",
  "Минвата или пеноплекс для фасада 50 м² — что выгоднее?",
  "Какие размеры нужны, чтобы оценить материалы для ванной?",
  "Сколько кирпича на перегородку 5×2.7 м в полкирпича?",
  "Собери смету материалов на стяжку и плитку в комнате 18 м²",
  "Чем штукатурить стены и сколько мешков на 30 м²?",
] as const;

const CAPABILITIES = [
  { icon: "🧮", text: "Запускает калькуляторы Мастерок и берёт количество материалов из расчётного движка" },
  { icon: "📋", text: "Готовит отдельные расчёты, которые можно добавить в существующий или новый проект" },
  { icon: "⚖️", text: "Сравнивает варианты при одинаковых размерах и показывает, откуда получилась разница" },
  { icon: "💰", text: "Ищет ценовой ориентир, когда доступен веб-поиск, но не выдаёт его за цену магазина" },
  { icon: "🧭", text: "Подсказывает, каких исходных данных не хватает и где нужен проект или осмотр специалиста" },
] as const;

const FAQ_ITEMS = [
  {
    question: "Почему Михалыч не считает количество материалов в уме?",
    answer:
      "Для количества мешков, листов, рулонов и других материалов Михалыч запускает калькуляторы сайта. ИИ выбирает инструмент и объясняет результат, но формулы, запас и округление до упаковок выполняет расчётный движок Мастерок.",
  },
  {
    question: "Можно ли доверять найденной цене материала?",
    answer:
      "Цена из интернета — только ориентир на момент поиска. Она зависит от региона, магазина, фасовки и условий доставки, поэтому перед покупкой нужно проверить карточку товара и итоговую цену у продавца.",
  },
  {
    question: "Как перенести расчёт в смету проекта?",
    answer:
      "Если Михалыч выполнил расчёт, под ответом появляется предложение добавить его в проект. Можно выбрать существующий проект или создать новый, а затем открыть сохранённую смету в разделе «Проекты».",
  },
  {
    question: "Заменяет ли ответ Михалыча строительный проект?",
    answer:
      "Нет. Помощник не видит объект и не заменяет обследование, рабочий проект или решение профильного специалиста. Это особенно важно для несущих конструкций, электрики, газа, отопления и других инженерных систем.",
  },
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

const mikhalychFaqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function MikhalychPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(mikhalychJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(mikhalychBreadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(mikhalychFaqLd) }} />
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
            <MikhalychAvatar size={36} className="h-9 w-9 rounded-xl shadow-sm" />
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

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Как получить полезный расчёт
              </h2>
              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
                Опишите не только материал, но и сам участок работы: размеры, количество помещений или
                поверхностей, толщину слоя, формат упаковки и уже принятые решения. Неизвестные параметры
                можно так и обозначить — Михалыч подскажет, что измерить до расчёта.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">
                Пример запроса
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                «Стена 5 × 2,7 м, один дверной проём 0,9 × 2,1 м. Хочу перегородку в полкирпича.
                Посчитай точную потребность и количество к покупке, объясни запас».
              </p>
            </div>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                Что считает движок, а что делает ИИ
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Геометрию, расход, запас и округление до покупки выполняет выбранный калькулятор.
                Михалыч связывает вопрос с нужными полями, может прогнать несколько вариантов и переводит
                технический результат на понятный язык. Поэтому в ответе полезно проверить исходные размеры
                и ссылку на использованный калькулятор.
              </p>
            </section>

            <section className="card p-5">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                Где заканчивается предварительная оценка
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Помощник не осматривает основание, не знает скрытых дефектов и не выпускает рабочую
                документацию. Для несущих конструкций и инженерных систем итоговые сечения, мощности,
                трассы и состав оборудования должен подтвердить профильный специалист по данным объекта.
              </p>
            </section>
          </div>

          <section className="card p-5">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">
              От ответа к смете проекта
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Когда в ответе есть выполненные расчёты, под чатом появляется кнопка сохранения. Добавляйте
              позиции в проект поэтапно — например, отдельно стены, пол и мокрые зоны. Так проще проверить
              исходные данные и не смешать предварительную оценку с окончательной ведомостью закупки.
            </p>
            <Link href="/proekty/" className="mt-4 inline-flex text-sm font-semibold text-accent-700 hover:underline dark:text-accent-400">
              Открыть проекты и сметы
            </Link>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Частые вопросы о Михалыче
            </h2>
            <div className="mt-4 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="card group p-5">
                  <summary className="cursor-pointer list-none pr-6 font-semibold text-slate-900 marker:content-none dark:text-slate-100">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

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




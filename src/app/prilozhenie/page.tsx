import type { Metadata } from "next";
import Link from "next/link";
import { MASTEROK_RUSTORE_URL, SITE_FOUNDING_DATE, SITE_NAME, SITE_URL } from "@/lib/site";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { buildPageMetadata } from "@/lib/metadata";
import TrackedRuStoreLink from "@/components/analytics/TrackedRuStoreLink";

const CALC_COUNT = ALL_CALCULATORS_META.length;

const META = {
  title: `Скачать приложение ${SITE_NAME} — строительные калькуляторы`,
  description:
    `Скачайте бесплатное приложение ${SITE_NAME} для Android. ${CALC_COUNT}+ строительных калькуляторов, работает без интернета, сохранение расчётов, AI-ассистент Михалыч.`,
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/prilozhenie/`,
});

const UI_TEXT = {
  storeBadge: "📱 Доступно в RuStore",
  heroTitle: `${SITE_NAME} — приложение`,
  heroAccent: "строительного мастера",
  heroDescription:
    `${CALC_COUNT}+ бесплатных строительных калькуляторов в вашем кармане. Работает без интернета. Идеально для стройки.`,
  downloadRuStore: "📲 Скачать в RuStore",
  onlineVersion: "Онлайн-версия",
  heroMeta: "Бесплатно · Android · работает без интернета",
  featuresTitle: "Что умеет приложение",
  ctaTitle: "Скачайте бесплатно",
  ctaDescription:
    `Установите ${SITE_NAME}, чтобы калькуляторы и сохранённые проекты были под рукой даже без интернета.`,
  ctaMeta: "Android · Бесплатно · RuStore",
} as const;

const FEATURES = [
  {
    icon: "📐",
    title: `${CALC_COUNT}+ калькуляторов`,
    desc: "Бетон, кирпич, кровля, плитка, ламинат, гипсокартон и многое другое. Все расчёты в одном приложении.",
  },
  {
    icon: "📡",
    title: "Работает офлайн",
    desc: "Все калькуляторы работают без интернета. Стройка в поле — не проблема.",
  },
  {
    icon: "💾",
    title: "Сохранение расчётов",
    desc: "Сохраняйте расчёты в проекты. Создавайте полные сметы по объекту.",
  },
  {
    icon: "🤖",
    title: "Михалыч AI",
    desc: "ИИ-ассистент прямо в приложении. Задай вопрос рядом с калькулятором.",
  },
  {
    icon: "📊",
    title: "Экспорт в PDF",
    desc: "Экспортируйте расчёты в PDF для передачи заказчику или в магазин.",
  },
  {
    icon: "🔗",
    title: "QR-коды",
    desc: "Делитесь расчётами через QR-коды. Мастер сканирует — видит список материалов.",
  },
] as const;

const APP_CATEGORIES = [
  { icon: "🏗️", name: "Бетон", cat: "Фундамент" },
  { icon: "🧱", name: "Кирпич", cat: "Стены" },
  { icon: "🏠", name: "Кровля", cat: "Кровля" },
  { icon: "🔲", name: "Ламинат", cat: "Полы" },
] as const;

/** Честное сравнение: что реально умеет веб-версия, а что добавляет приложение. */
const APP_VS_WEB = [
  {
    feature: "Установка",
    web: "Не нужна — открывается в браузере",
    app: "Android, установка из RuStore",
  },
  {
    feature: "Работа без интернета",
    web: "Нет: страницу и ассистента нужно загрузить из сети",
    app: "Калькуляторы считают офлайн",
  },
  {
    feature: "Сохранение расчётов",
    web: "Проекты в браузере, привязаны к устройству",
    app: "Проекты внутри приложения",
  },
  {
    feature: "Экспорт в PDF",
    web: "Есть у каждого калькулятора",
    app: "Есть",
  },
  {
    feature: "QR-код расчёта",
    web: "Нет",
    app: "Есть",
  },
  {
    feature: "ИИ-ассистент Михалыч",
    web: "Есть, отвечает через интернет",
    app: "Есть, отвечает через интернет",
  },
] as const;

const INSTALL_STEPS = [
  "Откройте карточку приложения в RuStore по кнопке на этой странице.",
  "Нажмите «Установить» и подтвердите установку — приложение бесплатное, регистрация не нужна.",
  "Откройте приложение и выберите калькулятор. Первый запуск не требует интернета после установки.",
] as const;

const APP_FAQ = [
  {
    question: "Приложение бесплатное?",
    answer:
      "Да. Скачивание и все калькуляторы бесплатны, регистрация и подписка не нужны. Оплата — только за стройматериалы, которые вы посчитаете.",
  },
  {
    question: "Нужен ли интернет, чтобы считать?",
    answer:
      "Для работы калькуляторов — нет, расчёты идут на устройстве и доступны офлайн. Интернет нужен только для установки, обновлений и ответов ИИ-ассистента Михалыча: он обращается к серверу.",
  },
  {
    question: "Чем приложение отличается от сайта?",
    answer:
      "Расчётная логика одна и та же, поэтому результаты совпадают. Приложение добавляет офлайн-режим, проекты внутри устройства и QR-код расчёта. Веб-версия не требует установки, а сохранённые проекты в браузере привязаны к конкретному устройству и браузеру.",
  },
  {
    question: "Куда сохраняются расчёты?",
    answer:
      "В проекты на вашем устройстве: в приложении — внутри приложения, в веб-версии — в хранилище браузера. Аккаунта и входа нет, поэтому привязки к серверу тоже нет: чтобы перенести расчёт на другое устройство, используйте экспорт в PDF или QR-код.",
  },
  {
    question: "Есть ли версия для iOS?",
    answer:
      "Сейчас приложение публикуется для Android в RuStore. На iPhone и iPad пользуйтесь веб-версией: она открывается в Safari и считает так же, но без офлайн-режима и QR-кода.",
  },
  {
    question: "Насколько точны расчёты?",
    answer:
      "Калькуляторы считают по строительным нормам и паспортным расходам материалов, отдельно показывая точную потребность и итог к покупке с округлением до целых упаковок. Формулы, коэффициенты запаса и источники норм описаны на странице методологии — там же указано, что расчёт не заменяет проект.",
  },
] as const;

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  "@id": `${SITE_URL}/#mobile-app`,
  name: `${SITE_NAME} — строительный калькулятор`,
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
  datePublished: SITE_FOUNDING_DATE,
  description: META.description,
  publisher: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
  },
  // AggregateRating убран — фейковые рейтинги нарушают гайдлайны Google.
  // Добавить обратно только при наличии реальных отзывов из RuStore API.
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Приложение" },
  ],
};

// FAQPage: вопросы — те же, что видны на странице в разделе «Частые вопросы».
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: `${SITE_URL}/prilozhenie/`,
  mainEntity: APP_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function PrilozheniePage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <section className="hero-gradient border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 text-sm font-medium px-4 py-2 rounded-full border border-accent-200 dark:border-accent-800/40 mb-5">
                {UI_TEXT.storeBadge}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-4">
                {UI_TEXT.heroTitle}
                <br />
                <span className="text-accent-500">{UI_TEXT.heroAccent}</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-300 text-lg leading-relaxed mb-6">
                {UI_TEXT.heroDescription}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <TrackedRuStoreLink
                  href={MASTEROK_RUSTORE_URL}
                  placement="app_hero"
                  className="btn-primary text-base px-8 py-3.5"
                >
                  {UI_TEXT.downloadRuStore}
                </TrackedRuStoreLink>
                <Link href="/" className="btn-secondary text-base">
                  {UI_TEXT.onlineVersion}
                </Link>
              </div>

              <p className="text-sm text-slate-400 dark:text-slate-400 mt-3">
                {UI_TEXT.heroMeta}
              </p>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className="w-52 h-96 bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-700 flex flex-col">
                  <div className="bg-slate-800 h-6 flex items-center justify-between px-4">
                    <span className="text-white text-xs">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-1.5 bg-white/60 rounded-sm" />
                      <div className="w-3 h-1.5 bg-white rounded-sm" />
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-50 p-3">
                    <div className="bg-orange-500 rounded-xl p-3 mb-2 text-white text-center">
                      <div className="text-lg">🔨</div>
                      <div className="text-xs font-bold">{SITE_NAME}</div>
                    </div>
                    {APP_CATEGORIES.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 bg-white rounded-lg p-2 mb-1.5 shadow-xs"
                      >
                        <div className="text-base">{item.icon}</div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.cat}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Проверяемые свойства приложения без динамических рейтингов и версий. */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{CALC_COUNT}+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Калькуляторов</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Офлайн</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Без интернета</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Проекты</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Сохранение расчётов</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">0 ₽</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Скачивание</div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container-wide py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-8">
          {UI_TEXT.featuresTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            Приложение или веб-версия
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mb-6">
            Расчётная логика одна и та же — набор калькуляторов и формулы совпадают, поэтому результаты
            сходятся. Разница в том, как вы ими пользуетесь.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th scope="col" className="border-b border-slate-200 py-2 pr-4 font-semibold dark:border-slate-700">
                    Возможность
                  </th>
                  <th scope="col" className="border-b border-slate-200 py-2 pr-4 font-semibold dark:border-slate-700">
                    Веб-версия
                  </th>
                  <th scope="col" className="border-b border-slate-200 py-2 font-semibold dark:border-slate-700">
                    Приложение
                  </th>
                </tr>
              </thead>
              <tbody>
                {APP_VS_WEB.map((row) => (
                  <tr key={row.feature} className="align-top">
                    <th
                      scope="row"
                      className="border-b border-slate-100 py-3 pr-4 text-left font-medium text-slate-900 dark:border-slate-800 dark:text-slate-100"
                    >
                      {row.feature}
                    </th>
                    <td className="border-b border-slate-100 py-3 pr-4 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {row.web}
                    </td>
                    <td className="border-b border-slate-100 py-3 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {row.app}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="page-container-wide py-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Как установить приложение
          </h2>
          <ol className="max-w-3xl space-y-4">
            {INSTALL_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-slate-200 dark:border-slate-800">
        <div className="page-container-wide py-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Частые вопросы</h2>
          <div className="max-w-3xl space-y-3">
            {APP_FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <summary className="relative cursor-pointer list-none pr-6 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <h3 className="text-sm font-semibold">{item.question}</h3>
                  <span className="absolute right-0 top-0 text-slate-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="page-container-wide py-8 pb-14">
        <div className="bg-accent-500 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{UI_TEXT.ctaTitle}</h2>
          <p className="text-accent-100 mb-6 max-w-lg mx-auto">
            {UI_TEXT.ctaDescription}
          </p>
          <TrackedRuStoreLink
            href={MASTEROK_RUSTORE_URL}
            placement="app_bottom_cta"
            className="inline-flex items-center gap-2 bg-white text-accent-700 font-bold px-8 py-3.5 rounded-xl hover:bg-accent-50 transition-colors no-underline"
          >
            {UI_TEXT.downloadRuStore}
          </TrackedRuStoreLink>
          <p className="text-accent-100 text-sm mt-3">
            {UI_TEXT.ctaMeta}
          </p>
        </div>
      </section>
    </div>
  );
}





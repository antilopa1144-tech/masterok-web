import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_FOUNDING_DATE, SITE_NAME, SITE_SAME_AS, SITE_URL } from "@/lib/site";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";

export const metadata: Metadata = buildPageMetadata({
  title: `О проекте ${SITE_NAME} — строительные калькуляторы`,
  description:
    `${SITE_NAME} — бесплатный сервис из ${ALL_CALCULATORS_META.length}+ строительных калькуляторов с нормами расхода, запасом и итогом к покупке. О проекте, миссии и технологиях.`,
  url: `${SITE_URL}/o-proekte/`,
});

export default function AboutPage() {
  const baseUrl = SITE_URL;

  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `О проекте ${SITE_NAME}`,
    url: `${baseUrl}/o-proekte/`,
    description: `Информация о проекте ${SITE_NAME} — бесплатном сервисе строительных калькуляторов.`,
    mainEntity: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: SITE_NAME,
      url: baseUrl,
      foundingDate: SITE_FOUNDING_DATE,
      areaServed: { "@type": "Country", name: "Россия" },
      sameAs: [...SITE_SAME_AS],
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "О проекте", item: `${baseUrl}/o-proekte/` },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section className="page-container py-10 md:py-16">
        <nav className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-accent-700 no-underline">Главная</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 dark:text-slate-200">О проекте</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-8">
          О проекте {SITE_NAME}
        </h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2>Что такое {SITE_NAME}</h2>
            <p>
              {SITE_NAME} — это бесплатный онлайн-сервис строительных калькуляторов для строителей, прорабов,
              проектировщиков и всех, кто планирует ремонт или строительство. {ALL_CALCULATORS_META.length}+ калькуляторов
              помогают оценить количество материалов: от бетона и кирпича до обоев и ламината.
            </p>
          </section>

          <section>
            <h2>Как устроены расчёты</h2>
            <p>
              Основа калькулятора — геометрия и единицы измерения. Где это применимо, мы добавляем
              нормы расхода из документов и технических данных производителей, практический запас,
              а затем округляем результат до мешков, листов, рулонов или других единиц покупки.
              Конкретные нормативные документы указываются только там, где они действительно относятся
              к расчёту. Подробнее — в <Link href="/metodologiya/">методике расчётов</Link>.
            </p>
            <ul>
              <li>Чистая потребность отделена от количества к покупке</li>
              <li>Запас и округление до упаковки показаны явно</li>
              <li>Нормы расхода берутся из технических данных и справочников</li>
              <li>Режимы точности: базовый, реалистичный, профессиональный</li>
            </ul>
          </section>

          <section>
            <h2>Статьи и рекомендации</h2>
            <p>
              Материалы в блоге носят рекомендательный и справочный характер: они помогают разобраться
              в теме, выбрать подход и избежать типичных ошибок. Это не проектная документация и не
              замена консультации профильного специалиста для ответственных конструкций.
            </p>
          </section>

          <section>
            <h2>Технологии</h2>
            <p>
              Сервис построен на единой платформе: веб-сайт и мобильное приложение используют
              один и тот же вычислительный движок. Результаты расчётов в приложении и на сайте
              совпадают до цифры. Приложение для Android доступно в{" "}
              <Link href="/prilozhenie/">RuStore</Link> и работает без интернета.
            </p>
          </section>

          <section>
            <h2>ИИ-прораб Михалыч</h2>
            <p>
              Встроенный ИИ-ассистент{" "}
              <Link href="/mikhalych/">Михалыч</Link>{" "}
              отвечает на вопросы по строительству и ремонту: подбирает марку бетона,
              рассчитывает шаг укладки, объясняет технологии монтажа. Доступен на сайте
              и в мобильном приложении.
            </p>
          </section>

          <section>
            <h2>Для кого этот сервис</h2>
            <ul>
              <li>Частные застройщики, планирующие строительство дома</li>
              <li>Прорабы и бригадиры для быстрой оценки материалов</li>
              <li>Проектировщики и сметчики для предварительных расчётов</li>
              <li>Все, кто делает ремонт квартиры или дома своими руками</li>
            </ul>
          </section>

          <section>
            <h2>Бесплатно и без ограничений</h2>
            <p>
              Все калькуляторы полностью бесплатные. Нет регистрации, подписок, скрытых платежей
              и рекламы. Расчёты сохраняются в истории и доступны в любое время.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}

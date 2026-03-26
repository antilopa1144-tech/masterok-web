import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_EXPERT, SITE_FOUNDING_DATE, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: `${SITE_EXPERT.name} — эксперт проекта ${SITE_NAME}`,
  description:
    `${SITE_EXPERT.name}, ${SITE_EXPERT.jobTitle.toLowerCase()}. ${SITE_EXPERT.description} Автор расчётов на сайте ${SITE_NAME}.`,
  url: `${SITE_URL}/o-spetsialiste/`,
});

export default function SpecialistPage() {
  const baseUrl = SITE_URL;

  const personLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: SITE_EXPERT.name,
      jobTitle: SITE_EXPERT.jobTitle,
      description: SITE_EXPERT.description,
      url: `${baseUrl}/o-spetsialiste/`,
      worksFor: {
        "@type": "Organization",
        name: SITE_NAME,
        url: baseUrl,
      },
      knowsAbout: [
        "Строительство",
        "Расчёт строительных материалов",
        "ГОСТ и СНиП",
        "Фундаменты",
        "Кровля",
        "Отделочные работы",
      ],
    },
    dateCreated: SITE_FOUNDING_DATE,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "О специалисте", item: `${baseUrl}/o-spetsialiste/` },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section className="page-container py-10 md:py-16">
        <nav className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-accent-600 no-underline">Главная</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 dark:text-slate-200">О специалисте</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          {SITE_EXPERT.name}
        </h1>
        <p className="text-lg text-accent-600 dark:text-accent-400 font-medium mb-8">
          {SITE_EXPERT.jobTitle}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2>Об эксперте</h2>
            <p>
              Андрей Николаевич Белов — инженер-строитель с более чем 30-летним стажем
              в области проектирования и строительства жилых и промышленных объектов.
              Кандидат технических наук. Специализируется на расчётах строительных
              конструкций, нормировании расхода материалов и контроле качества работ.
            </p>
          </section>

          <section>
            <h2>Специализация</h2>
            <ul>
              <li>Расчёт фундаментов: ленточные, плитные, свайные основания</li>
              <li>Проектирование стеновых конструкций: кирпич, газобетон, монолит</li>
              <li>Кровельные системы: скатные и плоские кровли, водосток</li>
              <li>Нормирование расхода отделочных материалов по ГОСТ и СНиП</li>
              <li>Разработка методик расчёта для строительных калькуляторов</li>
            </ul>
          </section>

          <section>
            <h2>Подход к расчётам</h2>
            <p>
              Все калькуляторы на сайте {SITE_NAME} разработаны под руководством Андрея
              Николаевича с учётом действующих нормативных документов. Каждый калькулятор
              учитывает реальные условия строительства и предоставляет три сценария расчёта:
              минимальный, рекомендуемый и максимальный.
            </p>
            <p>
              Формулы расхода материалов основаны на:
            </p>
            <ul>
              <li>Государственных стандартах (ГОСТ)</li>
              <li>Строительных нормах и правилах (СНиП, СП)</li>
              <li>Технических паспортах производителей</li>
              <li>Практическом опыте строительства в российских условиях</li>
            </ul>
          </section>

          <section>
            <h2>Опыт</h2>
            <p>
              За 30 лет работы Андрей Николаевич участвовал в проектировании и строительстве
              объектов различного назначения — от частных жилых домов до многоэтажных
              комплексов. Этот опыт позволяет учитывать в расчётах не только теоретические
              нормы, но и практические особенности: запас на подрезку, отходы, усадку
              и климатические условия.
            </p>
          </section>

          <section>
            <h2>Калькуляторы</h2>
            <p>
              Под руководством эксперта разработано более 60 строительных калькуляторов,
              охватывающих все этапы строительства и ремонта: от фундамента до кровли.
              Все калькуляторы доступны бесплатно на{" "}
              <Link href="/kalkulyatory/">сайте</Link> и в{" "}
              <Link href="/prilozhenie/">мобильном приложении</Link>.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}

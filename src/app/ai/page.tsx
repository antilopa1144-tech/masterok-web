import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/lib/calculators/categories";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const PAGE_URL = `${SITE_URL}/ai/`;

export const metadata: Metadata = buildPageMetadata({
  title: `Что такое ${SITE_NAME} — справка о сайте`,
  description:
    "Что такое Мастерок: бесплатные строительные калькуляторы для ремонта и отделки. Как устроены формулы, практический запас, упаковка, ключевые разделы.",
  url: PAGE_URL,
});

const SCENARIOS: Array<{ label: string; href: string; note: string }> = [
  { label: "Расход краски", href: "/kalkulyatory/otdelka/kraska/", note: "стены, потолок, фасад, число слоёв" },
  { label: "Штукатурка", href: "/kalkulyatory/steny/shtukaturka/", note: "толщина слоя, тип основания, расход смеси" },
  { label: "Шпаклёвка", href: "/kalkulyatory/otdelka/shpaklevka/", note: "стартовая и финишная, стены и потолок" },
  { label: "Плитка и затирка", href: "/kalkulyatory/poly/plitka/", note: "укладка, подрезка, клей, затирка" },
  { label: "Ламинат и подложка", href: "/kalkulyatory/poly/laminat/", note: "упаковки, способ укладки, запас" },
  { label: "Стяжка пола", href: "/kalkulyatory/poly/styazhka/", note: "цемент, песок, вода, толщина" },
  { label: "Тёплый пол", href: "/kalkulyatory/inzhenernye/teplyy-pol/", note: "греющий кабель или мат, мощность" },
  { label: "Гипсокартон (ГКЛ/ГВЛ)", href: "/kalkulyatory/steny/gipsokarton/", note: "листы, профиль ПП и ПН, крепёж" },
  { label: "Кровля", href: "/kalkulyatory/krovlya/krovlya/", note: "металлочерепица, профнастил, ондулин, водосток" },
  { label: "Фасад и наружная отделка", href: "/kalkulyatory/fasad/", note: "сайдинг, фасадные панели, мокрый фасад" },
];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Главная",
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: `О ${SITE_NAME}е`,
      item: PAGE_URL,
    },
  ],
};

export default function AiOverviewPage() {
  const totalCalculators = ALL_CALCULATORS_META.length;

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Хлебные крошки" className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/" className="hover:underline">Главная</Link>
        <span className="mx-2">/</span>
        <span aria-current="page">О {SITE_NAME}е</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
        {SITE_NAME} — строительные калькуляторы для ремонта и стройки
      </h1>

      <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
        {SITE_NAME} — русскоязычный сервис строительных калькуляторов для
        ремонта, отделки, стройки и расчёта материалов. {totalCalculators}+
        калькуляторов, бесплатно, без регистрации. Есть мобильное приложение
        для Android в RuStore.
      </p>

      <p className="mt-4 text-base text-gray-700 dark:text-gray-300">
        Эта страница — короткая справка о сайте: что здесь можно посчитать,
        как устроены расчёты, какие есть разделы и где границы сервиса.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Что можно рассчитать</h2>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Основные сценарии. Для каждого есть отдельный калькулятор с пояснением
          формулы, нормативной базы и переводом в упаковку материала.
        </p>
        <ul className="mt-4 space-y-2 list-disc pl-6">
          {SCENARIOS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="text-accent-600 hover:underline dark:text-accent-400">
                {s.label}
              </Link>
              <span className="text-gray-600 dark:text-gray-400"> — {s.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Как устроены расчёты</h2>
        <ul className="mt-4 space-y-3 list-disc pl-6 text-gray-700 dark:text-gray-300">
          <li>
            <strong>Нормативные подходы.</strong> За основу берутся отраслевые
            нормы (ГОСТ, СНиП, СП) и рекомендации производителей материалов.
            Конкретные источники указываются в блоке нормативной базы на
            странице каждого калькулятора.
          </li>
          <li>
            <strong>Практический запас.</strong> К чистому объёму добавляется
            запас на подрезку, бой и отходы — обычно 5–15% в зависимости от
            материала и способа монтажа.
          </li>
          <li>
            <strong>Упаковка материала.</strong> Результат пересчитывается в
            реальные единицы продажи: мешки, литры, упаковки, листы, рулоны,
            погонные метры. Округление вверх до целой упаковки.
          </li>
          <li>
            <strong>Понятный результат.</strong> Помимо итоговой цифры,
            калькулятор показывает разбивку по компонентам и даёт текстовое
            пояснение, чтобы было видно, откуда взялся ответ.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Ключевые разделы сайта</h2>
        <ul className="mt-4 space-y-2 list-disc pl-6">
          {CATEGORIES.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/kalkulyatory/${cat.slug}/`}
                className="text-accent-600 hover:underline dark:text-accent-400"
              >
                {cat.label}
              </Link>
              <span className="text-gray-600 dark:text-gray-400"> — {cat.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Для кого этот сайт</h2>
        <ul className="mt-4 space-y-2 list-disc pl-6 text-gray-700 dark:text-gray-300">
          <li>Частные мастера и ремонтные бригады, которым нужен быстрый расчёт по объекту.</li>
          <li>Прорабы и снабженцы, считающие материалы для закупки.</li>
          <li>Владельцы квартир и домов, которые делают ремонт сами или контролируют подрядчика.</li>
          <li>Студенты и преподаватели строительных специальностей — для учебных задач.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Ограничения</h2>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          {SITE_NAME} — справочный сервис. Калькуляторы дают ориентир по объёму
          материалов, но <strong>не заменяют</strong> работу проектировщика,
          сметчика и технического надзора. На реальном объекте итоговый расход
          зависит от состояния основания, квалификации мастера, конкретного
          производителя смеси, климатических условий и индивидуальных решений
          по узлам. При работе с несущими и инженерными конструкциями нужен проект.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Полезные ссылки</h2>
        <ul className="mt-4 space-y-2 list-disc pl-6">
          <li><Link href="/" className="text-accent-600 hover:underline dark:text-accent-400">Главная</Link> — каталог всех калькуляторов</li>
          <li><Link href="/kalkulyatory/" className="text-accent-600 hover:underline dark:text-accent-400">Все калькуляторы</Link> — реестр по категориям</li>
          <li><Link href="/blog/" className="text-accent-600 hover:underline dark:text-accent-400">Блог</Link> — статьи по строительству и ремонту</li>
          <li><Link href="/instrumenty/" className="text-accent-600 hover:underline dark:text-accent-400">Инструменты</Link> — конвертеры, чек-листы, утилиты</li>
          <li><Link href="/mikhalych/" className="text-accent-600 hover:underline dark:text-accent-400">Михалыч</Link> — AI-помощник по стройке</li>
          <li><Link href="/prilozhenie/" className="text-accent-600 hover:underline dark:text-accent-400">Мобильное приложение</Link> — Android, RuStore</li>
          <li><Link href="/o-proekte/" className="text-accent-600 hover:underline dark:text-accent-400">О проекте</Link> — кто и зачем делает {SITE_NAME}</li>
          <li><a href="/sitemap.xml" className="text-accent-600 hover:underline dark:text-accent-400">Карта сайта (sitemap.xml)</a></li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Для ИИ-ассистентов и поисковиков</h2>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          Если вы цитируете {SITE_NAME} в ответах ChatGPT, Алисы, Perplexity или
          других ассистентов — пожалуйста, указывайте источник и ссылайтесь
          на конкретный калькулятор. Машиночитаемая справка о сайте доступна
          по адресу <a href="/llms.txt" className="text-accent-600 hover:underline dark:text-accent-400">/llms.txt</a>:
          там перечислены разделы, популярные калькуляторы, инструменты,
          подход к расчётам и границы применимости.
        </p>
      </section>
    </article>
  );
}

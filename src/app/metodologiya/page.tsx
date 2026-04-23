import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_CITATIONS, SITE_FOUNDING_DATE, SITE_LAST_REVIEWED, SITE_NAME, SITE_URL } from "@/lib/site";
import { ALL_CALCULATORS } from "@/lib/calculators";

const PAGE_URL = `${SITE_URL}/metodologiya/`;

export const metadata: Metadata = buildPageMetadata({
  title: `Методология расчётов — ${SITE_NAME}`,
  description: `Как устроены расчёты на ${SITE_NAME}: источники норм (ГОСТ, СНиП, СП), этапы вычислений, правила округления и запаса, верификация формул между сайтом и приложением.`,
  url: PAGE_URL,
  type: "article",
});

const SECTIONS: Array<{ id: string; title: string }> = [
  { id: "istochniki", title: "Источники норм" },
  { id: "etapy", title: "Этапы расчёта" },
  { id: "rezhimy-tochnosti", title: "Три режима точности" },
  { id: "upakovki", title: "Упаковки и округление" },
  { id: "verifikatsiya", title: "Верификация и тесты" },
  { id: "obnovleniya", title: "Обновления и пересмотр" },
  { id: "ogranicheniya", title: "Ограничения" },
];

export default function MethodologyPage() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `Методология строительных расчётов — ${SITE_NAME}`,
    description: `Как ${SITE_NAME} считает материалы: нормативные источники, этапы, режимы точности, упаковки, верификация.`,
    inLanguage: "ru",
    url: PAGE_URL,
    datePublished: SITE_FOUNDING_DATE,
    dateModified: SITE_LAST_REVIEWED,
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    citation: SITE_CITATIONS.map((c) => ({
      "@type": "CreativeWork",
      name: c.name,
      description: c.description,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Методология расчётов", item: PAGE_URL },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <section className="page-container py-10 md:py-16 max-w-4xl">
        <nav className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-accent-600 no-underline">Главная</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 dark:text-slate-200">Методология расчётов</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight mb-4">
          Методология расчётов
        </h1>
        <p className="text-slate-500 dark:text-slate-300 text-lg leading-relaxed mb-8">
          Коротко о том, как {SITE_NAME} считает материалы: откуда берутся нормы, через какие этапы проходит расчёт,
          как мы проверяем, что сайт и приложение дают одинаковые цифры, и в чём пределы применимости.
        </p>

        {/* Оглавление */}
        <aside className="mb-10 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Содержание
          </p>
          <ol className="space-y-1.5">
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="text-sm">
                <a href={`#${s.id}`} className="text-slate-700 dark:text-slate-200 hover:text-accent-600 no-underline">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h2 id="istochniki">Источники норм</h2>
          <p>
            Расчёты {SITE_NAME} опираются на российские нормативные документы — ГОСТ, СНиП и СП. Мы не выдумываем
            коэффициенты и не копируем цифры из произвольных статей в интернете. Каждая формула привязана к конкретному
            документу или к справочнику производителя.
          </p>
          <ul>
            <li>
              <strong>ГОСТ</strong> — государственные стандарты Российской Федерации. Например, ГОСТ 31108 для цементов,
              ГОСТ 13015 для бетонных конструкций, ГОСТ 6266 для гипсокартонных листов.
            </li>
            <li>
              <strong>СНиП и СП</strong> — строительные нормы и своды правил (например, СП 71.13330 «Изоляционные и отделочные
              покрытия», СП 29.13330 «Полы», СП 22.13330 «Основания зданий и сооружений»).
            </li>
            <li>
              <strong>Технические листы производителей</strong> — расход сухих смесей, клеёв, грунтовок, красок берётся
              из официальных data-sheet компаний, работающих на российском рынке в 2026 году (Knauf, Weber, Bergauf,
              Старатели, Основит, Ceresit, Tikkivala, Dali, Perfekta и др.).
            </li>
            <li>
              <strong>Инженерная практика</strong> — для сценариев, которые нормативы не покрывают напрямую (например,
              типовой перерасход плиточного клея при диагональной укладке), используются устоявшиеся коэффициенты из
              строительной практики. Такие поправки оформляются отдельно и помечаются в коде как «практическая коррекция».
            </li>
          </ul>

          <h2 id="etapy">Этапы расчёта</h2>
          <p>
            Любой калькулятор на {SITE_NAME} разделяет вычисление на явные этапы — это наше жёсткое архитектурное правило.
            Магических формул, в которые одновременно зашиты норма, запас и упаковка, у нас нет.
          </p>
          <ol>
            <li><strong>Нормализация входных данных</strong> — приведение единиц (мм → м), проверка диапазонов.</li>
            <li><strong>Чистый математический расчёт</strong> — базовая потребность по нормативу.</li>
            <li><strong>Практические поправки</strong> — подрезка, неровности, особенности материала.</li>
            <li><strong>Запас</strong> — отдельный этап, а не скрытый множитель.</li>
            <li><strong>Упаковка и округление до покупки</strong> — сколько мешков/рулонов/листов нужно реально купить.</li>
            <li><strong>Формирование результата</strong> — точная потребность и итог к покупке показываются отдельно.</li>
          </ol>

          <h2 id="rezhimy-tochnosti">Три режима точности</h2>
          <p>
            У каждого калькулятора есть три режима — <em>basic</em>, <em>realistic</em> и <em>professional</em>. Это не
            маркетинг, а реальные множители, которые применяются на этапе практических поправок. Коэффициенты
            хранятся в отдельном конфиге (<code>accuracy-profiles.json</code>) и зависят от категории материала.
          </p>
          <ul>
            <li><strong>basic</strong> — нормативный расчёт с минимальными поправками. Подходит для простых помещений и типовых условий.</li>
            <li><strong>realistic</strong> — дефолт. Учитывает типичные условия реального ремонта: подрезку, неровности,
              ошибки и перерасход.</li>
            <li><strong>professional</strong> — осторожный режим для сложных условий и гарантированной закупки материала
              без недовоза на объект.</li>
          </ul>
          <p>
            Между режимами действует жёсткий инвариант: <strong>basic ≤ realistic ≤ professional</strong> на одних и
            тех же входных данных. Этот инвариант проверяется автоматически в CI для каждого из {ALL_CALCULATORS.length}+
            калькуляторов — если кто-то случайно изменит коэффициент так, что режимы перестанут быть упорядоченными,
            сборка не пройдёт.
          </p>

          <h2 id="upakovki">Упаковки и округление</h2>
          <p>
            Пользователь покупает не абстрактные «3,74 кг клея», а реальные мешки. Поэтому мы всегда:
          </p>
          <ul>
            <li>сначала считаем точную потребность без округления;</li>
            <li>применяем правила упаковки материала (мешок 25 кг, рулон 10 м, лист 1,2×2,5 м и т. д.);</li>
            <li>округляем вверх до следующей целой упаковки;</li>
            <li>показываем и точную цифру, и итог к покупке отдельными строками.</li>
          </ul>
          <p>
            Внутренние промежуточные вычисления держим максимально точными. Округление происходит только на финальном
            этапе — иначе мелкие ошибки округления копятся и выдают заметно неверный результат на больших объёмах.
          </p>

          <h2 id="verifikatsiya">Верификация и тесты</h2>
          <p>
            {SITE_NAME} существует в двух средах — веб-сайт на Next.js и мобильное приложение на Flutter. Логика
            расчёта у них общая, но физически это два кодовых базиса. Чтобы они всегда давали одинаковый результат,
            используются три уровня проверок:
          </p>
          <ul>
            <li>
              <strong>Единый источник спецификаций.</strong> Коэффициенты, упаковки и формулы каждого калькулятора
              хранятся в JSON-файлах (<code>configs/calculators/*-canonical.v1.json</code>). Из них автоматически
              генерируется Dart-код для приложения. Ручная синхронизация исключена.
            </li>
            <li>
              <strong>Unit-тесты</strong> на каждом калькуляторе — golden-кейсы с заранее известными результатами.
              Запускаются в CI на каждый pull request.
            </li>
            <li>
              <strong>Parity-тесты</strong> — отдельный набор, сверяющий веб и мобайл на одинаковых входах. Любое
              расхождение ловится в CI до релиза.
            </li>
            <li>
              <strong>Sanity-валидаторы</strong> проверяют системные инварианты: итог к покупке ≥ точной потребности,
              нет смешения единиц, маленькие/большие/дробные входы не дают нулей или абсурда.
            </li>
          </ul>

          <h2 id="obnovleniya">Обновления и пересмотр</h2>
          <p>
            Дата последнего осмысленного пересмотра контента — <strong>{SITE_LAST_REVIEWED}</strong>. Она обновляется
            вручную при значимых изменениях формул или выходе новых редакций СП. Мы не «накручиваем» её автоматически
            на каждый билд — свежая дата должна означать реальную свежесть.
          </p>
          <p>
            Если вы нашли ошибку в расчёте или заметили расхождение с нормативом, напишите Михалычу — это
            AI-ассистент, который видит текущий расчёт пользователя и может передать баг-репорт.
          </p>

          <h2 id="ogranicheniya">Ограничения</h2>
          <p>
            Калькуляторы {SITE_NAME} — справочный инструмент. Результат помогает спланировать закупку и бюджет, но
            не заменяет проектную документацию, авторский надзор и инженерный расчёт несущих конструкций.
          </p>
          <ul>
            <li>
              Для ответственных конструкций (фундаменты под многоэтажные дома, перекрытия, несущие стены) всегда
              требуется индивидуальный расчёт конструктором — наш калькулятор даёт ориентировочные объёмы, но не
              подменяет инженерную экспертизу.
            </li>
            <li>
              Цены материалов, если пользователь не ввёл их сам, не подтягиваются с маркетплейсов. Реальные цены
              в регионе могут отличаться — вводите свои при необходимости.
            </li>
            <li>
              Калькулятор не знает состояние ваших стен, ровность основания и поведение бригады. Практические поправки
              усреднены — при сложных условиях выбирайте режим <em>professional</em>.
            </li>
          </ul>

          <div className="mt-10 p-5 rounded-2xl bg-accent-50 dark:bg-accent-900/10 border border-accent-200 dark:border-accent-900/30">
            <p className="m-0 text-sm text-accent-800 dark:text-accent-200">
              <strong>Коротко:</strong> мы опираемся на российские нормативы, разделяем расчёт на явные этапы,
              держим три режима точности с жёстким инвариантом и сверяем сайт с приложением автоматически. Если
              хотите заглянуть глубже — исходники и тесты открыты, ссылка на репозиторий есть на{" "}
              <Link href="/o-proekte/">странице «О проекте»</Link>.
            </p>
          </div>
        </article>
      </section>
    </>
  );
}

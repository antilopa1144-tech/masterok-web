import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import ProjectsPageClient from "./ProjectsPageClient";

export const metadata: Metadata = buildPageMetadata({
  // Суффикс бренда добавляет withSiteSuffix в buildPageMetadata, если заголовок
  // остаётся в пределах выдачи. Раньше он был вписан в строку вручную, и
  // получался дубль «… — Мастерок — Мастерок».
  title: "Мой ремонт — сметы и закупка материалов",
  description:
    "Сохраняйте расчёты калькуляторов в проекты: сводная смета, цены материалов, отметки «куплено», экспорт CSV и печать списка закупки.",
  url: `${SITE_URL}/proekty/`,
});

/**
 * Разметка страницы-каталога: раньше у /proekty/ не было JSON-LD вообще —
 * единственная страница в sitemap без структурированных данных.
 */
const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Мой ремонт — проекты и сметы",
  description:
    "Сводные сметы по объекту: материалы из калькуляторов, цены, отметки о покупке, экспорт и печать списка закупки.",
  url: `${SITE_URL}/proekty/`,
  inLanguage: "ru",
  isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/` },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Мой ремонт", item: `${SITE_URL}/proekty/` },
    ],
  },
};

export default function ProektyPage() {
  return (
    <div className="page-container py-5 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      {/* Хлебные крошки */}
      <nav className="mb-6 hidden items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 sm:flex">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Главная</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">Мой ремонт</span>
      </nav>

      {/* Заголовок */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Мой ремонт
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
            Все расчёты объекта в одном месте: материалы, цены и отметки о покупке.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:self-auto">
          <Link href="/instrumenty/moy-remont/" className="btn-primary text-sm">
            Мастер по комнате
          </Link>
          <Link href="/instrumenty/kalendar-remonta/" className="btn-secondary text-sm">
            Календарь этапов
          </Link>
        </div>
      </div>

      <Suspense fallback={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      }>
        <ProjectsPageClient />
      </Suspense>

      {/* Пояснительный блок: отвечает на вопросы «что это, где хранятся данные,
          как выгрузить» и даёт странице содержательный текст помимо интерфейса. */}
      <section className="mt-10 max-w-3xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Что такое проект в Мастерке
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Проект — это сводная ведомость по одному объекту. Вы считаете материалы в калькуляторах,
          нажимаете «В смету», и позиции складываются в один список: наименование, количество,
          единица и стоимость. Дальше по каждой позиции видно, куплено или ещё нет, а итог
          пересчитывается автоматически.
        </p>

        <h3 className="mt-6 text-base font-bold text-slate-900 dark:text-slate-100">
          Где хранятся данные
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Только в вашем браузере, локально. Расчёты не отправляются на сервер и не требуют
          регистрации, поэтому доступны и без интернета после загрузки страницы.
        </p>

        <h3 className="mt-6 text-base font-bold text-slate-900 dark:text-slate-100">
          Что можно сделать с проектом
        </h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <li>Собрать материалы со всех калькуляторов объекта в одну ведомость.</li>
          <li>Проставить свои цены и получить ориентир бюджета по позициям.</li>
          <li>Отмечать купленное, чтобы не купить одно и то же дважды.</li>
          <li>Выгрузить список в CSV или распечатать — удобно взять с собой в магазин.</li>
        </ul>

        <h3 className="mt-6 text-base font-bold text-slate-900 dark:text-slate-100">
          С чего начать
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Если нужно посчитать всю комнату сразу, откройте{" "}
          <Link href="/instrumenty/moy-remont/" className="text-accent-700 no-underline hover:underline dark:text-accent-400">
            мастера «Мой ремонт»
          </Link>
          : он примет размеры один раз и разложит их по нужным калькуляторам. План работ по этапам
          с таймерами схватывания есть в{" "}
          <Link href="/instrumenty/kalendar-remonta/" className="text-accent-700 no-underline hover:underline dark:text-accent-400">
            календаре ремонта
          </Link>
          . Отдельные расчёты — в{" "}
          <Link href="/kalkulyatory/" className="text-accent-700 no-underline hover:underline dark:text-accent-400">
            каталоге калькуляторов
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

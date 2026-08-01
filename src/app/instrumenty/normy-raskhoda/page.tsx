import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CONSUMPTION_NORMS, type NormCategory } from "@/lib/tools/norms-data";
import { calcHref } from "@/lib/tools/config";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  title: "Таблица норм расхода строительных материалов на 1 м²",
  description:
    "Справочная таблица расхода строительных материалов на 1 м²: штукатурка, шпаклёвка, грунтовка, краска, плиточный клей, стяжка и другие работы.",
};

export const metadata: Metadata = buildToolPageMetadata("normy-raskhoda", {
  title: META.title,
  description: META.description,
});

function NormTable({ category }: { category: NormCategory }) {
  return (
    <section id={category.id} className="card scroll-mt-24 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>{category.icon}</span>
          {category.title}
        </h2>
        {category.calculator && (
          <Link
            href={calcHref(category.calculator)}
            className="text-xs text-accent-700 hover:underline no-underline"
          >
            Калькулятор →
          </Link>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Материал</th>
              <th className="text-right px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Расход</th>
              <th className="text-left px-4 py-2 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Условия</th>
              <th className="text-left px-4 py-2 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Основание данных</th>
            </tr>
          </thead>
          <tbody>
            {category.rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                  {row.material}
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-[11px] text-accent-700 hover:underline md:hidden"
                  >
                    Официальный источник ↗
                  </a>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {row.consumption} <span className="text-slate-400 font-normal">{row.unit}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">{row.conditions}</td>
                <td className="px-4 py-2.5 text-xs hidden md:table-cell">
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-700 hover:underline"
                    title={`Проверено ${row.verifiedAt}`}
                  >
                    {row.source} ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Нормы расхода" },
  ],
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: META.title,
    description: META.description,
    url: `${SITE_URL}/instrumenty/normy-raskhoda/`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="bg-gradient-to-b from-cyan-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs
            items={[
              { href: "/instrumenty/", label: "Инструменты" },
              { label: "Нормы расхода" },
            ]}
          />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Таблица норм расхода строительных материалов на 1 м²
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Расход на 1 м² из актуальных технических карт производителей. У каждой строки указаны конкретный материал, условия применения и ссылка на первоисточник.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-2">
            Все строки построчно проверены 1 августа 2026 г. по официальным страницам и техническим картам производителей.
          </p>
        </div>
      </div>

      <div className="page-container py-8 space-y-6">
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Как рассчитать расход материала
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              Базовая потребность считается по формуле: площадь × расход на 1 м². Если норма дана для
              определённой толщины или одного слоя, сначала приведите её к фактической толщине и числу
              слоёв. Запас и округление до мешков, вёдер или рулонов добавляются после базового расчёта.
            </p>
            <p>
              Пример: для 20 м² стены и гипсовой штукатурки с расходом 8,5 кг/м² при слое 10 мм базовая
              потребность равна 20 × 8,5 = 170 кг. Количество мешков и практический запас уточняйте в
              профильном калькуляторе — там учитываются толщина слоя, неровность основания и фасовка.
            </p>
          </div>
        </section>

        <nav aria-label="Разделы таблицы норм расхода" className="card p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Перейти к материалу</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CONSUMPTION_NORMS.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-800 hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300"
              >
                {category.title}
              </a>
            ))}
          </div>
        </nav>

        {CONSUMPTION_NORMS.map((cat) => (
          <NormTable key={cat.id} category={cat} />
        ))}
        <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">
          * Значения относятся только к указанным материалам и условиям. Фактический расход зависит от
          основания, способа нанесения, толщины слоя и квалификации мастера. Перед закупкой повторно
          проверьте техкарту выбранной партии: производитель может изменить рецептуру или инструкцию.
          Для перевода нормы в упаковки используйте калькуляторы по ссылкам выше.
        </p>
      </div>

      <ToolPageExtras slug="normy-raskhoda" />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ToolPageExtras from "@/components/tools/ToolPageExtras";
import ConsumptionNormsExplorer from "@/components/tools/ConsumptionNormsExplorer";

const META = {
  title: "Таблица норм расхода строительных материалов на 1 м²",
  description:
    "Справочная таблица расхода строительных материалов на 1 м²: штукатурка, шпаклёвка, грунтовка, краска, плиточный клей, стяжка и другие работы.",
};

export const metadata: Metadata = buildToolPageMetadata("normy-raskhoda", {
  title: META.title,
  description: META.description,
});

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

      <div className="border-b border-slate-200 bg-gradient-to-b from-cyan-50 to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="page-container py-4 sm:py-6">
          <Link
            href="/instrumenty/"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 hover:text-cyan-700 sm:hidden"
          >
            ← Все инструменты
          </Link>
          <div className="hidden sm:block">
            <Breadcrumbs
              items={[
                { href: "/instrumenty/", label: "Инструменты" },
                { label: "Нормы расхода" },
              ]}
            />
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300 sm:hidden">
            Проверенный справочник
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:mt-4 md:text-3xl">
            <span className="sm:hidden">Нормы расхода материалов на 1 м²</span>
            <span className="hidden sm:inline">Таблица норм расхода строительных материалов на 1 м²</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            <span className="sm:hidden">Расход по техническим картам производителей — с условиями и первоисточником.</span>
            <span className="hidden sm:inline">Расход на 1 м² из актуальных технических карт производителей. У каждой строки указаны конкретный материал, условия применения и ссылка на первоисточник.</span>
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">
            <span className="inline-flex rounded-full border border-cyan-200 bg-white/70 px-2.5 py-1 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300 sm:hidden">
              Проверено 01.08.2026
            </span>
            <span className="hidden sm:inline">Все строки построчно проверены 1 августа 2026 г. по официальным страницам и техническим картам производителей.</span>
          </p>
        </div>
      </div>

      <div className="page-container space-y-4 py-4 sm:space-y-6 sm:py-8">
        <ConsumptionNormsExplorer />

        <details className="card group overflow-hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden sm:px-5">
            <span>
              <span className="block font-bold text-slate-900 dark:text-slate-100">Как рассчитать расход материала</span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Формула, пример и переход от нормы к упаковкам</span>
            </span>
            <span aria-hidden className="text-lg text-slate-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:px-5">
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
        </details>

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

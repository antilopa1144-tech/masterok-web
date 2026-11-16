import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { pluralizePackageUnit } from "@/lib/format/pluralize";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  calculateUnterputtsPurchase,
  formatUnterputtsNumber,
  UNTERPUTTS_BAG_KG,
  UNTERPUTTS_LAYER_MM,
  UNTERPUTTS_PATH,
  UNTERPUTTS_RATE_KG_M2,
  UNTERPUTTS_REFERENCE_THICKNESS_MM,
  UNTERPUTTS_TECH_SHEET,
} from "@/lib/tools/knauf-unterputts";
import UnterputtsCalculator from "./UnterputtsCalculator";

const title = "Расход КНАУФ-Унтерпутц на 1 м² — калькулятор мешков";
const description =
  "Рассчитайте расход цементной штукатурки КНАУФ-Унтерпутц по площади и средней толщине слоя от 10 до 35 мм. Сухая смесь в кг и целые мешки по 25 кг.";
const url = `${SITE_URL}${UNTERPUTTS_PATH}`;
const normsPath = "/instrumenty/normy-raskhoda/";
const { min, max } = UNTERPUTTS_LAYER_MM;
const exampleAreas = [5, 10, 20, 50];
const exampleThicknesses = [UNTERPUTTS_REFERENCE_THICKNESS_MM, 20];
const linkClass = "font-semibold text-cyan-800 underline underline-offset-2 dark:text-cyan-300";

export const metadata: Metadata = buildPageMetadata({ title, description, url });

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: title,
      description,
      url,
      citation: UNTERPUTTS_TECH_SHEET,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Нормы расхода", item: `${SITE_URL}${normsPath}` },
        { "@type": "ListItem", position: 3, name: "КНАУФ-Унтерпутц", item: url },
      ],
    },
  ],
};

export default function UnterputtsPage() {
  return (
    <div className="page-container py-5 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ href: normsPath, label: "Нормы расхода" }, { label: "КНАУФ-Унтерпутц" }]} />
      <article className="max-w-3xl space-y-6 text-slate-900 dark:text-slate-100 sm:space-y-8">
        <header>
          <h1 className="text-2xl font-bold sm:text-4xl">Расход штукатурки КНАУФ-Унтерпутц на 1 м²</h1>
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">
            Для КНАУФ-Унтерпутц производитель указывает <strong>около {UNTERPUTTS_RATE_KG_M2} кг сухой смеси
            на 1 м² при слое {UNTERPUTTS_REFERENCE_THICKNESS_MM} мм</strong>. Это цементная штукатурка для фасадов
            и внутренних работ, в том числе во влажных помещениях.
          </p>
        </header>

        <UnterputtsCalculator />

        <section className="space-y-3">
          <h2 id="unterputts-examples" className="text-xl font-bold">Расход при слое 10 и 20 мм</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table aria-labelledby="unterputts-examples" className="w-full text-left text-sm tabular-nums">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th scope="col" className="px-1.5 py-2.5 sm:px-4">Площадь, м²</th>
                  {exampleThicknesses.map((thickness) => (
                    <th key={thickness} scope="col" className="px-1.5 py-2.5 sm:px-4">{thickness} мм</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exampleAreas.map((area) => (
                  <tr key={area} className="border-t border-slate-200 dark:border-slate-700">
                    <th scope="row" className="px-1.5 py-2.5 font-medium sm:px-4">{area}</th>
                    {exampleThicknesses.map((thickness) => {
                      const result = calculateUnterputtsPurchase(area, thickness);
                      return (
                        <td key={thickness} className="px-1.5 py-2.5 sm:px-4">
                          <span className="block">≈ {formatUnterputtsNumber(result.baseNeedKg)} кг</span>
                          <span className="block font-semibold">
                            {result.packages} {pluralizePackageUnit(result.packages, "мешков")}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">Фасовка {UNTERPUTTS_BAG_KG} кг. Расход указан без потерь.</p>
        </section>

        <section className="space-y-4 leading-relaxed text-slate-700 dark:text-slate-300">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Как считать расход Унтерпутца</h2>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Как перейти от расхода к мешкам?</h3>
            <p className="mt-1">
              Умножьте чистую площадь на {UNTERPUTTS_RATE_KG_M2} и на отношение средней толщины к {UNTERPUTTS_REFERENCE_THICKNESS_MM} мм.
              На 20 м² при 10 мм получается около 340 кг. После округления вверх это 14 мешков по 25 кг, всего 350 кг.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Как найти среднюю толщину?</h3>
            <p className="mt-1">
              Промерьте расстояние от основания до плоскости будущей штукатурки в нескольких точках. Если на двух равных
              участках нужен слой 10 и 20 мм, средняя толщина составит 15 мм. Если площади разные, учтите вклад
              каждого участка пропорционально его площади.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Что делать, если местами нужно больше {max} мм?</h3>
            <p className="mt-1">
              Предел {min}–{max} мм относится к одному нанесению. Для большей толщины КНАУФ рекомендует два слоя.
              Схема нанесения и подготовка основания описаны в <a href={UNTERPUTTS_TECH_SHEET} className={linkClass}>информационном листе КНАУФ-Унтерпутц (PDF)</a>.
            </p>
          </div>
          <p>
            Расчёт оценивает только сухую смесь для одного слоя. Для другой штукатурки и сопутствующих материалов
            откройте <Link href="/kalkulyatory/steny/shtukaturka/" className={linkClass}>общий калькулятор штукатурки</Link>.
          </p>
        </section>
      </article>
    </div>
  );
}

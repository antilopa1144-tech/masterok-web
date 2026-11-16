import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  calculateVetonitLrPlus,
  formatVetonitNumber,
  VETONIT_LR_PLUS_BAGS,
  VETONIT_LR_PLUS_LAYER,
  VETONIT_LR_PLUS_PATH,
  VETONIT_LR_PLUS_RATE,
  VETONIT_LR_PLUS_TECH_SHEET,
} from "@/lib/tools/vetonit-lr-plus";
import VetonitCalculator from "./VetonitCalculator";

const title = "Расход Vetonit LR+ на 1 м² — калькулятор мешков";
const description =
  "Посчитайте расход сухой шпаклёвки Ветонит ЛР+ по площади и толщине слоя. Калькулятор покажет массу смеси, число мешков по 5 или 20 кг и остаток.";
const url = `${SITE_URL}${VETONIT_LR_PLUS_PATH}`;
const normsPath = "/instrumenty/normy-raskhoda/";
const rate = formatVetonitNumber(VETONIT_LR_PLUS_RATE);
const { min, max } = VETONIT_LR_PLUS_LAYER;
const exampleAreas = [5, 10, 20, 50];
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
      citation: VETONIT_LR_PLUS_TECH_SHEET,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Нормы расхода", item: `${SITE_URL}${normsPath}` },
        { "@type": "ListItem", position: 3, name: "Vetonit LR+", item: url },
      ],
    },
  ],
};

export default function VetonitLrPlusPage() {
  return (
    <div className="page-container py-5 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ href: normsPath, label: "Нормы расхода" }, { label: "Vetonit LR+" }]} />
      <article className="max-w-3xl space-y-6 text-slate-900 dark:text-slate-100 sm:space-y-8">
        <header>
          <h1 className="text-2xl font-bold sm:text-4xl">Расход шпаклёвки Vetonit LR+ на 1 м²</h1>
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">
            По техкарте Vetonit LR+ (Ветонит ЛР Плюс) расходует <strong>{rate} кг сухой смеси на 1 м² при слое 1 мм</strong>.
            Шпаклёвка предназначена для финишного выравнивания стен и потолков в сухих помещениях.
            Рекомендуемая толщина за одно нанесение — {min}–{max} мм.
          </p>
        </header>

        <VetonitCalculator />

        <section className="space-y-3">
          <h2 id="vetonit-examples" className="text-xl font-bold">Расход при слое 1 мм</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table aria-labelledby="vetonit-examples" className="w-full text-left text-sm tabular-nums">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th scope="col" className="px-1.5 py-2.5 sm:px-4">Площадь, м²</th>
                  <th scope="col" className="px-1.5 py-2.5 sm:px-4">Смесь, кг</th>
                  {VETONIT_LR_PLUS_BAGS.map((weight) => (
                    <th key={weight} scope="col" className="px-1.5 py-2.5 sm:px-4">Мешки<br />по {weight} кг</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exampleAreas.map((area) => {
                  const results = VETONIT_LR_PLUS_BAGS.map((weight) => calculateVetonitLrPlus(area, min, weight));
                  return (
                    <tr key={area} className="border-t border-slate-200 dark:border-slate-700">
                      <th scope="row" className="px-1.5 py-2.5 font-medium sm:px-4">{area}</th>
                      <td className="px-1.5 py-2.5 sm:px-4">{formatVetonitNumber(results[0].baseNeedKg)}</td>
                      {results.map(({ packages }, index) => (
                        <td key={VETONIT_LR_PLUS_BAGS[index]} className="px-1.5 py-2.5 sm:px-4">{packages}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 leading-relaxed text-slate-700 dark:text-slate-300">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Как считается расход</h2>
          <p>
            Умножьте площадь в м² на толщину слоя в мм и на {rate}. Например, на 20 м² при слое 1 мм нужно
            24 кг сухой смеси. Это 2 мешка по 20 кг с остатком 16 кг или 5 мешков по 5 кг с остатком 1 кг.
            Калькулятор округляет закупку вверх до целого мешка выбранной фасовки.
          </p>
          <p>
            Дополнительный запас в расчёт не входит. Для другого состава, нескольких слоёв или своего процента
            запаса используйте <Link href="/kalkulyatory/otdelka/shpaklevka/" className={linkClass}>общий калькулятор шпаклёвки</Link>.
          </p>
          <p>
            Источник нормы расхода, толщины слоя и фасовок — <a href={VETONIT_LR_PLUS_TECH_SHEET} className={linkClass}>техкарта Vetonit LR+ (PDF)</a>.
          </p>
        </section>
      </article>
    </div>
  );
}

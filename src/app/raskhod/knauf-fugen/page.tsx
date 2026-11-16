import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  calculateFugenPurchase,
  formatFugenRange,
  FUGEN_PATH,
  FUGEN_PRODUCT_CARD,
  FUGEN_TECH_SHEET,
  FUGEN_THICKNESS_MM,
  FUGEN_WORK,
} from "@/lib/tools/knauf-fugen";
import FugenCalculator from "./FugenCalculator";

const title = "Расход КНАУФ-Фуген на 1 м² — слой и стыки";
const description =
  "Калькулятор расхода КНАУФ-Фуген для сплошного слоя и стыков ГКЛ и ГВЛ. Сухая смесь в килограммах и количество мешков по 5, 10 или 25 кг.";
const url = `${SITE_URL}${FUGEN_PATH}`;
const normsPath = "/instrumenty/normy-raskhoda/";
const surfaceRate = formatFugenRange(...FUGEN_WORK.surface.rate);
const gklRate = formatFugenRange(...FUGEN_WORK.gkl.rate);
const gvlRate = formatFugenRange(...FUGEN_WORK.gvl.rate);
const gklWideRate = formatFugenRange(...FUGEN_WORK.gklWide.rate);
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
      citation: [FUGEN_TECH_SHEET, FUGEN_PRODUCT_CARD],
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Нормы расхода", item: `${SITE_URL}${normsPath}` },
        { "@type": "ListItem", position: 3, name: "КНАУФ-Фуген", item: url },
      ],
    },
  ],
};

export default function KnaufFugenPage() {
  return (
    <div className="page-container py-5 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ href: normsPath, label: "Нормы расхода" }, { label: "КНАУФ-Фуген" }]} />
      <article className="max-w-3xl space-y-6 text-slate-900 dark:text-slate-100 sm:space-y-8">
        <header>
          <h1 className="text-2xl font-bold sm:text-4xl">Расход шпаклёвки КНАУФ-Фуген на 1 м²</h1>
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">
            При сплошном шпаклевании КНАУФ указывает <strong>{surfaceRate} кг сухой смеси на 1 м² при слое 1 мм</strong>.
            На заделку стыков ГКЛ (Q1) уходит <strong>{gklRate} кг на 1 м² обшивки</strong>.
            Выберите вид работы и фасовку мешка.
          </p>
        </header>

        <FugenCalculator />

        <section className="space-y-3">
          <h2 id="fugen-examples" className="text-xl font-bold">Сплошной слой 1 мм, мешки по 10 кг</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table aria-labelledby="fugen-examples" className="w-full text-left text-sm tabular-nums">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th scope="col" className="px-1.5 py-2.5 sm:px-4">Площадь, м²</th>
                  <th scope="col" className="px-1.5 py-2.5 sm:px-4">Смесь, кг</th>
                  <th scope="col" className="px-1.5 py-2.5 sm:px-4">Мешки, шт.</th>
                </tr>
              </thead>
              <tbody>
                {exampleAreas.map((areaM2) => {
                  const { lower, upper } = calculateFugenPurchase({
                    work: "surface", areaM2, thicknessMm: 1, bagWeightKg: 10,
                  });
                  return (
                    <tr key={areaM2} className="border-t border-slate-200 dark:border-slate-700">
                      <th scope="row" className="px-1.5 py-2.5 font-medium sm:px-4">{areaM2}</th>
                      <td className="px-1.5 py-2.5 sm:px-4">{formatFugenRange(lower.baseNeedKg, upper.baseNeedKg)}</td>
                      <td className="px-1.5 py-2.5 sm:px-4">{formatFugenRange(lower.packages, upper.packages)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4 leading-relaxed text-slate-700 dark:text-slate-300">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Как считать расход Фугена</h2>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Почему расход сплошного слоя указан диапазоном?</h3>
            <p className="mt-1">
              В информационном листе КНАУФ для сплошного слоя 1 мм указано {formatFugenRange(FUGEN_WORK.surface.rate[0])} кг/м²
              без учёта потерь. В карточке КНАУФ приведён диапазон {surfaceRate} кг/м². Калькулятор показывает обе границы.
              Умножьте площадь на толщину слоя и на норму. Для 25 м² при 1 мм это 20–25 кг, или 2–3 мешка по 10 кг.
              Допустимая толщина одного нанесения — {FUGEN_THICKNESS_MM.min}–{FUGEN_THICKNESS_MM.max} мм.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Как выбрать режим заделки стыков?</h3>
            <p className="mt-1">
              Для обычной заделки стыков (Q1) норма на 1 м² обшивки составляет {gklRate} кг для ГКЛ
              и {gvlRate} кг для ГВЛ. Для заделки с широким шпаклеванием стыков ГКЛ (Q2) — {gklWideRate} кг/м².
              Укажите площадь одного слоя обшивки, на котором обрабатываете стыки.
              Если заделываете их с обеих сторон перегородки, сложите площади сторон.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Что означает диапазон мешков?</h3>
            <p className="mt-1">
              Калькулятор округляет каждый предел вверх до целого мешка. Если закупаете по верхней границе нормы,
              ориентируйтесь на большее число. Для своего процента запаса и нескольких позиций откройте{" "}
              <Link href="/kalkulyatory/otdelka/shpaklevka/" className={linkClass}>общий калькулятор шпаклёвки</Link>.
            </p>
          </div>
          <p>
            <a href={FUGEN_TECH_SHEET} className={linkClass}>Информационный лист КНАУФ-Фуген (PDF)</a>
            {" · "}
            <a href={FUGEN_PRODUCT_CARD} className={linkClass}>Карточка производителя</a>
          </p>
        </section>
      </article>
    </div>
  );
}

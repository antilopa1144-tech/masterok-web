import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const META = {
  title: `Нормы расхода строительных материалов — таблица на 1 м² | ${SITE_NAME}`,
  description: "Справочник норм расхода строительных материалов на 1 м²: штукатурка, шпаклёвка, грунтовка, краска, плиточный клей, затирка, стяжка. По ГОСТ и СНиП.",
};

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/instrumenty/normy-raskhoda/`,
});

interface NormRow {
  material: string;
  consumption: string;
  unit: string;
  conditions: string;
  source: string;
}

interface NormCategory {
  title: string;
  icon: string;
  calculatorSlug?: string;
  rows: NormRow[];
}

const NORMS: NormCategory[] = [
  {
    title: "Грунтовка",
    icon: "💧",
    calculatorSlug: "primer",
    rows: [
      { material: "Грунтовка глубокого проникновения (Ceresit CT 17)", consumption: "0.10–0.20", unit: "л/м²", conditions: "1 слой, впитывающее основание", source: "Паспорт Ceresit" },
      { material: "Бетоноконтакт (Ceresit CT 19)", consumption: "0.25–0.35", unit: "кг/м²", conditions: "1 слой, гладкий бетон", source: "Паспорт Ceresit" },
      { material: "Грунтовка универсальная", consumption: "0.08–0.15", unit: "л/м²", conditions: "1 слой, подготовленное основание", source: "ГОСТ Р 55818-2013" },
    ],
  },
  {
    title: "Штукатурка",
    icon: "🧱",
    rows: [
      { material: "Ротбанд (Knauf) гипсовая", consumption: "8.5", unit: "кг/м² на 10мм", conditions: "Толщина слоя 10 мм", source: "Паспорт Knauf" },
      { material: "Штукатурка цементная", consumption: "14–18", unit: "кг/м² на 10мм", conditions: "Толщина слоя 10 мм", source: "СП 71.13330.2017" },
      { material: "Декоративная штукатурка (короед)", consumption: "2.5–4.0", unit: "кг/м²", conditions: "Зерно 2-3 мм", source: "Паспорт производителя" },
    ],
  },
  {
    title: "Шпаклёвка",
    icon: "🪣",
    calculatorSlug: "putty",
    rows: [
      { material: "Шпаклёвка стартовая", consumption: "1.0–2.0", unit: "кг/м²", conditions: "Слой 1 мм, гипсовое основание", source: "Паспорт Knauf Fugen" },
      { material: "Шпаклёвка финишная", consumption: "0.5–1.0", unit: "кг/м²", conditions: "Слой 0.5 мм, подготовленная поверхность", source: "Паспорт Vetonit LR+" },
      { material: "Шпаклёвка фасадная цементная", consumption: "1.5–2.5", unit: "кг/м²", conditions: "Слой 1-2 мм", source: "ГОСТ 31357-2007" },
    ],
  },
  {
    title: "Краска",
    icon: "🎨",
    rows: [
      { material: "Краска акриловая интерьерная", consumption: "0.12–0.18", unit: "л/м²", conditions: "1 слой, шпаклёванная стена", source: "ГОСТ 28196-89" },
      { material: "Краска латексная", consumption: "0.10–0.14", unit: "л/м²", conditions: "1 слой, гладкое основание", source: "Паспорт производителя" },
      { material: "Краска фасадная", consumption: "0.15–0.25", unit: "л/м²", conditions: "1 слой, штукатурка", source: "ГОСТ 28196-89" },
    ],
  },
  {
    title: "Плиточный клей",
    icon: "⬜",
    calculatorSlug: "tile-adhesive",
    rows: [
      { material: "Ceresit CM 11 (стандартный)", consumption: "3.0–4.0", unit: "кг/м²", conditions: "Зубчатый шпатель 8 мм, плитка до 30×30", source: "Паспорт Ceresit" },
      { material: "Ceresit CM 14 (эластичный)", consumption: "3.5–5.0", unit: "кг/м²", conditions: "Зубчатый шпатель 10 мм, плитка 30×60", source: "Паспорт Ceresit" },
      { material: "Клей для керамогранита", consumption: "4.0–6.0", unit: "кг/м²", conditions: "Зубчатый шпатель 10-12 мм, 60×60", source: "ГОСТ 56387-2018" },
    ],
  },
  {
    title: "Затирка",
    icon: "🔲",
    calculatorSlug: "tile-grout",
    rows: [
      { material: "Затирка цементная (шов 2мм)", consumption: "0.3–0.5", unit: "кг/м²", conditions: "Плитка 30×30, шов 2 мм", source: "Паспорт Ceresit CE 33" },
      { material: "Затирка цементная (шов 5мм)", consumption: "0.8–1.2", unit: "кг/м²", conditions: "Плитка 30×30, шов 5 мм", source: "Расчётная формула" },
      { material: "Затирка эпоксидная", consumption: "0.3–0.6", unit: "кг/м²", conditions: "Шов 2-3 мм", source: "Паспорт Litokol" },
    ],
  },
  {
    title: "Стяжка и наливной пол",
    icon: "🏗️",
    rows: [
      { material: "Стяжка ЦПС (М150)", consumption: "20–22", unit: "кг/м² на 10мм", conditions: "Пескобетон, толщина 10 мм", source: "СП 29.13330.2011" },
      { material: "Наливной пол тонкослойный", consumption: "1.5–1.8", unit: "кг/м² на 1мм", conditions: "Толщина 1 мм", source: "Паспорт Vetonit 3000" },
      { material: "Наливной пол толстослойный", consumption: "1.6–2.0", unit: "кг/м² на 1мм", conditions: "Толщина 1 мм (до 100мм)", source: "Паспорт производителя" },
    ],
  },
  {
    title: "Гидроизоляция",
    icon: "🛡️",
    rows: [
      { material: "Обмазочная мастика (Ceresit CR 65)", consumption: "2.5–3.5", unit: "кг/м²", conditions: "2 слоя по 1.5 кг/м²", source: "Паспорт Ceresit" },
      { material: "Мастика битумная", consumption: "1.0–2.0", unit: "кг/м²", conditions: "1 слой, фундамент", source: "ГОСТ 30693-2000" },
      { material: "Рулонная гидроизоляция", consumption: "1.15", unit: "м²/м²", conditions: "Нахлёст 15%", source: "СП 71.13330.2017" },
    ],
  },
];

function NormTable({ category }: { category: NormCategory }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>{category.icon}</span>
          {category.title}
        </h2>
        {category.calculatorSlug && (
          <Link
            href={`/kalkulyatory/otdelka/${category.calculatorSlug}/`}
            className="text-xs text-accent-600 hover:underline no-underline"
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
              <th className="text-left px-4 py-2 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Источник</th>
            </tr>
          </thead>
          <tbody>
            {category.rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{row.material}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {row.consumption} <span className="text-slate-400 font-normal">{row.unit}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">{row.conditions}</td>
                <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500 text-xs hidden md:table-cell">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: META.title,
    description: META.description,
    url: `${SITE_URL}/instrumenty/normy-raskhoda/`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bg-gradient-to-b from-cyan-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/", label: "Главная" },
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Нормы расхода" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Нормы расхода строительных материалов
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Справочник расхода на 1 м² по ГОСТ, СНиП и паспортам производителей. Используется в наших калькуляторах.
          </p>
        </div>
      </div>

      <div className="page-container py-8 space-y-6">
        {NORMS.map((cat) => (
          <NormTable key={cat.title} category={cat} />
        ))}

        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          * Нормы расхода приведены для типовых условий. Фактический расход зависит от основания, способа нанесения, толщины слоя и квалификации мастера. Для точного расчёта используйте калькуляторы.
        </p>
      </div>
    </>
  );
}

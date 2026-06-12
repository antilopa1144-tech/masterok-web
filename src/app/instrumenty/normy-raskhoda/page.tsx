import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CONSUMPTION_NORMS, type NormCategory } from "@/lib/tools/norms-data";
import { calcHref } from "@/lib/tools/config";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  title: `Нормы расхода строительных материалов — таблица на 1 м²`,
  description:
    "Справочник норм расхода строительных материалов на 1 м²: штукатурка, шпаклёвка, грунтовка, краска, плиточный клей, затирка, стяжка. По ГОСТ, СП и паспортам.",
};

export const metadata: Metadata = buildToolPageMetadata("normy-raskhoda", {
  description: META.description,
});

function NormTable({ category }: { category: NormCategory }) {
  return (
    <div className="card overflow-hidden">
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
                <td className="px-4 py-2.5 text-slate-400 dark:text-slate-400 text-xs hidden md:table-cell">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
            Нормы расхода строительных материалов
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Справочник расхода на 1 м² по ГОСТ, СП и паспортам производителей. Используется в калькуляторах {SITE_NAME}.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-2">
            Последнее обновление: март 2026 г. Источники: паспорта Ceresit, Knauf, Vetonit, Litokol; ГОСТ, СНиП, СП.
          </p>
        </div>
      </div>

      <div className="page-container py-8 space-y-6">
        {CONSUMPTION_NORMS.map((cat) => (
          <NormTable key={cat.title} category={cat} />
        ))}
        <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">
          * Нормы расхода приведены для типовых условий. Фактический расход зависит от основания, способа нанесения,
          толщины слоя и квалификации мастера. Для точного расчёта используйте калькуляторы по ссылкам выше.
        </p>
      </div>

      <ToolPageExtras slug="normy-raskhoda" />
    </>
  );
}

import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import TileLayoutGenerator from "./TileLayoutGenerator";

const META = {
  title: `Генератор раскладки плитки онлайн — визуализация и расчёт подрезки | ${SITE_NAME}`,
  description: "Визуализатор раскладки плитки на стену или пол: введите размеры, увидите раскладку, подрезку и количество плитки. Прямая и диагональная укладка.",
};

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/instrumenty/raskladka-plitki/`,
});

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Раскладка плитки" },
  ],
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Генератор раскладки плитки",
    description: META.description,
    url: `${SITE_URL}/instrumenty/raskladka-plitki/`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="bg-gradient-to-b from-orange-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/", label: "Главная" },
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Раскладка плитки" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Генератор раскладки плитки
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Введите размеры поверхности и плитки — увидите раскладку, количество целых плиток, подрезку и отход.
          </p>
        </div>
      </div>

      <div className="page-container py-8">
        <TileLayoutGenerator />
      </div>
    </>
  );
}

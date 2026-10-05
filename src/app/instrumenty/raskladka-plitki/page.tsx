import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import LayoutConstructorEntry from "@/components/constructor/LayoutConstructorEntry";
import { isClassicLayoutEntry, type LayoutSearchParams } from "@/lib/constructor/layout-entry";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  description: "Раскладка плитки в 3D: пол и стены комнаты, размеры, швы, подрезки и упаковки к покупке. Для диагонали и отдельной поверхности доступна расширенная схема.",
};

export const metadata: Metadata = buildToolPageMetadata("raskladka-plitki", {
  description: META.description,
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

export default async function Page({ searchParams }: { searchParams: Promise<LayoutSearchParams> }) {
  const classic = isClassicLayoutEntry("tile", await searchParams);
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

      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="page-container-wide py-4 sm:py-5">
          <div className="sr-only">
            <Breadcrumbs items={[
              { href: "/instrumenty/", label: "Инструменты" },
              { label: "Раскладка плитки" },
            ]} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Генератор раскладки плитки
          </h1>
          <p className="mt-1.5 max-w-4xl text-sm text-slate-500 sm:text-base dark:text-slate-400">
            Примерьте плитку в 3D-комнате, сравните подрезки и узнайте, сколько упаковок покупать.
          </p>
        </div>
      </div>

      <div className="page-container-wide py-5 lg:py-6">
        <LayoutConstructorEntry material="tile" classic={classic} />
      </div>
      <ToolPageExtras slug="raskladka-plitki">
        <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Не уверены, где задать начало? Разбираем{" "}
          <Link href="/blog/otkuda-nachinat-raskladku-plitki/" className="text-accent-700 underline underline-offset-4 hover:no-underline dark:text-accent-400">
            раскладку плитки от центра и от края
          </Link>
          {" "}на примере с подрезками и количеством к покупке.
        </p>
        <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Планируете кухню? Посмотрите, как согласовать{" "}
          <Link href="/blog/raskladka-plitki-na-kuhonnom-fartuke/" className="text-accent-700 underline underline-offset-4 hover:no-underline dark:text-accent-400">
            раскладку плитки на фартуке со шкафами и розетками
          </Link>
          {" "}и заранее проверить открытые края и подрезки.
        </p>
      </ToolPageExtras>
    </>
  );
}

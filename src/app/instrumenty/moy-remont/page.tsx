import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import RoomMasterWizard from "./RoomMasterWizard";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  title: `Мастер «Мой ремонт» — ванная, кухня, комната одним вводом`,
  description:
    "Введите размеры помещения один раз: получите сводную закупку материалов и ссылки на детальные калькуляторы. Сохраните итог в проект «Мой ремонт».",
};

export const metadata: Metadata = buildToolPageMetadata("moy-remont", {
  description: META.description,
});

export default function MoyRemontPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Мастер «Мой ремонт»",
    description: META.description,
    url: `${SITE_URL}/instrumenty/moy-remont/`,
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

      <div className="border-b border-stone-200 bg-gradient-to-b from-orange-50/70 to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="page-container py-5 md:py-6">
          <Breadcrumbs
            items={[
              { label: "Инструменты", href: "/instrumenty/" },
              { label: "Мой ремонт" },
            ]}
          />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">Сводная закупка помещения</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white md:text-3xl">Мастер «Мой ремонт»</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">Размеры вводятся один раз. На выходе — приоритетные покупки, полная ведомость и сохранение в проект.</p>
        </div>
      </div>

      <div className="page-container py-5 md:py-8">
        <Suspense fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка мастера…</div>}>
          <RoomMasterWizard />
        </Suspense>
        <ToolPageExtras slug="moy-remont" />
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import RenovationCalendar from "./RenovationCalendar";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

const META = {
  title: `Календарь ремонта — этапы, чек-листы и таймеры`,
  description:
    "План ремонта по помещению: этапы работ, ориентиры по срокам, чек-листы и таймеры схватывания. Ванная, кухня, комната или квартира.",
};

export const metadata: Metadata = buildToolPageMetadata("kalendar-remonta", {
  description: META.description,
});

export default function KalendarRemontaPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Календарь ремонта",
    description: META.description,
    url: `${SITE_URL}/instrumenty/kalendar-remonta/`,
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

      <div className="bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs
            items={[
              { label: "Инструменты", href: "/instrumenty/" },
              { label: "Календарь ремонта" },
            ]}
          />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Календарь ремонта
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Этапы, чек-листы и таймеры в одном сценарии. Отметьте выполненное и задайте дату старта — увидите
            ориентиры по неделям. Закупку материалов соберите в{" "}
            <Link href="/instrumenty/moy-remont/" className="text-accent-600 font-medium underline">
              мастере «Мой ремонт»
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="page-container py-8">
        <Suspense
          fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка…</div>}
        >
          <RenovationCalendar />
        </Suspense>
        <ToolPageExtras slug="kalendar-remonta" />
      </div>
    </>
  );
}

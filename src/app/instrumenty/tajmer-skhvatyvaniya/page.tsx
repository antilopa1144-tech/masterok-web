import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Suspense } from "react";
import CuringTimer from "./CuringTimer";
import ToolPageExtras from "@/components/tools/ToolPageExtras";
import CuringTimerSeo from "@/components/tools/CuringTimerSeo";
import { CURING_FAQ } from "@/lib/curing-timer/seo-content";
import { buildToolPageMetadata } from "@/lib/tools/metadata";

const META = {
  title: `Таймер схватывания и высыхания строительных смесей`,
  description: "Таймер для штукатурки, стяжки, грунтовки, клея и краски. Задайте интервал по инструкции своего материала и получите напоминание о проверке поверхности.",
};

const PAGE_URL = `${SITE_URL}/instrumenty/tajmer-skhvatyvaniya/`;

export const metadata: Metadata = buildToolPageMetadata("tajmer-skhvatyvaniya", {
  description: META.description,
});

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
    { "@type": "ListItem", position: 3, name: "Таймер схватывания" },
  ],
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Таймер схватывания",
    description: META.description,
    url: PAGE_URL,
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

      <div className="bg-gradient-to-b from-amber-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-5 sm:py-6">
          <Breadcrumbs items={[
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Таймер схватывания" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Таймер схватывания и высыхания
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Выберите материал, задайте интервал по его инструкции и запустите напоминание о проверке. Сигнал не означает, что материал готов к следующему этапу.
          </p>
        </div>
      </div>

      <div className="page-container py-5 sm:py-8">
        <Suspense fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка…</div>}>
          <CuringTimer />
        </Suspense>
      </div>
      <CuringTimerSeo />
      <ToolPageExtras
        slug="tajmer-skhvatyvaniya"
        extraFaq={CURING_FAQ}
        extraIntro="Схватывание, высыхание и готовность к нагрузке — разные этапы. В справке выше объясняем, какой интервал искать в инструкции материала и что проверять перед продолжением работ."
      />
    </>
  );
}

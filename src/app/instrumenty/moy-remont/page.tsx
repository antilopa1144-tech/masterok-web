import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
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
  title: META.title,
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

      <div className="bg-gradient-to-b from-violet-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "Инструменты", href: "/instrumenty/" },
              { label: "Мой ремонт" },
            ]}
          />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            Мастер «Мой ремонт»
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Один ввод размеров — пакет расчётов и сводный список материалов. Для ванной используется готовый
            комплексный калькулятор; для кухни и комнаты — связка проверенных калькуляторов пола и отделки.
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm font-medium">
            <Link href="/proekty/" className="text-accent-700 hover:text-accent-800 dark:text-accent-400 no-underline">
              Сохранённые проекты →
            </Link>
            <Link href="/instrumenty/kalendar-remonta/" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 no-underline">
              Календарь этапов →
            </Link>
          </div>
        </div>
      </div>

      <div className="page-container py-8">
        <Suspense fallback={<div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка мастера…</div>}>
          <RoomMasterWizard />
        </Suspense>
        <ToolPageExtras slug="moy-remont" />
      </div>
    </>
  );
}

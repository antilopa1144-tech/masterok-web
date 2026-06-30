import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { getToolConfig, toolHref } from "@/lib/tools/config";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import ToolPageExtras from "@/components/tools/ToolPageExtras";

export const metadata: Metadata = buildToolPageMetadata("kalkulyator");

export default function KalkulyatorLayout({ children }: { children: React.ReactNode }) {
  const tool = getToolConfig("kalkulyator");
  const pageUrl = `${SITE_URL}${toolHref("kalkulyator")}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool?.title ?? "Калькулятор",
    description: tool?.description,
    url: pageUrl,
    applicationCategory: "Utility",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB", availability: "https://schema.org/InStock" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
      { "@type": "ListItem", position: 3, name: "Калькулятор", item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {children}
      <ToolPageExtras slug="kalkulyator" />
    </>
  );
}

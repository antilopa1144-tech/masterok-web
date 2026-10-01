import type { Metadata } from "next";
import ConstructorEditor from "@/components/constructor/ConstructorEditor";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";

const description = "Конструктор комнаты онлайн: размеры, двери и окна, ламинат и плитка на стенах, 3D, план и развёртки, подрезки, упаковки к покупке и сохранённые варианты отделки.";

export const metadata: Metadata = buildPageMetadata({
  title: "Конструктор комнаты: ламинат, плитка и раскладки",
  description,
  url: `${SITE_URL}/konstruktor/`,
});

export default function ConstructorPage() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebApplication", name: "Конструктор Мастерок",
    description, url: `${SITE_URL}/konstruktor/`, applicationCategory: "DesignApplication", operatingSystem: "Web",
    inLanguage: "ru", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><ConstructorEditor /><noscript><div className="page-container py-12"><h1>Конструктор Мастерок</h1><p>Для редактирования проекта включите JavaScript. Вы сможете задать размеры комнаты, двери и окна, проверить раскладку ламината и плитки на стенах, развёртки, подрезки и количество упаковок к покупке.</p></div></noscript></>;
}

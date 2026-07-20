import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import ToolPageExtras from "./ToolPageExtras";

interface Props {
  slug: string;
  breadcrumb: string;
  title: string;
  description: string;
  accentClass: string;
  children: React.ReactNode;
}

export default function VisualToolPageShell({ slug, breadcrumb, title, description, accentClass, children }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: title,
    description,
    url: `${SITE_URL}/instrumenty/${slug}/`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
      { "@type": "ListItem", position: 3, name: breadcrumb },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className={`border-b border-slate-200 bg-linear-to-b ${accentClass} to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950`}>
        <div className="page-container py-6">
          <Breadcrumbs items={[{ href: "/instrumenty/", label: "Инструменты" }, { label: breadcrumb }]} />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">{title}</h1>
          <p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="page-container py-8">{children}</div>
      <ToolPageExtras slug={slug} />
    </>
  );
}

import type { Checklist } from "@/lib/checklists";
import { SITE_URL } from "@/lib/site";

/** HowTo без totalTime — длительность в UI не в формате ISO 8601. */
export function buildChecklistHowToJsonLd(cl: Checklist) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: cl.title,
    description: cl.description,
    step: cl.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      itemListElement: step.items.map((text) => ({
        "@type": "HowToDirection",
        text,
      })),
    })),
  };
}

export function buildChecklistDetailBreadcrumbJsonLd(cl: Checklist) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Инструменты", item: `${SITE_URL}/instrumenty/` },
      { "@type": "ListItem", position: 3, name: "Чек-листы", item: `${SITE_URL}/instrumenty/chek-listy/` },
      {
        "@type": "ListItem",
        position: 4,
        name: cl.title,
        item: `${SITE_URL}/instrumenty/chek-listy/${cl.slug}/`,
      },
    ],
  };
}

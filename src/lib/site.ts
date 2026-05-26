export const SITE_NAME = "Мастерок";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";
export const SITE_WEBPAGE_DESCRIPTION = "Бесплатные строительные калькуляторы онлайн";
// Используется в template ({ title.default } и для категорий/списков калькуляторов).
export const SITE_TITLE_SUFFIX = "строительные калькуляторы онлайн";
// Главная: коммерческий шаблон по единой системе сайта.
// Ключ-чемпион «расчёт материалов» в начале title повторяет паттерн страниц
// калькуляторов («Калькулятор X: расчёт материалов онлайн»), даёт боту
// единый смысл сайта. «По ГОСТ» — сигнал доверия (нормативная база РФ).
// Число калькуляторов остаётся в description/og — там Google покажет его в сниппете.
export const SITE_DEFAULT_TITLE = `Строительные калькуляторы онлайн: расчёт материалов по ГОСТ — ${SITE_NAME}`;
// NB: Обновляйте число при добавлении калькуляторов (ALL_CALCULATORS.length в calculators/index.ts)
export const SITE_METADATA_DESCRIPTION =
  "Бесплатные строительные калькуляторы онлайн: бетон, кирпич, кровля, ламинат, плитка, гипсокартон и 66+ строительных расчётов. Точно, быстро, по ГОСТ.";
export const SITE_TWITTER_TITLE = `${SITE_NAME} — строительные калькуляторы`;
export const SITE_TWITTER_DESCRIPTION = "66+ бесплатных строительных калькуляторов онлайн";
export const SITE_OG_DESCRIPTION = "66+ бесплатных строительных калькуляторов. Точный расчёт материалов по ГОСТ.";
export const SITE_OG_IMAGE_PATH = "/og-image.png";
export const SITE_OG_IMAGE_URL = `${SITE_URL}${SITE_OG_IMAGE_PATH}`;
export const SITE_OG_IMAGE_WIDTH = 1200;
export const SITE_OG_IMAGE_HEIGHT = 630;

export const SITE_FOOTER_DESCRIPTION = `${SITE_WEBPAGE_DESCRIPTION}. Точный расчёт материалов по ГОСТ и СНиП.`;
export const SITE_FOUNDING_DATE = "2024-06-01";

// Дата последнего осмысленного пересмотра контента сайта.
// Обновляется ВРУЧНУЮ при реальных изменениях формул/контента, а НЕ на каждом билде —
// автоматическое обновление воспринимается поисковиками как имитация freshness
// (Google/Yandex могут штрафовать за fake lastmod в sitemap/schema).
// Следующий апдейт — при значимом пересмотре расчётов или выходе новых СП.
export const SITE_LAST_REVIEWED = "2026-05-25";

// Ссылки на внешние профили организации (sameAs для Schema.org).
export const MASTEROK_RUSTORE_URL = "https://www.rustore.ru/catalog/app/ru.masterok.app";
export const SITE_SAME_AS = [MASTEROK_RUSTORE_URL] as const;

// Ключевые нормативные документы — используются в citation schema калькуляторов и GEO.
export const SITE_CITATIONS = [
  {
    name: "ГОСТ",
    description: "Государственные стандарты Российской Федерации",
    url: "https://fgis.gost.ru/",
  },
  {
    name: "СНиП",
    description: "Строительные нормы и правила (историческая нормативная база)",
    url: "https://www.consultant.ru/document/cons_doc_LAW_9650/",
  },
  {
    name: "СП",
    description: "Своды правил по проектированию и строительству",
    url: "https://www.consultant.ru/law/search/?q=%D1%81%D0%B2%D0%BE%D0%B4+%D0%BF%D1%80%D0%B0%D0%B2%D0%B8%D0%BB",
  },
] as const;

/** Минимум статей на странице тега для индексации (ниже — noindex, thin content). */
export const BLOG_TAG_MIN_POSTS_FOR_INDEX = 3;

/** Дата последнего пересмотра в формате для UI («18 апреля 2026 г.»). */
export function formatSiteLastReviewedRu(): string {
  return new Date(`${SITE_LAST_REVIEWED}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Citation-объекты для JSON-LD (schema.org CreativeWork). */
export function siteCitationsToSchema(): Array<{
  "@type": "CreativeWork";
  name: string;
  description: string;
  url: string;
}> {
  return SITE_CITATIONS.map((c) => ({
    "@type": "CreativeWork",
    name: c.name,
    description: c.description,
    url: c.url,
  }));
}

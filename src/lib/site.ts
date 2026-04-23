export const SITE_NAME = "Мастерок";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";
export const SITE_WEBPAGE_DESCRIPTION = "Бесплатные строительные калькуляторы онлайн";
export const SITE_TITLE_SUFFIX = "строительные калькуляторы онлайн";
export const SITE_DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TITLE_SUFFIX}`;
// NB: Обновляйте число при добавлении калькуляторов (ALL_CALCULATORS.length в calculators/index.ts)
export const SITE_METADATA_DESCRIPTION =
  "Бесплатные строительные калькуляторы онлайн: бетон, кирпич, кровля, ламинат, плитка, гипсокартон и ещё 61+ расчёт. Точно, быстро, по ГОСТ.";
export const SITE_TWITTER_TITLE = `${SITE_NAME} — строительные калькуляторы`;
export const SITE_TWITTER_DESCRIPTION = "61+ бесплатный строительный калькулятор онлайн";
export const SITE_OG_DESCRIPTION = "61+ бесплатный строительный калькулятор. Точный расчёт материалов по ГОСТ.";
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
export const SITE_LAST_REVIEWED = "2026-04-24";

// Ссылки на внешние профили организации (sameAs для Schema.org).
export const MASTEROK_RUSTORE_URL = "https://www.rustore.ru/catalog/app/ru.masterok.app";
export const SITE_SAME_AS = [MASTEROK_RUSTORE_URL] as const;

// Ключевые нормативные документы — используются в citation schema калькуляторов.
export const SITE_CITATIONS = [
  { name: "ГОСТ", description: "Государственные стандарты Российской Федерации" },
  { name: "СНиП", description: "Строительные нормы и правила" },
  { name: "СП", description: "Своды правил по проектированию и строительству" },
] as const;

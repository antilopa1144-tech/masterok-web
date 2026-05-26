import { SITE_NAME } from "@/lib/site";

/**
 * Возвращает baseTitle без модификаций — суффикс « — Мастерок» добавится
 * автоматически через title.template в src/app/layout.tsx (Next.js metadata).
 *
 * Раньше эта функция приклеивала ` — ${SITE_NAME}`, и потом stripSiteSuffix
 * в buildPageMetadata срезал суффикс перед тем, как template Next.js его
 * добавит снова. Это работало, но было запутанно. Теперь baseTitle ходит
 * чистым по всему пайплайну, а template добавляет бренд один раз в конце.
 *
 * @param baseTitle — title по схеме «Калькулятор X: расчёт материалов онлайн»
 */
export function withSiteMetaTitle(baseTitle: string): string {
  return baseTitle;
}

/**
 * Полное название с суффиксом « — Мастерок» — для мест, где template
 * Next.js не работает (Schema.org JSON-LD, OG-карточки вне metadata API).
 */
export function fullSiteTitle(baseTitle: string): string {
  return `${baseTitle} — ${SITE_NAME}`;
}

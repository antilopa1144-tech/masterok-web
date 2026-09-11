import { SITE_NAME } from "@/lib/site";
import type { Category } from "./types";

/**
 * SEO-title страницы категории по схеме:
 *   «Калькуляторы [seoSubject]: расчёт материалов онлайн»
 * Если заголовок с брендовым суффиксом « — Мастерок» превышает лимит выдачи,
 * берётся компактная форма «Калькуляторы [seoSubject] онлайн».
 *
 * Вынесено из страницы категории: правило длины заголовка проверяется тестом
 * по всем категориям, а не только глазами в вёрстке.
 */
export const CATEGORY_TITLE_LONG_SUFFIX = ": расчёт материалов онлайн";
export const CATEGORY_TITLE_SHORT_SUFFIX = " онлайн";

export function buildCategoryTitle(cat: Category): string {
  const brandSuffixLength = ` — ${SITE_NAME}`.length;
  const long = `Калькуляторы ${cat.seoSubject}${CATEGORY_TITLE_LONG_SUFFIX}`;
  if (long.length + brandSuffixLength <= 60) return long;
  return `Калькуляторы ${cat.seoSubject}${CATEGORY_TITLE_SHORT_SUFFIX}`;
}

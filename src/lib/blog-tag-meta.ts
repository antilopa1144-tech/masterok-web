import { TITLE_MAX_LENGTH, withSiteSuffix } from "@/lib/metadata";

/**
 * Метаданные страниц тегов блога.
 *
 * Теги приходят из Ghost и могут появиться без пересборки сайта
 * (`dynamicParams = true`), поэтому заголовок и описание собираются здесь
 * и держатся в пределах выдачи для любого имени тега, а не только для
 * четырёх текущих. Раньше логика жила прямо в generateMetadata и проверить
 * её было нечем.
 */

export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 165;

/** Максимальная длина имени тега внутри описания в аварийном шаблоне. */
const FALLBACK_TAG_LIMIT = 30;

function inRange(value: string): boolean {
  return value.length >= DESCRIPTION_MIN && value.length <= DESCRIPTION_MAX;
}

/** Обрезает имя тега по границе слова, добавляя многоточие. */
export function trimTagName(tag: string, limit: number): string {
  if (tag.length <= limit) return tag;
  const cut = tag.slice(0, Math.max(1, limit - 1));
  const lastSpace = cut.lastIndexOf(" ");
  // Границу слова берём только если перед ней остаётся осмысленный кусок,
  // иначе режем по символам: «раск…» лучше, чем пустая строка.
  const head = (lastSpace >= 5 ? cut.slice(0, lastSpace) : cut).trim();
  return `${head}…`;
}

/** Склонение слова «материал» по числу статей. */
export function postsWord(count: number): string {
  if (count === 1) return "материал";
  if (count < 5) return "материала";
  return "материалов";
}

/**
 * Title страницы тега. Имя тега подрезается, если полный заголовок вместе
 * с брендом не влезает в лимит выдачи.
 */
export function buildTagTitle(tag: string): string {
  const suffixLength = ` — Мастерок`.length;
  const prefix = "Статьи на тему «»";
  const full = `Статьи на тему «${tag}»`;
  if (full.length + suffixLength <= TITLE_MAX_LENGTH) return full;
  // Оставляем запас на многоточие и брендовый суффикс.
  const limit = TITLE_MAX_LENGTH - prefix.length - suffixLength;
  return `Статьи на тему «${trimTagName(tag, limit)}»`;
}

/**
 * Description страницы тега.
 *
 * Варианты идут от самого информативного к самому короткому; берётся первый,
 * который укладывается в 120–165. Для имени тега длиннее 23 символов оба
 * основных варианта выходят за верхнюю границу, поэтому включается аварийный
 * шаблон с подрезанным именем — он даёт 129–159 символов.
 */
export function buildTagDescription(tag: string, titles: string[]): string {
  const count = titles.length;
  const word = postsWord(count);

  if (titles.length > 0) {
    const titlesVariant = `Статьи по теме «${tag}»: ${titles.slice(0, 3).join(", ")}. Практические советы и расчёты.`;
    if (inRange(titlesVariant)) return titlesVariant;
  }

  const countVariant = `Статьи на тему «${tag}»: ${count} ${word} с расчётами материалов, рекомендациями по выбору и пошаговыми инструкциями. Считайте материалы в калькуляторах Мастерка.`;
  if (inRange(countVariant)) return countVariant;

  const fallbackTag = trimTagName(tag, FALLBACK_TAG_LIMIT);
  return `Статьи по теме «${fallbackTag}»: ${count} ${word} с расчётами материалов и пошаговыми инструкциями. Считайте материалы в калькуляторах Мастерка.`;
}

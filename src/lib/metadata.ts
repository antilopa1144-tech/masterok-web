import type { Metadata } from "next";
import { SITE_NAME, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_URL, SITE_OG_IMAGE_WIDTH } from "@/lib/site";

type PageMetadataType = "website" | "article";

interface BuildPageMetadataOptions {
  title: string;
  description: string;
  url: string;
  type?: PageMetadataType;
  openGraphTitle?: string;
  twitterTitle?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  /** Optional per-page OG image URL that overrides the site default */
  image?: string;
}

/**
 * Снимает суффикс «| Мастерок», «— Мастерок», « Мастерок» с конца title.
 * Нужен потому что редакторы Ghost и авторы калькуляторов часто включают
 * «| Мастерок» в meta_title, а суффикс добавляется кодом — без strip получался
 * дубликат «… | Мастерок | Мастерок».
 */
function stripSiteSuffix(title: string): string {
  const patterns = [
    new RegExp(`\\s*[|\\-—–]\\s*${SITE_NAME}\\s*$`, "i"),
    new RegExp(`\\s+${SITE_NAME}\\s*$`, "i"),
  ];
  for (const re of patterns) {
    if (re.test(title)) return title.replace(re, "").trim();
  }
  return title;
}

/**
 * Предел длины title в выдаче: примерно 60 символов (≈580 px в Google).
 * Длиннее — обрезается многоточием, и часть смысла теряется.
 */
export const TITLE_MAX_LENGTH = 60;

/**
 * Добавляет суффикс бренда, только если заголовок остаётся в пределах выдачи.
 *
 * Раньше суффикс дописывался шаблоном корневого layout ко всем страницам
 * безусловно, из-за чего 30 заголовков из 148 выходили за 60 символов —
 * все они без суффикса укладываются в 50–59. Решение должно приниматься там,
 * где известна полная длина, поэтому шаблон убран, а суффикс ставится здесь.
 */
export function withSiteSuffix(title: string): string {
  const base = stripSiteSuffix(title);
  const withSuffix = `${base} — ${SITE_NAME}`;
  return withSuffix.length <= TITLE_MAX_LENGTH ? withSuffix : base;
}

export function buildPageMetadata({
  title,
  description,
  url,
  type = "website",
  openGraphTitle,
  twitterTitle,
  publishedTime,
  modifiedTime,
  tags,
  image,
}: BuildPageMetadataOptions): Metadata {
  const cleanTitle = withSiteSuffix(title);
  const cleanOgTitle = withSiteSuffix(openGraphTitle ?? title);
  const cleanTwitterTitle = withSiteSuffix(twitterTitle ?? title);
  const ogImage = image
    ? { url: image, width: 1200, height: 630 }
    : { url: SITE_OG_IMAGE_URL, width: SITE_OG_IMAGE_WIDTH, height: SITE_OG_IMAGE_HEIGHT };
  const twitterImage = image ?? SITE_OG_IMAGE_URL;

  return {
    // absolute, а не строка: заголовок уже содержит суффикс бренда, если он
    // влез в лимит, и не должен проходить через шаблон повторно.
    title: { absolute: cleanTitle },
    description,
    // Единственное место, где robots задаётся для обычных страниц. Раньше это
    // дублировалось в корневом layout, из-за чего страницы без собственных
    // метаданных (not-found) получали ДВА тега robots: унаследованный
    // index/follow рядом со своим noindex.
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
      googleBot: { index: true, follow: true, "max-image-preview": "large" as const },
    },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: cleanOgTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ru_RU",
      type,
      images: [ogImage],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(tags?.length ? { tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: cleanTwitterTitle,
      description,
      images: [twitterImage],
    },
  };
}

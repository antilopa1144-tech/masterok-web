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
  tags?: string[];
  /** Optional per-page OG image URL that overrides the site default */
  image?: string;
}

/**
 * Снимает суффикс «| Мастерок», «— Мастерок», « Мастерок» с конца title.
 * Нужен потому что:
 *   1) корневой layout добавляет суффикс через title.template ("%s | Мастерок"),
 *   2) редакторы Ghost / авторы калькуляторов часто включают «| Мастерок» в meta_title.
 * Без strip получается дубликат «… | Мастерок | Мастерок» — Google помечает страницу
 * как низкокачественную и оставляет в Discovered – not indexed.
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

export function buildPageMetadata({
  title,
  description,
  url,
  type = "website",
  openGraphTitle,
  twitterTitle,
  publishedTime,
  tags,
  image,
}: BuildPageMetadataOptions): Metadata {
  const cleanTitle = stripSiteSuffix(title);
  const cleanOgTitle = stripSiteSuffix(openGraphTitle ?? title);
  const cleanTwitterTitle = stripSiteSuffix(twitterTitle ?? title);
  const ogImage = image
    ? { url: image, width: 1200, height: 630 }
    : { url: SITE_OG_IMAGE_URL, width: SITE_OG_IMAGE_WIDTH, height: SITE_OG_IMAGE_HEIGHT };
  const twitterImage = image ?? SITE_OG_IMAGE_URL;

  return {
    title: cleanTitle,
    description,
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

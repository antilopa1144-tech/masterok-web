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
  const ogImage = image
    ? { url: image, width: 1200, height: 630 }
    : { url: SITE_OG_IMAGE_URL, width: SITE_OG_IMAGE_WIDTH, height: SITE_OG_IMAGE_HEIGHT };
  const twitterImage = image ?? SITE_OG_IMAGE_URL;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: openGraphTitle ?? title,
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
      title: twitterTitle ?? title,
      description,
      images: [twitterImage],
    },
  };
}

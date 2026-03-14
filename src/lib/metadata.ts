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
}: BuildPageMetadataOptions): Metadata {
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
      images: [{ url: SITE_OG_IMAGE_URL, width: SITE_OG_IMAGE_WIDTH, height: SITE_OG_IMAGE_HEIGHT }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(tags?.length ? { tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle ?? title,
      description,
      images: [SITE_OG_IMAGE_URL],
    },
  };
}

import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Конвертер единиц измерения | ${SITE_NAME}`,
  description: "Пересчитайте строительные единицы: длину, площадь, объём, массу, давление и температуру.",
  url: `${SITE_URL}/instrumenty/konverter/`,
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: META.url,
});

export default function KonverterLayout({ children }: { children: React.ReactNode }) {
  return children;
}



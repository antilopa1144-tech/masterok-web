import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Калькулятор онлайн | ${SITE_NAME}`,
  description: "Быстрые вычисления прямо на сайте. Поддерживает клавиатуру и историю последних операций.",
  url: `${SITE_URL}/instrumenty/kalkulyator/`,
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: META.url,
});

export default function KalkulyatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}



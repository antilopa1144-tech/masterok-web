import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

const META = {
  title: `Калькулятор площади комнаты | ${SITE_NAME}`,
  description: "Рассчитайте площадь пола, периметр и площадь стен для помещений любой формы.",
  url: `${SITE_URL}/instrumenty/ploshchad-komnaty/`,
} as const;

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: META.url,
});

export default function RoomAreaLayout({ children }: { children: React.ReactNode }) {
  return children;
}



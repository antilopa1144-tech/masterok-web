import type { Metadata } from "next";

export const MISSING_POST_METADATA: Metadata = {
  title: { absolute: "Статья не найдена | Мастерок" },
  description: "Запрошенная статья не найдена. Перейдите в блог Мастерка или откройте каталог строительных калькуляторов.",
  robots: { index: false, follow: true },
};

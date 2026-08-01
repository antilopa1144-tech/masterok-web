import type { Metadata } from "next";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import WallSlatPlanner from "./WallSlatPlanner";

const description = "Рассчитайте количество и погонные метры декоративных реек на стену, получите равные края, точный шаг, схему раскладки и рейки к покупке.";
export const metadata: Metadata = buildToolPageMetadata("raskladka-reek", { description });
export default function Page() { return <VisualToolPageShell slug="raskladka-reek" breadcrumb="Раскладка реек" title="Калькулятор реек на стену с визуальной раскладкой" description={description} accentClass="from-amber-50"><WallSlatPlanner /></VisualToolPageShell>; }

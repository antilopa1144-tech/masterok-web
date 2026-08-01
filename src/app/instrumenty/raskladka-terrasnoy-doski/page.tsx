import type { Metadata } from "next";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import DeckLayoutPlanner from "./DeckLayoutPlanner";

const description = "Бесплатно постройте схему раскладки террасной доски: сравните направление, ряды и стыки, получите карту раскроя, количество досок и запас к покупке.";
export const metadata: Metadata = buildToolPageMetadata("raskladka-terrasnoy-doski", { description });
export default function Page() { return <VisualToolPageShell slug="raskladka-terrasnoy-doski" breadcrumb="Раскладка террасной доски" title="Раскладка террасной доски онлайн — схема настила и раскроя" description={description} accentClass="from-emerald-50"><DeckLayoutPlanner /></VisualToolPageShell>; }

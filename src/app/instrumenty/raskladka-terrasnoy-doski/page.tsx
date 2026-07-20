import type { Metadata } from "next";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import DeckLayoutPlanner from "./DeckLayoutPlanner";

const description = "Визуальная раскладка террасной доски по размерам настила: направление, ряды, стыки, подрезка, повторное использование обрезков и доски к покупке.";
export const metadata: Metadata = buildToolPageMetadata("raskladka-terrasnoy-doski", { description });
export default function Page() { return <VisualToolPageShell slug="raskladka-terrasnoy-doski" breadcrumb="Раскладка террасной доски" title="Раскладка террасной доски" description={description} accentClass="from-emerald-50"><DeckLayoutPlanner /></VisualToolPageShell>; }

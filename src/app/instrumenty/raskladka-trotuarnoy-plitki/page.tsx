import type { Metadata } from "next";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import PaverLayoutPlanner from "./PaverLayoutPlanner";

const description = "Визуальная раскладка тротуарной плитки и брусчатки: прямая схема, смещение рядов, швы, подрезка, запас и количество к покупке.";
export const metadata: Metadata = buildToolPageMetadata("raskladka-trotuarnoy-plitki", { description });
export default function Page() { return <VisualToolPageShell slug="raskladka-trotuarnoy-plitki" breadcrumb="Раскладка тротуарной плитки" title="Раскладка тротуарной плитки" description={description} accentClass="from-rose-50"><PaverLayoutPlanner /></VisualToolPageShell>; }

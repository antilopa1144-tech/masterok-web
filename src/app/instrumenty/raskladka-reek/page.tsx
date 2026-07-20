import type { Metadata } from "next";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import WallSlatPlanner from "./WallSlatPlanner";

const description = "Визуальная раскладка декоративных реек на стене: равные края, точный шаг, количество, погонные метры и рейки к покупке.";
export const metadata: Metadata = buildToolPageMetadata("raskladka-reek", { description });
export default function Page() { return <VisualToolPageShell slug="raskladka-reek" breadcrumb="Раскладка реек" title="Раскладка декоративных реек" description={description} accentClass="from-amber-50"><WallSlatPlanner /></VisualToolPageShell>; }

import type { Metadata } from "next";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import LightingLayoutPlanner from "./LightingLayoutPlanner";

const description = "Равномерная схема точечных светильников по размерам потолка: ряды, отступы от стен, расстояния между центрами и готовый план разметки.";
export const metadata: Metadata = buildToolPageMetadata("rasstanovka-svetilnikov", { description });

export default function Page() {
  return <VisualToolPageShell slug="rasstanovka-svetilnikov" breadcrumb="Расстановка светильников" title="Схема точечных светильников" description={description} accentClass="from-sky-50"><LightingLayoutPlanner /></VisualToolPageShell>;
}

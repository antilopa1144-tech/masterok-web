import type { Metadata } from "next";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import LinearCutPlanner from "./LinearCutPlanner";

const description = "План линейного раскроя плинтуса, профиля, трубы, бруса и доски: список деталей, ширина пропила, карты реза и полезные остатки.";
export const metadata: Metadata = buildToolPageMetadata("lineynyy-raskroy", { description });
export default function Page() { return <VisualToolPageShell slug="lineynyy-raskroy" breadcrumb="Линейный раскрой" title="План линейного раскроя" description={description} accentClass="from-violet-50"><LinearCutPlanner /></VisualToolPageShell>; }

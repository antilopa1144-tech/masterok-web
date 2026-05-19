import type { Metadata } from "next";
import ToolPageExtras from "@/components/tools/ToolPageExtras";
import { buildToolPageMetadata } from "@/lib/tools/metadata";

export const metadata: Metadata = buildToolPageMetadata("konverter");

export default function KonverterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToolPageExtras slug="konverter" />
    </>
  );
}

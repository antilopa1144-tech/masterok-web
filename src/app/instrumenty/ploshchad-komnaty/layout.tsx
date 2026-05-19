import type { Metadata } from "next";
import ToolPageExtras from "@/components/tools/ToolPageExtras";
import { buildToolPageMetadata } from "@/lib/tools/metadata";

export const metadata: Metadata = buildToolPageMetadata("ploshchad-komnaty");

export default function PloshchadKomnatyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToolPageExtras slug="ploshchad-komnaty" />
    </>
  );
}

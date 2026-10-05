"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The editor has its own compact header; other pages keep their existing chrome. */
export default function SiteChrome({ children, header, footer, overlays }: {
  children: ReactNode; header: ReactNode; footer: ReactNode; overlays: ReactNode;
}) {
  const pathname = usePathname();
  const editor = pathname === "/konstruktor/redaktor" || pathname.startsWith("/konstruktor/redaktor/");
  return <>{!editor && header}{children}{!editor && footer}{!editor && overlays}</>;
}

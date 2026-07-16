"use client";

import type { ReactNode } from "react";
import { trackRuStoreClick } from "@/lib/analytics";

interface Props {
  href: string;
  placement: string;
  className?: string;
  children: ReactNode;
}

export default function TrackedRuStoreLink({ href, placement, className, children }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackRuStoreClick(placement)}
    >
      {children}
    </a>
  );
}

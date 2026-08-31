"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import {
  trackToolCatalogSelect,
  type ToolCatalogPlacement,
} from "@/lib/analytics";

type Props = ComponentProps<typeof Link> & {
  analyticsTarget: string;
  analyticsPlacement: ToolCatalogPlacement;
};

export default function TrackedCatalogLink({
  analyticsTarget,
  analyticsPlacement,
  onClick,
  ...props
}: Props) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackToolCatalogSelect(analyticsTarget, analyticsPlacement);
        onClick?.(event);
      }}
    />
  );
}

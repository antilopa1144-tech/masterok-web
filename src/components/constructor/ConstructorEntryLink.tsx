"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackEvent } from "@/lib/analytics";
import type { ConstructorScenario } from "@/lib/constructor/entry";

export default function ConstructorEntryLink({ placement, scenario = "continue", ...props }: Omit<ComponentProps<typeof Link>, "onClick"> & {
  placement: "home_primary" | "home_preview" | "home_example";
  scenario?: ConstructorScenario | "continue";
}) {
  return <Link {...props} onClick={() => trackEvent("constructor_entry", { placement, scenario })} />;
}

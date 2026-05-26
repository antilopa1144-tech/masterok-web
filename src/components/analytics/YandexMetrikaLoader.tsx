"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const YandexMetrika = dynamic(() => import("./YandexMetrika"), { ssr: false });

/** SPA-хиты Metrika — отдельный чанк, не в критическом layout.js. */
export default function YandexMetrikaLoader() {
  return (
    <Suspense fallback={null}>
      <YandexMetrika />
    </Suspense>
  );
}

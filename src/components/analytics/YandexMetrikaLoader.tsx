"use client";

import dynamic from "next/dynamic";
import Script from "next/script";
import { Suspense, useSyncExternalStore } from "react";
import { GOOGLE_ANALYTICS_ID } from "@/lib/analytics/config";
import { isProductionAnalyticsBrowser } from "@/lib/analytics/runtime";

const YandexMetrika = dynamic(() => import("./YandexMetrika"), { ssr: false });
const subscribe = () => () => {};
const serverSnapshot = () => false;

/** SPA-хиты Metrika — отдельный чанк, не в критическом layout.js. */
export default function YandexMetrikaLoader({ nonce }: { nonce?: string }) {
  const enabled = useSyncExternalStore(subscribe, isProductionAnalyticsBrowser, serverSnapshot);
  if (!enabled) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Suspense fallback={null}>
        <YandexMetrika />
      </Suspense>
    </>
  );
}

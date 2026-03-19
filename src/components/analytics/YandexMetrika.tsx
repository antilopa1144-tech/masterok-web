"use client";

/* eslint-disable @next/next/no-img-element -- noscript tracking pixel must stay a plain img */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const YM_COUNTER = process.env.NEXT_PUBLIC_YM_COUNTER || "108155444";

declare global {
  interface Window {
    ym?: (id: number, action: string, url?: string) => void;
  }
}

/** Компонент отправляет хит при смене страницы (SPA-навигация) */
function YandexMetrikaHit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!YM_COUNTER) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    window.ym?.(Number(YM_COUNTER), "hit", url);
  }, [pathname, searchParams]);

  return null;
}

export default function YandexMetrika() {
  if (!YM_COUNTER) return null;

  return (
    <>
      <Script
        id="yandex-metrika"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
            ym(${YM_COUNTER},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,ssr:true,ecommerce:"dataLayer"});
          `,
        }}
      />
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${YM_COUNTER}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      </noscript>
      <YandexMetrikaHit />
    </>
  );
}

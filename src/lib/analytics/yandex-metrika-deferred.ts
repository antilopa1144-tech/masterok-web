/**
 * Отложенная загрузка tag.js для Yandex.Metrika.
 *
 * Важно для Lighthouse/PageSpeed:
 * - не грузить на "scroll" — PSI/Lighthouse скроллят страницу и тянут 85 KB JS в TBT;
 * - очередь ym() создаётся сразу, tag.js — после idle или явного взаимодействия.
 */
export function getYandexMetrikaDeferredInitScript(counterId: string): string {
  return `(() => {
  const id = ${counterId};
  const src = "https://mc.yandex.ru/metrika/tag.js";
  const w = window;
  const d = document;

  w.ym = w.ym || function(){(w.ym.a = w.ym.a || []).push(arguments)};
  w.ym.l = 1 * new Date();
  w.ym(id, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true});

  let loaded = false;
  const load = () => {
    if (loaded || d.querySelector('script[src="' + src + '"]')) return;
    loaded = true;
    const script = d.createElement("script");
    script.async = true;
    script.src = src;
    (d.head || d.body).appendChild(script);
  };

  const scheduleIdleLoad = () => {
    if ("requestIdleCallback" in w) {
      w.requestIdleCallback(load, { timeout: 12000 });
    } else {
      w.setTimeout(load, 12000);
    }
  };

  if (d.readyState === "complete") {
    scheduleIdleLoad();
  } else {
    w.addEventListener("load", scheduleIdleLoad, { once: true });
  }

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    w.addEventListener(eventName, load, { once: true, passive: true });
  });
})();`;
}
